var Changes = require('./changes'),
  format = require('util').format,
  moment = require('moment-timezone'),
  Promise = require('bluebird'),
  rollbar = require('rollbar'),
  sails = require('sails'),
  truncate = require('html-truncate');

require('colors');
rollbar.init(process.env.ROLLBAR_SERVER_TOKEN);

var Digest = function(community, startTime, endTime) {
  this.community = community;
  this.communityName = community.get('name');
  this.startTime = startTime;
  this.endTime = endTime;

  sails.log.debug(format("%s: Generating digest for %s to %s",
    this.communityName,
    startTime.format('MMM DD YYYY ZZ'),
    endTime.format('MMM DD YYYY ZZ')));
};

Digest.prototype.fetchData = function(done) {

  var startTime = this.startTime,
    endTime = this.endTime,
    self = this;

  return Promise.join(
    // new members
    User.createdInTimeRange(this.community.users(), startTime, endTime)
    .fetch({withRelated: ['skills']}),

    // new seeds
    Post.createdInTimeRange(this.community.posts(), startTime, endTime)
    .fetch({withRelated: [
      {creator: function(qb) {
        qb.column('id', 'name', 'avatar_url');
      }}
    ]}),

    // new comments
    Comment.createdInTimeRange(this.community.comments(), startTime, endTime)
    .fetchAll({withRelated: [
      {user: function(qb) {
        qb.column('id', 'name', 'avatar_url');
      }}
    ]})
  )
  .spread(function(users, seeds, comments) {
    sails.log.debug(format('%s: %s users, %s seeds, %s comments',
      self.communityName, users.length, seeds.length, comments.length));

    self.users = (users.length > 0 ? users : null);
    self.seeds = (seeds.length > 0 ? seeds : null);
    return (comments.length > 0 ? comments : null);
  })
  .then(function(comments) {
    if (!comments) return;
    var seedIds = comments.map(function(c) { return c.get('post_id') });

    return Promise.join(
      comments,
      Post.query(function(qb) {
        qb.whereIn('id', seedIds);
      }).fetchAll({withRelated: [
        {creator: function(qb) {
          qb.column('id', 'name', 'avatar_url');
        }}
      ]})
    );
  })
  .spread(function(comments, commentedSeeds) {
    if (!comments) return self;

    self.commentedSeeds = commentedSeeds;

    // group comments by parent seed
    commentedSeeds.each(function(seed) {
      seed.comments = comments.filter(function(c) { return c.get('post_id') == seed.id });
      seed.comments.comparator = function(c) { return c.id };
      seed.comments.sort();
    });

    return self;
  })
  .catch(function(err) {
    sails.log.error(format('%s: %s', self.communityName, err.message).red);
    rollbar.handleError(err);
  });

};

Digest.prototype.subject = function() {

  var names = [];
  if (this.seeds) {
    names = names.concat(this.seeds.map(function(seed) {
      return seed.relations.creator.get('name');
    }));
  }
  if (this.commentedSeeds) {
    this.commentedSeeds.each(function(seed) {
      names = names.concat(seed.comments.map(function(comment) {
        return comment.relations.user.get('name');
      }));
    });
  }
  names = _.shuffle(_.uniq(names));

  var summary;
  if (names.length > 3) {
    summary = format('New activity from %s, %s, and %s others', names[0], names[1], names.length - 2);
  } else if (names.length == 3) {
    summary = format('New activity from %s, %s, and 1 other', names[0], names[1]);
  } else if (names.length == 2) {
    summary = format('New activity from %s and %s', names[0], names[1]);
  } else if (names.length == 1) {
    summary = format('New activity from %s', names[0]);
  } else {
    summary = 'New members';
  }

  return format("%s: %s", this.communityName, summary);
};

var userAttributes = function(user) {
  return _.chain(user.attributes)
    .pick('avatar_url', 'name')
    .merge({
      url: Frontend.Route.profile(user),
    })
    .value();
};

var formatOldText = function(text) {
  // add <p> tags to old text
  if (text.substring(0, 3) != '<p>') return format('<p>%s</p>', text);
  return text;
};

Digest.prototype.seedAttributes = function(seed) {
  return {
    id:          seed.id,
    creator:     userAttributes(seed.relations.creator),
    name:        seed.get('name'),
    short_name:  truncate(seed.get('name'), 60),
    description: truncate(formatOldText(seed.get('description')), 200),
    url:         Frontend.Route.seed(seed, this.community)
  };
};

Digest.prototype.recipients = function() {
  return this.community.users().query({where: {daily_digest: true}});
};

Digest.prototype.emailData = function(user) {
  var self = this;

  // FIXME is something here not thread-safe?!
  if (!this.nonUserSpecificData) {
    this.nonUserSpecificData = {
      data: {
        members: (this.users ? this.users.map(function(user) {
          return _.merge(userAttributes(user), {
            skills: Skill.simpleList(user.relations.skills)
          });
        }) : null),

        commented_seeds: (this.commentedSeeds ? this.commentedSeeds.map(function(seed) {
          var attrs = _.merge(self.seedAttributes(seed), {
            comments: seed.comments.map(function(comment) {
              return {
                text: truncate(formatOldText(comment.get('comment_text')), 140),
                user: userAttributes(comment.relations.user)
              };
            })
          });

          attrs.uniq_comments = _.uniq(attrs.comments, function(comment) {
            return comment.user.name;
          });

          return attrs;
        }) : null),

        seeds: (this.seeds ? this.seeds.map(this.seedAttributes.bind(this)) : null),
        community_name: this.communityName,
        community_url: Frontend.Route.community(this.community),
        community_avatar_url: this.community.get('avatar_url'),
        digest_title: this.subject(),
        settings_url: Frontend.Route.userSettings()
      }
    };
  }

  var userData = _.cloneDeep(this.nonUserSpecificData);

  _.extend(userData, {
    email: user.get('email')
  });

  _.each(userData.data.commented_seeds || [], function(seedAttrs) {
    seedAttrs.reply_url = Email.seedReplyAddress(seedAttrs.id, user.id);
  });

  _.each(userData.data.seeds || [], function(seedAttrs) {
    seedAttrs.reply_url = Email.seedReplyAddress(seedAttrs.id, user.id);
  });

  return userData;
};

Digest.prototype.queueEmails = function() {
  var self = this;

  return this.recipients().fetch().then(function(users) {
    sails.log.debug(format('%s: Queueing emails for %s recipients', self.communityName, users.length));
    var queue = require('kue').createQueue();

    return Promise.map(users.models, function(user) {
      return Digest.queueEmail(queue, self.emailData(user));
    })
    .then(function(enqueued) {
      sails.log.debug(format('%s: Finished queueing', self.communityName));
      return enqueued.length;
    })
  });
};

Digest.prototype.sendTestEmail = function(recipient) {
  var fakeUser = {id: 11, get: function() { return recipient }};
  return Email.sendCommunityDigest(this.emailData(fakeUser));
};

Digest.queueEmail = function(queue, emailData) {
  var job = queue.create('Email.sendCommunityDigest', {emailData: emailData})
  .delay(5000) // because the job is queued while an object it depends upon hasn't been saved yet
  .attempts(3)
  .backoff({delay: 5000, type: 'exponential'});

  return Promise.promisify(job.save, job)();
};

Digest.sendDaily = function() {
  var today = moment.tz('America/Los_Angeles').startOf('day'),
    yesterday = today.clone().subtract(1, 'day');

  return Changes.changedCommunities(yesterday, today).then(function(communityIds) {
    return Community.query(function(qb) {
      qb.whereIn('id', communityIds);
      qb.where('daily_digest', true);
    }).fetchAll();
  }).then(function(communities) {
    return Promise.map(communities.models, function(community) {
      var dg = new Digest(community, yesterday, today);
      return dg.fetchData().then(dg.queueEmails.bind(dg));
    });
  });
};

module.exports = Digest;

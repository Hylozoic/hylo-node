var Changes = require('./changes'),
  moment = require('moment-timezone'),
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

Digest.prototype.fetchData = function() {

  var startTime = this.startTime,
    endTime = this.endTime,
    self = this;

  return Promise.join(
    // new members
    User.createdInTimeRange(this.community.users(), startTime, endTime)
    .fetch({withRelated: ['skills']}),

    // new posts
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
  .spread(function(users, posts, comments) {
    sails.log.debug(format('%s: %s users, %s posts, %s comments',
      self.communityName, users.length, posts.length, comments.length));

    self.users = (users.length > 0 ? users : null);
    self.posts = (posts.length > 0 ? posts : null);
    return (comments.length > 0 ? comments : null);
  })
  .then(function(comments) {
    if (!comments) return [];
    var postIds = comments.map(function(c) { return c.get('post_id') });

    return Promise.join(
      comments,
      Post.query(function(qb) {
        qb.whereIn('id', postIds);
      }).fetchAll({withRelated: [
        {creator: function(qb) {
          qb.column('id', 'name', 'avatar_url');
        }}
      ]})
    );
  })
  .spread(function(comments, commentedPosts) {
    if (!comments) return self;

    self.commentedPosts = commentedPosts;

    // group comments by parent post
    commentedPosts.each(function(post) {
      post.comments = comments.filter(function(c) { return c.get('post_id') == post.id });
      post.comments.comparator = function(a, b) { return a.id - b.id };
      post.comments.sort();
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
  if (this.posts) {
    names = names.concat(this.posts.map(function(post) {
      return post.relations.creator.get('name');
    }));
  }
  if (this.commentedPosts) {
    this.commentedPosts.each(function(post) {
      names = names.concat(post.comments.map(function(comment) {
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
      url: Frontend.Route.profile(user) + '?ctt=digest_email',
    })
    .value();
};

var renderText = function(text, maxlength) {
  // add <p> tags to old text
  if (text.substring(0, 3) != '<p>')
    text = format('<p>%s</p>', text);

  if (text.match(/data-user-id/))
    text = RichText.qualifyLinks(text);

  return truncate(text, maxlength);
};

Digest.prototype.postAttributes = function(post) {
  return {
    id:          post.id,
    creator:     userAttributes(post.relations.creator),
    name:        post.get('name'),
    short_name:  truncate(post.get('name'), 60),
    description: renderText(post.get('description'), 300),
    url:         Frontend.Route.post(post, this.community) + '?ctt=digest_email'
  };
};

Digest.prototype.recipients = function() {
  return this.community.users().query({where: {daily_digest: true}});
};

Digest.prototype.emailData = function(user) {
  var self = this;

  if (!this.nonUserSpecificData) {
    this.nonUserSpecificData = {
      data: {
        members: (this.users ? this.users.map(function(user) {
          return _.merge(userAttributes(user), {
            skills: Skill.simpleList(user.relations.skills)
          });
        }) : null),

        commented_seeds: (this.commentedPosts ? this.commentedPosts.map(function(post) {
          var attrs = _.merge(self.postAttributes(post), {
            comments: post.comments.map(function(comment) {
              return {
                text: renderText(comment.get('comment_text'), 140),
                user: userAttributes(comment.relations.user)
              };
            })
          });

          attrs.uniq_comments = _.uniq(attrs.comments, function(comment) {
            return comment.user.name;
          });

          return attrs;
        }) : null),

        seeds: (this.posts ? this.posts.map(this.postAttributes.bind(this)) : null),
        community_name: this.communityName,
        community_url: Frontend.Route.community(this.community) + '?ctt=digest_email',
        community_avatar_url: this.community.get('avatar_url'),
        digest_title: this.subject(),
        settings_url: Frontend.Route.userSettings(),
        tracking_pixel_url: Analytics.pixelUrl('Digest', {userId: user.id, community: this.communityName})
      }
    };
  }

  var userData = _.cloneDeep(this.nonUserSpecificData);

  _.extend(userData, {
    email: user.get('email')
  });

  _.each(userData.data.commented_seeds || [], function(postAttrs) {
    postAttrs.reply_url = Email.postReplyAddress(postAttrs.id, user.id);
  });

  _.each(userData.data.seeds || [], function(postAttrs) {
    postAttrs.reply_url = Email.postReplyAddress(postAttrs.id, user.id);
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
  return Queue.addJob('Email.sendCommunityDigest', {emailData: emailData});
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

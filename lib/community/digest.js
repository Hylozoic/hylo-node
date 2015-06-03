var Promise = require('bluebird'),
  Changes = require('./changes'),
  moment = require('moment-timezone'),
  rollbar = require('rollbar'),
  sails = require('sails'),
  truncate = require('html-truncate');

require('colors');
rollbar.init(process.env.ROLLBAR_SERVER_TOKEN);

var Digest = function(community, startTime, endTime, debug) {
  this.community = community;
  this.communityName = community.get('name');
  this.startTime = startTime;
  this.endTime = endTime;
  this.debug = debug;

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
      {creator: qb => qb.column('id', 'name', 'avatar_url')},
      'projects', 'projects.user'
    ]}),

    // new comments
    Comment.createdInTimeRange(this.community.comments(), startTime, endTime)
    .fetchAll({withRelated: [
      {user: qb => qb.column('id', 'name', 'avatar_url')}
    ]})
  )
  .spread((users, posts, comments) => {
    // here we use the plain arrays instead of Bookshelf collections
    // so that we can use Lodash methods
    self.users = users.models;
    self.posts = posts.models;
    return comments.models;
  })
  .tap(comments => { // find posts related to new comments
    if (_.isEmpty(comments)) {
      self.commentedPosts = [];
      return;
    }

    var postIds = _.map(comments, c => c.get('post_id'));

    return Post.query(qb => qb.whereIn('id', postIds))
    .fetchAll({withRelated: [
      {creator: qb => qb.column('id', 'name', 'avatar_url')}
    ]})
    .then(commentedPosts => {
      self.commentedPosts = commentedPosts.models;

      // group comments by parent post
      commentedPosts.forEach(post => {
        post.comments = _.sortBy(
          _.filter(comments, c => c.get('post_id') == post.id),
          c => c.id
        );
      });
    });
  })
  .tap(() => { // filter out posts in projects
    if (_.isEmpty(self.posts)) {
      self.updatedProjects = [];
      return;
    }

    self.projectPosts = _.remove(self.posts, post => post.relations.projects.length > 0);

    self.updatedProjects = _.reduce(self.projectPosts, (projects, post) => {
      var project = post.relations.projects.first(),
        projectInList = _.find(projects, p => p.id === project.id);

      if (!projectInList) {
        projects.push(project);
        projectInList = project;
        projectInList.posts = [];
      }

      projectInList.posts.push(post);
      return projects;
    }, []);

    self.updatedProjects.forEach(project => {
      project.posts = _.sortBy(project.posts, p => p.id);
    });
  })
  .tap(() => {
    sails.log.debug(format('%s: %s users, %s new posts, %s commented posts, %s projects',
      self.communityName,
      (self.users || []).length,
      (self.posts || []).length,
      (self.commentedPosts || []).length,
      (self.updatedProjects || []).length
    ));
  })
  .catch(err => {
    sails.log.error(format('%s: %s', self.communityName, err.message).red);
    rollbar.handleError(err);
  });

};

Digest.prototype.subject = function() {

  var users = _.flatten(this.posts.map(p => p.relations.creator)
    .concat(this.commentedPosts.map(p => p.comments.map(c => c.relations.user)))
    .concat(this.updatedProjects.map(pr => pr.posts.map(p => p.relations.creator))));

  var names = _.chain(users.map(u => u.get('name'))).uniq().shuffle().value();

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

  return format("%s: %s %s",
    this.communityName, summary,
    (this.debug ? require('crypto').randomBytes(2).toString('hex') : '')
  );
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

Digest.prototype.postAttributes = post => {
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

  // generate the data that doesn't change from user to user once & cache it
  if (!this.nonUserSpecificData) {
    this.nonUserSpecificData = {
      data: {
        members: this.users.map(user => {
          return _.merge(userAttributes(user), {
            skills: Skill.simpleList(user.relations.skills)
          });
        }),

        commented_posts: this.commentedPosts.map(post => {
          var attrs = _.merge(self.postAttributes(post), {
            comments: post.comments.map(comment => ({
              text: renderText(comment.get('comment_text'), 140),
              user: userAttributes(comment.relations.user)
            }))
          });

          attrs.uniq_comments = _.uniq(attrs.comments, c => c.user.name);
          return attrs;
        }),

        posts: this.posts.map(this.postAttributes.bind(this)),

        updated_projects: this.updatedProjects.map(project => ({
          title: project.get('title'),
          posts: project.posts.map(self.postAttributes.bind(self)),
          url: Frontend.Route.project(project),
          user: {
            name: project.relations.user.get('name')
          }
        })),

        community_name: this.communityName,
        community_url: Frontend.Route.community(this.community) + '?ctt=digest_email',
        community_avatar_url: this.community.get('avatar_url'),
        digest_title: this.subject(),
        settings_url: Frontend.Route.userSettings(),
        tracking_pixel_url: Analytics.pixelUrl('Digest', {userId: user.id, community: this.communityName})
      }
    };
  }

  // make a copy and add user-specific attributes
  var userData = _.extend(_.cloneDeep(this.nonUserSpecificData), {
    email: user.get('email')
  });

  var posts = userData.data.commented_posts
  .concat(userData.data.posts)
  .concat(_.flatten(userData.data.updated_projects.map(pr => pr.posts)));

  posts.forEach(post => {
    post.reply_url = Email.postReplyAddress(post.id, user.id);
  });

  return userData;
};

Digest.prototype.queueEmails = function() {
  var self = this;

  return this.recipients().fetch().then(function(users) {
    sails.log.debug(format('%s: Queueing emails for %s recipients', self.communityName, users.length));
    var queue = require('kue').createQueue();

    return Promise.map(users.models, user => Digest.queueEmail(queue, self.emailData(user)))
    .then(function(enqueued) {
      sails.log.debug(format('%s: Finished queueing', self.communityName));
      return enqueued.length;
    })
  });
};

Digest.prototype.sendTestEmail = function(recipient) {
  var fakeUser = {id: 11, get: () => recipient};
  return Email.sendCommunityDigest(this.emailData(fakeUser));
};

Digest.queueEmail = function(queue, emailData) {
  return Queue.classMethod('Email', 'sendCommunityDigest', emailData);
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

Digest.test = function(timeAmount, timeUnit) {
  var now = moment(), then = moment().subtract(timeAmount, timeUnit);
  return Community.find(9).then(community => {
    var digest = new Digest(community, then, now);
    return digest.fetchData().then(() => digest.sendTestEmail('foo@bar.com'));
  });
}

module.exports = Digest;

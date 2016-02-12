var Promise = require('bluebird')
var Changes = require('./changes')
var moment = require('moment-timezone')
var rollbar = require('rollbar')
var sails = require('sails')
var truncate = require('html-truncate')

require('colors')
rollbar.init(process.env.ROLLBAR_SERVER_TOKEN)

var Digest = function (community, startTime, endTime, frequencyType, debug) {
  this.community = community
  this.communityName = community.get('name')
  this.startTime = startTime
  this.endTime = endTime
  this.frequencyType = frequencyType
  this.debug = debug

  sails.log.debug(format('%s: Generating digest for %s to %s',
    this.communityName,
    startTime.format('MMM DD YYYY ZZ'),
    endTime.format('MMM DD YYYY ZZ')))
}

// Times in emails (e.g. event times) will be displayed in this time zone.
// This is a stopgap measure; ideally we would store the time zone for each
// recipient and use that.
Digest.defaultTimezone = 'America/Los_Angeles'

Digest.prototype.fetchData = function () {
  var startTime = this.startTime
  var endTime = this.endTime
  var self = this

  return Promise.join(
    // new members
    User.createdInTimeRange(this.community.users(), startTime, endTime)
      .fetch({withRelated: ['skills']}),

    // new posts
    Post.createdInTimeRange(this.community.posts(), startTime, endTime)
      .query(qb => qb.where('post.type', '!=', 'welcome'))
      .fetch({withRelated: [
        {creator: qb => qb.column('id', 'name', 'avatar_url')},
        'projects', 'projects.user'
      ]}),

    // new comments
    Comment.createdInTimeRange(this.community.comments(), startTime, endTime)
      .query(qb => {
        qb.join('post', function () {
          this.on('post.id', 'comment.post_id')
        })
        qb.where('post.type', '!=', 'welcome')
      })
      .fetchAll({withRelated: [
        {user: qb => qb.column('id', 'name', 'avatar_url')}
      ]})
  )
  .spread((users, posts, comments) => {
    // here we use the plain arrays instead of Bookshelf collections
    // so that we can use Lodash methods
    self.users = users.models
    self.posts = posts.models
    return comments.models
  })
  .tap(comments => { // find posts related to new comments
    if (_.isEmpty(comments)) {
      self.commentedPosts = []
      return
    }

    var postIds = _.map(comments, c => c.get('post_id'))

    return Post.query(qb => qb.whereIn('id', postIds))
      .fetchAll({withRelated: [
          {creator: qb => qb.column('id', 'name', 'avatar_url')}
      ]})
      .then(commentedPosts => {
        self.commentedPosts = commentedPosts.models

        // group comments by parent post
        commentedPosts.forEach(post => {
          post.comments = _.sortBy(
            _.filter(comments, c => c.get('post_id') === post.id),
            c => c.id
          )
        })
      })
  })
  .tap(() => { // filter out posts in projects
    if (_.isEmpty(self.posts)) {
      self.updatedProjects = []
      return
    }

    self.projectPosts = _.remove(self.posts, post => post.relations.projects.length > 0)

    self.updatedProjects = _.reduce(self.projectPosts, (projects, post) => {
      var project = post.relations.projects.first()
      var projectInList = _.find(projects, p => p.id === project.id)

      if (!projectInList) {
        projects.push(project)
        projectInList = project
        projectInList.posts = []
      }

      projectInList.posts.push(post)
      return projects
    }, [])

    self.updatedProjects.forEach(project => {
      project.posts = _.sortBy(project.posts, p => p.id)
    })
  })
  .tap(() => {
    sails.log.debug(format('%s: %s users, %s new posts, %s commented posts, %s projects',
      self.communityName,
      (self.users || []).length,
      (self.posts || []).length,
      (self.commentedPosts || []).length,
      (self.updatedProjects || []).length
    ))
  })
  .catch(err => {
    sails.log.error(format('%s: %s', self.communityName, err.message).red)
    rollbar.handleError(err)
  })
}

Digest.prototype.subject = function () {
  var users = _.flatten(this.posts.map(p => p.relations.creator)
  .concat(this.commentedPosts.map(p => p.comments.map(c => c.relations.user)))
  .concat(this.updatedProjects.map(pr => pr.posts.map(p => p.relations.creator))))

  var names = _.chain(users.map(u => u.get('name'))).uniq().shuffle().value()

  var summary
  if (names.length > 3) {
    summary = format('New activity from %s, %s, and %s others', names[0], names[1], names.length - 2)
  } else if (names.length === 3) {
    summary = format('New activity from %s, %s, and 1 other', names[0], names[1])
  } else if (names.length === 2) {
    summary = format('New activity from %s and %s', names[0], names[1])
  } else if (names.length === 1) {
    summary = format('New activity from %s', names[0])
  } else {
    summary = 'New members'
  }

  return format('%s: %s %s',
    this.communityName, summary,
    (this.debug ? require('crypto').randomBytes(2).toString('hex') : '')
  )
}

var userAttributes = function (user) {
  return _.chain(user.attributes)
    .pick('avatar_url', 'name')
    .merge({
      url: Frontend.Route.profile(user) + '?ctt=digest_email'
    })
    .value()
}

var renderText = function (text, recipient, token) {
  // add <p> tags to old text
  if (text.substring(0, 3) !== '<p>') {
    text = format('<p>%s</p>', text)
  }

  if (text.match(/data-user-id/)) {
    text = RichText.qualifyLinks(text, recipient, token)
  }

  return text
}

var sameDay = function (moment1, moment2) {
  return moment1.clone().startOf('day').toString() === moment2.clone().startOf('day').toString()
}

var formatTime = function (start, end, timezone) {
  if (!start) return ''

  var calendarOpts = {sameElse: 'dddd, MMM D, YYYY [at] h:mm A'}
  start = moment(start).tz(timezone)
  end = end && moment(end).tz(timezone)

  var startText = start.calendar(null, calendarOpts)
  if (!end) {
    return startText
  } else if (sameDay(start, end)) {
    startText = startText.replace(' at ', ' from ')
    var endText = end.format('h:mm A')
    return format('%s to %s', startText, endText)
  } else {
    return format('%s to %s', startText, end.calendar(null, calendarOpts))
  }
}

Digest.formatTime = formatTime // for testing

Digest.prototype.postAttributes = function (post) {
  return {
    id: post.id,
    creator: userAttributes(post.relations.creator),
    name: post.get('name'),
    short_name: truncate(post.get('name'), 60),
    description: truncate(post.get('description'), 300),
    url: Frontend.Route.post(post, this.community) + '?ctt=digest_email',
    location: post.get('location'),
    time: formatTime(post.get('start_time'), post.get('end_time'), Digest.defaultTimezone)
  }
}

Digest.prototype.recipients = function () {
  switch (this.frequencyType) {
    case 'daily':
      return this.community.users().query({whereRaw: "settings->>'digest_frequency' = 'daily'"})
    case 'weekly':
      return this.community.users().query({whereRaw: "settings->>'digest_frequency' = 'weekly'"})
  }
}

var personalizeUrl = function (user, token, obj, key) {
  obj[key] = Frontend.Route.tokenLogin(user, token, obj[key])
}

Digest.prototype.emailData = function (recipient, token) {
  var self = this

  // generate the data that doesn't change from user to user once & cache it
  if (!this.nonUserSpecificData) {
    this.nonUserSpecificData = {
      data: {
        members: this.users.map(user => {
          return _.merge(userAttributes(user), {
            skills: Skill.simpleList(user.relations.skills)
          })
        }),

        commented_posts: this.commentedPosts.map(post => {
          var attrs = _.merge(self.postAttributes(post), {
            comments: post.comments.map(comment => ({
              text: truncate(comment.get('comment_text'), 140),
              user: userAttributes(comment.relations.user)
            }))
          })

          attrs.uniq_comments = _.uniq(attrs.comments, c => c.user.name)
          return attrs
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
        tracking_pixel_url: Analytics.pixelUrl('Digest', {userId: recipient.id, community: this.communityName})
      }
    }
  }

  // make a copy and add user-specific attributes
  var userData = _.extend(_.cloneDeep(this.nonUserSpecificData), {
    email: recipient.get('email')
  })

  var posts = userData.data.commented_posts
    .concat(userData.data.posts)
    .concat(_.flatten(userData.data.updated_projects.map(pr => pr.posts)))

  posts.forEach(post => {
    post.reply_url = Email.postReplyAddress(post.id, recipient.id)
    post.description = renderText(post.description, recipient, token)

    personalizeUrl(recipient, token, post, 'url')
    personalizeUrl(recipient, token, post.creator, 'url')
    ;(post.comments || []).forEach(comment => {
      personalizeUrl(recipient, token, comment.user, 'url')
      comment.text = renderText(comment.text, recipient, token)
    })
  })

  userData.data.members.forEach(u => personalizeUrl(recipient, token, u, 'url'))
  userData.data.updated_projects.forEach(p => personalizeUrl(recipient, token, p, 'url'))
  personalizeUrl(recipient, token, userData.data, 'community_url')
  personalizeUrl(recipient, token, userData.data, 'settings_url')

  return userData
}

Digest.prototype.queueEmails = function () {
  var self = this

  return this.recipients().fetch().then(function (users) {
    sails.log.debug(format('%s: Queueing emails for %s recipients', self.communityName, users.length))
    var queue = require('kue').createQueue()

    return Promise.map(users.models, user =>
      user.generateToken().then(token =>
        Digest.queueEmail(queue, self.emailData(user, token))))
    .then(function (enqueued) {
      sails.log.debug(format('%s: Finished queueing', self.communityName))
      return enqueued.length
    })
  })
}

Digest.prototype.sendTestEmail = function (user) {
  var self = this
  // sigh -- http://stackoverflow.com/questions/28029523/es6-arrow-function-lexical-this-in-v8
  return user.generateToken()
  .then(token => Email.sendCommunityDigest(self.emailData(user, token)))
}

Digest.queueEmail = function (queue, emailData) {
  return Queue.classMethod('Email', 'sendCommunityDigest', emailData)
}

Digest.sendDaily = function () {
  var today = moment.tz('America/Los_Angeles').startOf('day').add(12, 'hours')
  var yesterday = today.clone().subtract(1, 'day')

  return Changes.changedCommunities(yesterday, today)
  .then(communityIds => {
    return Community.query(function (qb) {
      qb.whereIn('id', communityIds)
      qb.where('daily_digest', true)
    }).fetchAll()
  })
  .then(communities => {
    return Promise.each(communities.models, function (community) {
      var dg = new Digest(community, yesterday, today, 'daily')
      return dg.fetchData().then(dg.queueEmails.bind(dg))
    })
  })
}

Digest.sendWeekly = function () {
  var today = moment.tz('America/Los_Angeles').startOf('day').add(12, 'hours')
  var oneWeekAgo = today.clone().subtract(7, 'day')

  return Changes.changedCommunities(oneWeekAgo, today).then(function (communityIds) {
    return Community.query(function (qb) {
      qb.whereIn('id', communityIds)
      qb.where('daily_digest', true)
    }).fetchAll()
  }).then(function (communities) {
    return Promise.map(communities.models, function (community) {
      var dg = new Digest(community, oneWeekAgo, today, 'weekly')
      return dg.fetchData().then(dg.queueEmails.bind(dg))
    }, {concurrency: 1})
  })
}

Digest.test = function (communityId, timeAmount, timeUnit, userId) {
  var now = moment()
  var then = moment().subtract(timeAmount, timeUnit)
  return Community.find(communityId).then(community => {
    var digest = new Digest(community, then, now, 'daily')
    return digest.fetchData()
    .then(() => User.find(userId || 42))
    .then(user => digest.sendTestEmail(user))
  })
}

module.exports = Digest

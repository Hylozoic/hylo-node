module.exports = bookshelf.Model.extend({
  tableName: 'projects',

  user: function () {
    return this.belongsTo(User)
  },

  community: function () {
    return this.belongsTo(Community)
  },

  posts: function () {
    return this.belongsToMany(Post, 'posts_projects').query({where: {active: true}})
  },

  contributors: function () {
    return this.belongsToMany(User, 'projects_users')
      .query({where: {active: true}})
      .withPivot(['role'])
  },

  memberships: function () {
    return this.hasMany(ProjectMembership)
  },

  media: function () {
    return this.hasMany(Media)
  },

  isDraft: function () {
    return !this.get('published_at')
  },

  isPublic: function () {
    return this.get('visibility') === Project.Visibility.PUBLIC
  }

}, {
  Visibility: {
    COMMUNITY: 0,
    PUBLIC: 1
  },

  find: function (id_or_slug, options) {
    if (isNaN(Number(id_or_slug)) || String(id_or_slug).match(/a-z/)) {
      return Project.where({slug: id_or_slug}).fetch(options)
    }
    return Project.where({id: id_or_slug}).fetch(options)
    .catch(err => {
      if (err.message && err.message.includes('invalid input syntax for integer')) {
        return Project.where({slug: id_or_slug}).fetch(options)
      }
      throw err
    })
  },

  generateThumbnailUrl: Promise.method(function (videoUrl) {
    if (!videoUrl || videoUrl === '') return
    var videoId

    if (videoUrl.match(/youtu\.?be/)) {
      videoId = videoUrl.match(/(youtu.be\/|embed\/|\?v=)([A-Za-z0-9\-_]+)/)[2]
      return format('http://img.youtube.com/vi/%s/hqdefault.jpg', videoId)
    } else if (videoUrl.match(/vimeo/)) {
      var request = Promise.promisify(require('request'))
      videoId = videoUrl.match(/vimeo\.com\/(\d+)/)[1]
      return request(format('http://vimeo.com/api/v2/video/%s.json', videoId))
        .spread((response, body) => JSON.parse(body)[0].thumbnail_large)
    }
  }),

  isVisibleToUser: function (projectId, userId) {
    return Project.find(projectId).then(project => {
      if (project.get('user_id') === userId) return true

      return ProjectMembership.find(userId, projectId).then(pm => !!pm)
    })
  },

  notifyAboutNewPost: function (opts) {
    return Promise.join(
      Project.find(opts.projectId, {withRelated: [
        {contributors: qb => qb.where('notify_on_new_posts', true)},
        'user'
      ]}),
      Post.find(opts.postId, {withRelated: ['communities', 'user']})
    ).spread((project, post) => {
      var user = post.relations.user
      var community = post.relations.communities.first()
      var contributors = project.relations.contributors

      return contributors.models.concat(project.relations.user).map(recipient => {
        if (_.includes(opts.exclude, recipient.id) || recipient.id === user.id) return
        var replyTo = Email.postReplyAddress(post.id, recipient.id)

        return recipient.generateToken()
        .then(token => Email.sendNewProjectPostNotification(recipient.get('email'), {
          post_user_profile_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.profile(user) + '?ctt=project_post_email'),
          post_user_avatar_url: user.get('avatar_url'),
          post_user_name: user.get('name'),
          project_title: project.get('title'),
          project_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.project(project) + '?ctt=project_post_email'),
          project_settings_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.projectSettings(project) + '?ctt=project_post_email'),
          post_title: post.get('name'),
          post_description: post.get('description'),
          post_type: post.get('type'),
          post_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.post(post) + '?ctt=project_post_email')
        }, {
          sender: {address: replyTo, reply_to: replyTo}
        }))
      })
    })
  }

})

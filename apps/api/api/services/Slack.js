var format = require('util').format
var Promise = require('bluebird')
var request = require('request')
var post = Promise.promisify(request.post)

module.exports = {
  textForNewPost: function (post, group) {
    var relatedUser
    const creator = post.relations.user
    if (post.isWelcome()) {
      relatedUser = post.relations.relatedUsers.first()
      return format('<%s|%s> joined <%s|%s>',
        Frontend.Route.profile(relatedUser), relatedUser.get('name'),
        Frontend.Route.group(group), group.get('name'))
    } else {
      return format('<%s|%s> posted <%s|%s> in <%s|%s>',
        Frontend.Route.profile(creator), creator.get('name'),
        Frontend.Route.post(post, group), post.summary(),
        Frontend.Route.group(group), group.get('name'))
    }
  },
  send: (message, uri) =>
    !process.env.DISABLE_SLACK_INTEGRATION && post({
      uri,
      body: {text: message},
      json: true // Automatically stringifies the body to JSON
    })
}

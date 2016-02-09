var format = require('util').format
var Promise = require('bluebird')
var request = require('request')
var post = Promise.promisify(request.post)

module.exports = {
  textForNewPost: function (post, community) {
    var relatedUser, creator = post.relations.creator

    if (post.isWelcome()) {
      relatedUser = post.relations.relatedUsers.first()
      return format('<%s|%s> joined <%s|%s>',
               Frontend.Route.profile(relatedUser), relatedUser.get('name'),
               Frontend.Route.community(community), community.get('name'))
    } else {
      return format('<%s|%s> posted <%s|"%s"> in <%s|%s>',
               Frontend.Route.profile(creator), creator.get('name'),
               Frontend.Route.post(post, community), post.get('name'),
               Frontend.Route.community(community), community.get('name'))
    }
  },
  send: function (message, url) {
    var options = {
      uri: url,
      body: {
        text: message,
        username: 'Hylobot',
        icon_url: 'https://cdn.rawgit.com/Connoropolous/hylo-image/master/hylo48.png'
      },
      json: true // Automatically stringifies the body to JSON
    };
    return post(options)
  }
}

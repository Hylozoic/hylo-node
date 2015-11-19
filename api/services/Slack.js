var requestPromise = require('request-promise')
var format = require('util').format

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
      method: 'POST',
      uri: url,
      body: {
        text: message,
        username: 'Hylobot',
        icon_url: 'https://d1qb2nb5cznatu.cloudfront.net/startups/i/46146-d8eff20488206f7c96e2c4ef2b0fb1f4-medium_jpg.jpg?buster=1410306509'
      },
      json: true // Automatically stringifies the body to JSON 
    };
    return requestPromise(options)
  }
}

var Promise = require('bluebird')
var rollbar = require('rollbar')
var sails = require('sails')

rollbar.init(process.env.ROLLBAR_SERVER_TOKEN)

var Solicitor = function (community, startTime, endTime, debug) {
  this.community = community
  this.communityName = community.get('name')
}

var mailtoLink = function (communityId, userId, type) {
  var address = Email.postCreationAddress(communityId, userId, Post.Type.OFFER)
  var subject
  var body = 'More details here...'

  switch (type) {
    case Post.Type.OFFER:
      subject = 'I\'d like to share [finish this sentence!]'
      break
    case Post.Type.REQUEST:
      subject = 'I\'m looking for [finish this sentence!]'
      break
    case Post.Type.INTENTION:
      subject = 'I\'d like to create [finish this sentence!]'
      break
  }
  return 'mailto:' + address + '?subject=' + subject + '&amp;body=' + body
}

var unsubscribeLink = function (user, community) {
  return 'http://google.com'
}

var emailData = function (user, community) {
  return {
    email: user.get('email'),
    sender: {
      name: format('%s (via Hylo)', community.get('name')),
      reply_to: 'hello@hylo.com'
    },
    data: {
      community_name: community.get('name'),
      user_name: user.get('name'),
      community_url: Frontend.Route.community(community) + '?ctt=solicitation_email',
      community_avatar_url: community.get('avatar_url'),
      unsubscribe_link: unsubscribeLink(user, community),
      mailto_offer: mailtoLink(community.id, user.id, Post.Type.OFFER),
      mailto_request: mailtoLink(community.id, user.id, Post.Type.REQUEST),
      mailto_intention: mailtoLink(community.id, user.id, Post.Type.INTENTION)
    }
  }
}

var queueEmail = function (emailData) {
  return Queue.classMethod('Email', 'sendPostSolicitation', emailData)
}

Solicitor.sendToUser = function (user, community) {
  return queueEmail(emailData(user, community))
}

Solicitor.sendToCommunity = function (communityId) {
  return Community.find(communityId, {withRelated: ['users']})
  .then(community => {
    sails.log.debug('Solicitor - sending emails to ', community.get('name'))
    return Promise.map(community.relations.users.models, user =>
      Solicitor.sendToUser(user, community))
  })
}

Solicitor.sendWeekly = function () {
  return Community.query('whereRaw', "settings->>'email_solicitation' = 'true'")
  .fetchAll()
  .then(communities => Promise.map(communities.models, community =>
      Solicitor.sendToCommunity(community.get('id'))))
}

module.exports = Solicitor

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

var emailData = function (user, community) {
  return {
    email: user.get('email'),
    data: {
      community_name: community.get('name'),
      user_name: user.get('name'),
      mailto_offer: mailtoLink(community.id, user.id, Post.Type.OFFER),
      mailto_request: mailtoLink(community.id, user.id, Post.Type.REQUEST),
      mailto_intention: mailtoLink(community.id, user.id, Post.Type.INTENTION)
    }
  }
}

var queueEmail = function (emailData) {
  return Queue.classMethod('Email', 'sendPostSolicitation', emailData)
}

Solicitor.sendToCommunity = function (communityId) {
  return Community.find(communityId, {withRelated: ['users']})
  .then(community => {
    sails.log.debug('Solicitor - sending emails to ', community.get('name'))
    return Promise.map(community.relations.users.models, user =>
      queueEmail(emailData(user, community)))
  })
}

Solicitor.sendWeekly = function () {
  return Community.query('whereRaw', 'community.settings @> \'{"email_solicitation": true}\'')
  .fetchAll()
  .then(communities => Promise.map(communities.models, community =>
      Solicitor.sendToCommunity(community.get('id'))))
}

module.exports = Solicitor

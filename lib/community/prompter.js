var Promise = require('bluebird')
var rollbar = require('rollbar')
var sails = require('sails')

rollbar.init(process.env.ROLLBAR_SERVER_TOKEN)

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

var unsubscribeLink = function (user) {
  return Frontend.Route.tokenLogin(user, user.generateTokenSync(), Frontend.Route.userSettings() + '?expand=prompts')
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
      community_url: Frontend.Route.community(community) + '?ctt=prompt_email',
      community_avatar_url: community.get('avatar_url'),
      unsubscribe_link: unsubscribeLink(user),
      mailto_offer: mailtoLink(community.id, user.id, Post.Type.OFFER),
      mailto_request: mailtoLink(community.id, user.id, Post.Type.REQUEST),
      mailto_intention: mailtoLink(community.id, user.id, Post.Type.INTENTION)
    }
  }
}

var queueEmail = function (emailData) {
  return Queue.classMethod('Email', 'sendPostPrompt', emailData)
}

var Prompter = {
  sendToUser: function (user, community) {
    if (user.get('settings').receives_email_prompts) {
      return queueEmail(emailData(user, community))
    } else {
      return Promise.resolve()
    }
  },

  sendToCommunity: function (communityId) {
    return Community.find(communityId, {withRelated: ['users']})
    .then(community => {
      sails.log.debug('Prompter - sending emails to', community.get('name'))
      return Promise.map(community.relations.users.models, user =>
        Prompter.sendToUser(user, community))
    })
  },

  sendWeekly: function () {
    return Community.query('whereRaw', "settings->>'sends_email_prompts' = 'true'")
    .fetchAll()
    .then(communities => Promise.map(communities.models, community => {
      return Prompter.sendToCommunity(community.get('id'))
    }, {concurrency: 1}))
  }
}

module.exports = Prompter

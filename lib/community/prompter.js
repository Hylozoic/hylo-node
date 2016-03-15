var Promise = require('bluebird')
var rollbar = require('rollbar')
var sails = require('sails')

rollbar.init(process.env.ROLLBAR_SERVER_TOKEN)

var loginLink = function (user, community) {
  return Frontend.Route.tokenLogin(user, user.generateTokenSync(), Frontend.Route.community(community))
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
      login_link: loginLink(user, community),
      token: Email.postCreationToken(community.id, user.id),
      form_action: Frontend.Route.emailPostForm()
    }
  }
}

var queueEmail = function (emailData) {
  return Queue.classMethod('Email', 'sendPostPromptForm', emailData)
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

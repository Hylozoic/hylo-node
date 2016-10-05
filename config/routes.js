/* eslint key-spacing:0 */

/**
 * http://sailsjs.org/#/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {
  'GET    /noo/user/status':                              'UserController.status',
  'GET    /noo/user/me':                                  'UserController.findSelf',
  'POST   /noo/user/me':                                  'UserController.update',
  'POST   /noo/user/password':                            'UserController.sendPasswordReset',
  'GET    /noo/user/:userId':                             'UserController.findOne',
  'GET    /noo/user':                                     'UserController.findAll',
  'POST   /noo/user':                                     'UserController.create',
  'POST   /noo/user/:userId':                             'UserController.update',
  'GET    /noo/user/:userId/contributions':               'UserController.contributions',
  'GET    /noo/user/:userId/thanks':                      'UserController.thanks',
  'GET    /noo/user/:userId/posts':                       'PostController.findForUser',
  'GET    /noo/user/:userId/followed-posts':              'PostController.findForFollowed',
  'GET    /noo/user/:userId/all-community-posts':         'PostController.findForAllForUser',

  'GET    /noo/community':                                  'CommunityController.find',
  'POST   /noo/community':                                  'CommunityController.create',
  'POST   /noo/community/code':                             'CommunityController.joinWithCode',
  'POST   /noo/community/validate':                         'CommunityController.validate',
  'GET    /noo/community/:communityId':                     'CommunityController.findOne',
  'POST   /noo/community/:communityId':                     'CommunityController.update',
  'GET    /noo/community/:communityId/settings':            'CommunityController.findSettings',
  'GET    /noo/community/:communityId/settings/slack':      'CommunityController.addSlack',
  'GET    /noo/community/:communityId/moderators':          'CommunityController.findModerators',
  'POST   /noo/community/:communityId/moderators':          'CommunityController.addModerator',
  'DELETE /noo/community/:communityId/moderator/:userId':   'CommunityController.removeModerator',
  'GET    /noo/community/:communityId/members':             'UserController.findForCommunity',
  'DELETE /noo/community/:communityId/member/:userId':      'CommunityController.removeMember',
  'GET    /noo/community/:communityId/posts':               'PostController.findForCommunity',
  'GET    /noo/community/:communityId/invitations':         'InvitationController.find',
  'POST   /noo/community/:communityId/invite':              'InvitationController.create',
  'POST   /noo/community/:communityId/invite/tag/:tagName': 'InvitationController.create',
  'GET    /noo/community/:communityId/activity':            'ActivityController.findForCommunity',
  'GET    /noo/community/:communityId/tags':                'TagController.findForCommunity',
  'POST   /noo/community/:communityId/tag/:tagId':          'TagController.updateForCommunity',
  'DELETE /noo/community/:communityId/tag/:tagId':          'TagController.removeFromCommunity',
  'POST   /noo/community/:communityId/tag':                 'TagController.create',
  'POST   /noo/community/:communityId/post/:postId/pin':    'CommunityController.pinPost',
  'POST   /noo/community/:communityId/update-checklist':    'CommunityController.updateChecklist',

  'GET    /noo/threads':                                  'PostController.findThreads',
  'GET    /noo/post/:postId':                             'PostController.findOne',
  'POST   /noo/post/:postId/comment':                     'CommentController.create',
  'GET    /noo/post/:postId/comments':                    'CommentController.findForPost',
  'POST   /noo/post/:postId/follow':                      'PostController.follow',
  'POST   /noo/post/:postId/fulfill':                     'PostController.fulfill',
  'POST   /noo/post/:postId/vote':                        'PostController.vote',
  'POST   /noo/post/:postId/complain':                    'PostController.complain',
  'POST   /noo/post/:postId/rsvp':                        'PostController.rsvp',
  'POST   /noo/post/:postId/update-last-read':            'PostController.updateLastRead',
  'POST   /noo/post/:postId/subscribe':                   'PostController.subscribe', // to comments
  'POST   /noo/post/:postId/unsubscribe':                 'PostController.unsubscribe', // to comments
  'POST   /noo/post/:postId/typing':                      'PostController.typing',
  'POST   /noo/post':                                     'PostController.create',
  'POST   /noo/thread':                                   'PostController.findOrCreateThread',
  'POST   /noo/post/:postId':                             'PostController.update',
  'DELETE /noo/post/:postId':                             'PostController.destroy',
  // these route names correspond with the different cases for subject in the
  // frontend fetchPosts action
  'POST   /noo/freshness/posts/community/:communityId':   'PostController.checkFreshnessForCommunity',
  'POST   /noo/freshness/posts/person/:userId':           'PostController.checkFreshnessForUser',
  'POST   /noo/freshness/posts/all-posts/:userId':        'PostController.checkFreshnessForAllForUser',
  'POST   /noo/freshness/posts/followed-posts/:userId':   'PostController.checkFreshnessForFollowed',
  'POST   /noo/freshness/posts/network/:networkId':       'PostController.checkFreshnessForNetwork',
  'POST   /noo/freshness/posts/tag/:tagName':             'PostController.checkFreshnessForTagInAllCommunities',

  'POST   /noo/comment/:commentId/thank':                 'CommentController.thank',
  'DELETE /noo/comment/:commentId':                       'CommentController.destroy',
  'POST   /noo/comment/:commentId':                       'CommentController.update',

  'DELETE /noo/membership/:communityId':                  'CommunityController.leave',
  'POST /noo/membership/:communityId':                    'CommunityController.updateMembership',

  'GET    /noo/activity':                                 'ActivityController.find',
  'POST   /noo/activity':                                 'ActivityController.update',
  'POST   /noo/activity/mark-all-read':                   'ActivityController.markAllRead',
  'POST   /noo/activity/:activityId':                     'ActivityController.update',

  'GET    /noo/network/:networkId':                       'NetworkController.findOne',
  'GET    /noo/network/:networkId/posts':                 'PostController.findForNetwork',
  'GET    /noo/network/:networkId/communities':           'CommunityController.findForNetwork',
  'GET    /noo/network/:networkId/communitiesForNav':     'CommunityController.findForNetworkNav',
  'GET    /noo/network/:networkId/members':               'UserController.findForNetwork',
  'POST   /noo/network':                                  'NetworkController.create',
  'POST   /noo/network/validate':                         'NetworkController.validate',
  'POST   /noo/network/:networkId':                       'NetworkController.update',

  'GET    /noo/community/:communityId/tag/:tagName':        'TagController.findOneInCommunity',
  'POST   /noo/community/:communityId/tag/:tagName/follow': 'TagController.follow',
  'GET    /noo/community/:communityId/tags/followed':       'TagController.findFollowed',
  'GET    /noo/tag/:tagName':                               'TagController.findOne',
  'GET    /noo/community/:communityId/tag/:tagName/summary':'TagController.findOneSummary',
  'GET    /noo/tag/:tagName/posts':                         'PostController.findForTagInAllCommunities',

  'GET    /noo/search/fulltext':                          'SearchController.showFullText',
  'GET    /noo/autocomplete':                             'SearchController.autocomplete',

  'GET    /noo/invitation/:token':                        'InvitationController.findOne',
  'POST   /noo/invitation/:token':                        'InvitationController.use',

  'GET    /noo/admin/login':                              'AdminSessionController.create',
  'GET    /noo/admin/login/oauth':                        'AdminSessionController.oauth',
  'GET    /noo/admin/logout':                             'AdminSessionController.destroy',
  'GET    /noo/admin/raw-metrics':                        'AdminController.rawMetrics',
  'GET    /noo/admin/login-as/:userId':                   'AdminController.loginAsUser',

  'POST   /noo/hook/comment':                             'CommentController.createFromEmail',
  'POST   /noo/hook/message':                             'MessageController.relayFromEmail',
  'POST   /noo/hook/postForm':                            'PostController.createFromEmailForm',

  'POST   /noo/login':                                    'SessionController.create',
  'GET    /noo/login/token':                              'SessionController.createWithToken',
  'GET    /noo/login/google':                             'SessionController.startGoogleOAuth',
  'GET    /noo/login/google/oauth':                       'SessionController.finishGoogleOAuth',
  'GET    /noo/login/facebook':                           'SessionController.startFacebookOAuth',
  'GET    /noo/login/facebook/oauth':                     'SessionController.finishFacebookOAuth',
  'GET    /noo/login/linkedin':                           'SessionController.startLinkedinOAuth',
  'GET    /noo/login/linkedin/oauth':                     'SessionController.finishLinkedinOAuth',
  'GET    /noo/login/facebook-token/oauth':               'SessionController.finishFacebookTokenOAuth',
  'POST   /noo/login/facebook-token/oauth':               'SessionController.finishFacebookTokenOAuth',
  'GET    /noo/login/google-token/oauth':                 'SessionController.finishGoogleTokenOAuth',
  'POST   /noo/login/google-token/oauth':                 'SessionController.finishGoogleTokenOAuth',
  'GET    /noo/login/linkedin-token/oauth':               'SessionController.finishLinkedinTokenOAuth',
  'POST   /noo/login/linkedin-token/oauth':               'SessionController.finishLinkedinTokenOAuth',
  'GET    /noo/logout':                                   'SessionController.destroy',
  'DELETE /noo/session':                                  'SessionController.destroySession',

  'GET     /noo/nexudus':                                 'NexudusController.create',

  'POST    /noo/device':                                  'DeviceController.create',
  'DELETE  /noo/device/:token':                           'DeviceController.destroy',
  'POST    /noo/device/:token/update-badge-no':           'Device.updateBadgeNo',

  'POST    /noo/subscription':                            'SubscriptionController.create',

  'GET     /noo/mobile/auto-update-info':                 'MobileAppController.updateInfo',

  'GET     /noo/live-status':                             'LiveStatusController.show',
  'GET     /noo/link-preview':                            'LinkPreviewController.findOne'
}

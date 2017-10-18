/* eslint-disable key-spacing */

/**
 * http://sailsjs.org/#/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {
  'GET    /noo/user/status':                              'UserController.status',
  'POST   /noo/user/password':                            'UserController.sendPasswordReset',
  'POST   /noo/user':                                     'UserController.create',

  'POST   /noo/community/:communityId/subscribe':         'CommunityController.subscribe',
  'POST   /noo/community/:communityId/unsubscribe':       'CommunityController.unsubscribe',

  'GET    /noo/network/:networkId':                       'NetworkController.findOne',
  'POST   /noo/network':                                  'NetworkController.create',
  'POST   /noo/network/validate':                         'NetworkController.validate',
  'POST   /noo/network/:networkId':                       'NetworkController.update',

  'GET    /noo/admin/login':                              'AdminSessionController.create',
  'GET    /noo/admin/login/oauth':                        'AdminSessionController.oauth',
  'GET    /noo/admin/logout':                             'AdminSessionController.destroy',
  'GET    /noo/admin/raw-metrics':                        'AdminController.rawMetrics',
  'GET    /noo/admin/login-as/:userId':                   'AdminController.loginAsUser',

  'POST   /noo/hook/comment':                             'CommentController.createFromEmail',
  'GET    /noo/hook/postForm':                            'PostController.createFromEmailForm',
  'POST   /noo/hook/postForm':                            'PostController.createFromEmailForm',
  'GET    /noo/hook/batchCommentForm':                    'CommentController.createBatchFromEmailForm',
  'POST   /noo/hook/batchCommentForm':                    'CommentController.createBatchFromEmailForm',

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

  'POST   /noo/access-token':                             'AccessTokenController.create',
  'DELETE /noo/access-token/revoke':                      'AccessTokenController.destroy',

  'GET     /noo/nexudus':                                 'NexudusController.create',

  'POST    /noo/subscription':                            'SubscriptionController.create',

  'GET     /noo/mobile/check-should-update':              'MobileAppController.checkShouldUpdate',

  // websockets routes
  'POST   /noo/post/:postId/subscribe':                   'PostController.subscribe', // to comments
  'POST   /noo/post/:postId/unsubscribe':                 'PostController.unsubscribe', // from comments
  'POST   /noo/post/:postId/typing':                      'PostController.typing',
  'POST   /noo/threads/subscribe':                        'PostController.subscribeToUpdates',
  'POST   /noo/threads/unsubscribe':                      'PostController.unsubscribeFromUpdates',

  'POST   /noo/upload':                                   'UploadController.create'
}

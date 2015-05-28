/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/


  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  *  If a request to a URL doesn't match any of the custom routes above, it  *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

  'GET    /noo/user/status':                              'UserController.status',
  'GET    /noo/user/me':                                  'UserController.findSelf',
  'POST   /noo/user/password':                            'UserController.sendPasswordReset',
  'GET    /noo/user/:userId':                             'UserController.findOne',
  'POST   /noo/user':                                     'UserController.create',
  'POST   /noo/user/:userId':                             'UserController.update',
  'GET    /noo/user/:userId/contributions':               'UserController.contributions',
  'GET    /noo/user/:userId/thanks':                      'UserController.thanks',
  'GET    /noo/user/:userId/posts':                       'PostController.findForUser',
  'GET    /noo/user/:userId/followed-posts':              'PostController.findFollowed',
  'GET    /noo/user/:userId/all-community-posts':         'PostController.findAllForUser',
  'POST   /noo/user/:userId/onboarding':                  'OnboardingController.update',

  'POST   /noo/community':                                'CommunityController.create',
  'GET    /noo/community/default':                        'CommunityController.findDefault',
  'POST   /noo/community/validate':                       'CommunityController.validate',
  'GET    /noo/community/:communityId':                   'CommunityController.findOne',
  'POST   /noo/community/:communityId':                   'CommunityController.update',
  'POST   /noo/community/:communityId/invite':            'CommunityController.invite',
  'GET    /noo/community/:communityId/moderators':        'CommunityController.findModerators',
  'POST   /noo/community/:communityId/moderators':        'CommunityController.addModerator',
  'DELETE /noo/community/:communityId/moderator/:userId': 'CommunityController.removeModerator',
  'GET    /noo/community/:communityId/members':           'CommunityController.findMembers',
  'DELETE /noo/community/:communityId/member/:userId':    'CommunityController.removeMember',
  'GET    /noo/community/:communityId/posts':             'PostController.findForCommunity',

  'GET    /noo/post/:postId':                             'PostController.findOne',
  'POST   /noo/post/:postId/comment':                     'CommentController.create',
  'GET    /noo/post/:postId/comments':                    'CommentController.findForPost',
  'POST   /noo/post/:postId/followers':                   'PostController.addFollowers',
  'POST   /noo/post/:postId/follow':                      'PostController.follow',
  'POST   /noo/post/:postId/fulfill':                     'PostController.fulfill',
  'POST   /noo/post/:postId/vote':                        'PostController.vote',
  'POST   /noo/post':                                     'PostController.create',
  'POST   /noo/post/:postId':                             'PostController.update',
  'DELETE /noo/post/:postId':                             'PostController.destroy',

  'POST   /noo/comment/:commentId/thank':                 'CommentController.thank',
  'DELETE /noo/comment/:commentId':                       'CommentController.destroy',

  'DELETE /noo/membership/:communityId':                  'CommunityController.leave',

  'GET    /noo/activity':                                 'ActivityController.find',
  'POST   /noo/activity':                                 'ActivityController.update',
  'POST   /noo/activity/mark-all-read':                   'ActivityController.markAllRead',
  'POST   /noo/activity/:activityId':                     'ActivityController.update',

  'GET    /noo/project':                                  'ProjectController.find',
  'GET    /noo/project/:projectId':                       'ProjectController.findOne',
  'GET    /noo/project/:projectId/posts':                 'ProjectController.findPosts',
  'GET    /noo/project/:projectId/users':                 'ProjectController.findUsers',
  'POST   /noo/project':                                  'ProjectController.create',
  'POST   /noo/project/:projectId':                       'ProjectController.update',
  'POST   /noo/project/:projectId/invite':                'ProjectController.invite',

  'GET    /noo/search':                                   'SearchController.show',
  'GET    /noo/autocomplete':                             'SearchController.autocomplete',

  'POST   /noo/invitation/:token':                        'InvitationController.use',

  'GET    /admin/login':                                  'AdminSessionController.create',
  'GET    /admin/login/oauth':                            'AdminSessionController.oauth',
  'GET    /admin/logout':                                 'AdminSessionController.destroy',
  'GET    /admin':                                        'AdminController.index',
  'GET    /admin/test':                                   'AdminController.test',

  'GET    /noo/linkedin/authorize':                       'LinkedinController.authorize',
  'GET    /noo/linkedin/provide':                         'LinkedinController.provideData',

  'POST   /noo/hook/comment':                             'CommentController.createFromEmail',
  'POST   /noo/hook/message':                             'MessageController.relayFromEmail',

  'POST   /noo/login':                                    'SessionController.create',
  'GET    /noo/login/token':                              'SessionController.createWithToken',
  'GET    /noo/login/google':                             'SessionController.startGoogleOAuth',
  'GET    /noo/login/google/oauth':                       'SessionController.finishGoogleOAuth',
  'GET    /noo/login/facebook':                           'SessionController.startFacebookOAuth',
  'GET    /noo/login/facebook/oauth':                     'SessionController.finishFacebookOAuth',
  'GET    /noo/login/linkedin':                           'SessionController.startLinkedinOAuth',
  'GET    /noo/login/linkedin/oauth':                     'SessionController.finishLinkedinOAuth',
  'GET    /noo/logout':                                   'SessionController.destroy',

  '/*':                                                   'StaticPageController.proxy'

};

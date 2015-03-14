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
  'GET    /noo/user/:userId':                             'UserController.findOne',
  'POST   /noo/user/:userId':                             'UserController.update',
  'GET    /noo/user/:userId/contributions':               'UserController.contributions',
  'GET    /noo/user/:userId/thanks':                      'UserController.thanks',
  'GET    /noo/user/:userId/seeds':                       'PostController.findForUser',
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
  'GET    /noo/community/:communityId/seeds':             'PostController.findForCommunity',

  'GET    /noo/seed/:postId':                             'PostController.findOne',
  'POST   /noo/seed/:postId/comment':                     'CommentController.create',
  'POST   /noo/seed/:postId/followers':                   'PostController.addFollowers',
  'POST   /noo/seed/:postId/follow':                      'PostController.follow',
  'POST   /noo/seed':                                     'PostController.create',
  'POST   /noo/seed/:postId':                             'PostController.update',

  'POST   /noo/comment/:commentId/thank':                 'CommentController.thank',

  'DELETE /noo/membership/:communityId':                  'CommunityController.leave',

  'GET    /noo/activity':                                 'ActivityController.find',
  'POST   /noo/activity':                                 'ActivityController.update',
  'POST   /noo/activity/:activityId':                     'ActivityController.update',

  'GET    /noo/search':                                   'SearchController.show',

  'GET    /admin/login':                                  'AdminSessionController.create',
  'GET    /admin/login/oauth':                            'AdminSessionController.oauth',
  'GET    /admin/logout':                                 'AdminSessionController.destroy',
  'GET    /admin':                                        'AdminController.index',
  'GET    /admin/test':                                   'AdminController.test',

  'GET    /noo/linkedin/authorize':                       'LinkedinController.authorize',
  'GET    /noo/linkedin/provide':                         'LinkedinController.provideData',

  'POST   /noo/hook/comment':                             'CommentController.createFromEmail',

  'GET    /noo/logout':                                   'SessionController.destroy',

  '/*':                                                   'StaticPageController.proxy'

};

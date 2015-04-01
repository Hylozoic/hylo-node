/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.policies.html
 */


module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions (`true` allows public     *
  * access)                                                                  *
  *                                                                          *
  ***************************************************************************/

  '*': false,

  StaticPageController: true,

  AdminSessionController: {
    create: true,
    oauth: true,
    destroy: true
  },

  SessionController: {
    destroy: ['sessionAuth']
  },

  LinkedinController: ['sessionAuth'],

  AdminController: {
    index: ['isAdmin'],
    test: ['isAdmin']
  },

  SearchController: {
    show: ['sessionAuth', 'checkAndSetMembership']
  },

  UserController: {
    status: true,
    findSelf: ['sessionAuth'],
    findOne: ['sessionAuth', 'inSameCommunity'],
    update: ['sessionAuth', 'isSelf'],
    contributions: ['sessionAuth', 'inSameCommunity'],
    thanks: ['sessionAuth', 'inSameCommunity']
  },

  ActivityController: {
    find: ['sessionAuth'],
    update: ['sessionAuth', 'isOwner'],
    markAllRead: ['sessionAuth']
  },

  OnboardingController: {
    update: ['sessionAuth', 'isSelf']
  },

  CommunityController: {
    findDefault: ['sessionAuth'],
    findOne: ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    update: ['sessionAuth', 'isModerator'],
    invite: ['sessionAuth', 'canInvite'],
    findModerators: ['sessionAuth', 'isModerator'],
    addModerator: ['sessionAuth', 'isModerator'],
    removeModerator: ['sessionAuth', 'isModerator'],
    findMembers: ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    removeMember: ['sessionAuth', 'isModerator'],
    leave: ['sessionAuth', 'checkAndSetMembership'],
    validate: ['sessionAuth'],
    create: ['sessionAuth']
  },

  PostController: {
    findOne: ['sessionAuth', 'checkAndSetPost'],
    findForUser: ['sessionAuth', 'inSameCommunity'],
    findForCommunity: ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    create: ['sessionAuth', 'checkAndSetMembership'],
    update: ['sessionAuth', 'checkAndSetWritablePost'],
    addFollowers: ['sessionAuth', 'checkAndSetPost'],
    follow: ['sessionAuth', 'checkAndSetPost'],
    findFollowed: ['sessionAuth', 'isSelf'],
    findAllForUser: ['sessionAuth', 'isSelf']
  },

  CommentController: {
    create: ['sessionAuth', 'checkAndSetPost'],
    thank: ['sessionAuth'],
    createFromEmail: true,
  }

  /***************************************************************************
  *                                                                          *
  * Here's an example of mapping some policies to run before a controller    *
  * and its actions                                                          *
  *                                                                          *
  ***************************************************************************/
	// RabbitController: {

		// Apply the `false` policy as the default for all of RabbitController's actions
		// (`false` prevents all access, which ensures that nothing bad happens to our rabbits)
		// '*': false,

		// For the action `nurture`, apply the 'isRabbitMother' policy
		// (this overrides `false` above)
		// nurture	: 'isRabbitMother',

		// Apply the `isNiceToAnimals` AND `hasRabbitFood` policies
		// before letting any users feed our rabbits
		// feed : ['isNiceToAnimals', 'hasRabbitFood']
	// }

};

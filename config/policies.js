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

  SessionController: {
    create: true,
    oauth: true
  },

  AdminController: {
    index: ['isAdmin']
  },

  UserController: {
    findSelf: ['playSessionCheck', 'sessionAuth'],
    findOne: ['playSessionCheck', 'sessionAuth', 'inSameCommunity'],
    update: ['playSessionCheck', 'sessionAuth', 'isSelf'],
    contributions: ['playSessionCheck', 'sessionAuth', 'inSameCommunity'],
    thanks: ['playSessionCheck', 'sessionAuth', 'inSameCommunity']
  },

  CommunityController: {
    findDefault: ['playSessionCheck', 'sessionAuth'],
    findOne: ['playSessionCheck', 'sessionAuth', 'isMember'],
    update: ['playSessionCheck', 'sessionAuth', 'isModerator'],
    invite: ['playSessionCheck', 'sessionAuth', 'isModerator'],
    findModerators: ['playSessionCheck', 'sessionAuth', 'isModerator'],
    addModerator: ['playSessionCheck', 'sessionAuth', 'isModerator'],
    removeModerator: ['playSessionCheck', 'sessionAuth', 'isModerator'],
    findMembers: ['playSessionCheck', 'sessionAuth', 'isMember']
  },

  PostController: {
    find: ['playSessionCheck', 'sessionAuth', 'isMember'],
    comment: ['playSessionCheck', 'sessionAuth', 'checkAndSetPost']
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

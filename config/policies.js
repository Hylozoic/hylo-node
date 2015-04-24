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

  '*': false,
  StaticPageController: true,
  SessionController: true,
  LinkedinController: ['sessionAuth'],

  AdminSessionController: {
    create: true,
    oauth: true,
    destroy: true
  },

  AdminController: {
    index: ['isAdmin'],
    test: ['isAdmin']
  },

  SearchController: {
    show: ['sessionAuth', 'checkAndSetMembership']
  },

  UserController: {
    status: true,
    create: true,
    findSelf: ['allowPublicAccess', 'sessionAuth'],
    findOne: ['sessionAuth', 'inSameCommunity'],
    update: ['sessionAuth', 'isSelf'],
    contributions: ['sessionAuth', 'inSameCommunity'],
    thanks: ['sessionAuth', 'inSameCommunity'],
    sendPasswordReset: true
  },

  ActivityController: {
    find: ['sessionAuth'],
    update: ['sessionAuth', 'isActivityOwner'],
    markAllRead: ['sessionAuth']
  },

  OnboardingController: {
    update: ['sessionAuth', 'isSelf']
  },

  CommunityController: {
    findDefault: ['sessionAuth'],
    findOne: ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    update: ['sessionAuth', 'isModerator'],
    invite: ['sessionAuth', 'canInvite'],
    findModerators: ['sessionAuth', 'isModerator'],
    addModerator: ['sessionAuth', 'isModerator'],
    removeModerator: ['sessionAuth', 'isModerator'],
    findMembers: ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    removeMember: ['sessionAuth', 'isModerator'],
    leave: ['sessionAuth', 'checkAndSetMembership'],
    validate: true,
    create: ['sessionAuth']
  },

  PostController: {
    findOne: ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    findForUser: ['sessionAuth', 'inSameCommunity'],
    findForCommunity: ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    create: ['sessionAuth', 'checkAndSetMembership'],
    update: ['sessionAuth', 'checkAndSetWritablePost'],
    addFollowers: ['sessionAuth', 'checkAndSetPost'],
    follow: ['sessionAuth', 'checkAndSetPost'],
    findFollowed: ['sessionAuth', 'isSelf'],
    findAllForUser: ['sessionAuth', 'isSelf'],
    fulfill: ['sessionAuth', 'checkAndSetOwnPost'],
    vote: ['sessionAuth', 'checkAndSetPost'],
    destroy: ['sessionAuth', 'checkAndSetWritablePost']
  },

  CommentController: {
    create: ['sessionAuth', 'checkAndSetPost'],
    thank: ['sessionAuth'],
    findForPost: ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    destroy: ['sessionAuth', 'isCommentOwner'],
    createFromEmail: true,
  }

};

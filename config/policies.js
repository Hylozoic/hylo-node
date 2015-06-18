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
  InvitationController: true,
  LinkedinController: ['sessionAuth'],

  AdminSessionController: {
    create:  true,
    oauth:   true,
    destroy: true
  },

  AdminController: {
    index: ['isAdmin'],
    test:  ['isAdmin']
  },

  SearchController: {
    show: ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    autocomplete: ['sessionAuth', 'checkAndSetMembership']
  },

  UserController: {
    status:            true,
    create:            true,
    findSelf:          ['allowPublicAccess', 'sessionAuth'],
    findOne:           ['sessionAuth', 'inSameCommunityOrNetwork'],
    update:            ['sessionAuth', 'isSelf'],
    contributions:     ['sessionAuth', 'inSameCommunityOrNetwork'],
    thanks:            ['sessionAuth', 'inSameCommunityOrNetwork'],
    sendPasswordReset: true,
    findForProject:    ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject']
  },

  ActivityController: {
    find:        ['sessionAuth'],
    update:      ['sessionAuth', 'isActivityOwner'],
    markAllRead: ['sessionAuth']
  },

  OnboardingController: {
    find:   ['sessionAuth'],
    update: ['sessionAuth', 'isSelf']
  },

  CommunityController: {
    find:            ['sessionAuth', 'isAdmin'],
    findOne:         ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findSettings:    ['sessionAuth', 'isModerator'],
    update:          ['sessionAuth', 'isModerator'],
    invite:          ['sessionAuth', 'canInvite'],
    findModerators:  ['sessionAuth', 'isModerator'], // FIXME move to UserController
    addModerator:    ['sessionAuth', 'isModerator'],
    removeModerator: ['sessionAuth', 'isModerator'],
    findMembers:     ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'], // FIXME move to UserController
    removeMember:    ['sessionAuth', 'isModerator'],
    leave:           ['sessionAuth', 'checkAndSetMembership'],
    validate:        true,
    create:          ['sessionAuth'],
    findForNetwork:  ['sessionAuth', 'inNetwork'],
    joinWithCode:    ['sessionAuth']
  },

  PostController: {
    findOne:          ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    findForCommunity: ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findForProject:   ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject'],
    findForUser:      ['sessionAuth', 'inSameCommunityOrNetwork'],
    findForNetwork:   ['sessionAuth', 'inNetwork'],
    create:           ['sessionAuth', 'checkAndSetMembership'],
    createForProject: ['sessionAuth', 'checkAndSetProject', 'canCreateProjectPost'],
    update:           ['sessionAuth', 'checkAndSetWritablePost'],
    addFollowers:     ['sessionAuth', 'checkAndSetPost'],
    follow:           ['sessionAuth', 'checkAndSetPost'],
    findFollowed:     ['sessionAuth', 'isSelf'],
    findAllForUser:   ['sessionAuth', 'isSelf'],
    fulfill:          ['sessionAuth', 'checkAndSetOwnPost'],
    vote:             ['sessionAuth', 'checkAndSetPost'],
    destroy:          ['sessionAuth', 'checkAndSetWritablePost']
  },

  CommentController: {
    create:          ['sessionAuth', 'checkAndSetPost'],
    thank:           ['sessionAuth'],
    findForPost:     ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    destroy:         ['sessionAuth', 'isCommentOwner'],
    createFromEmail: true,
  },

  MessageController: {
    relayFromEmail: true,
    createWaitlistRequest: true
  },

  ProjectController: {
    create:           ['sessionAuth'],
    update:           ['sessionAuth', 'checkAndSetWritableProject'],
    findOne:          ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject'],
    invite:           ['sessionAuth', 'checkAndSetWritableProject'],
    join:             ['sessionAuth', 'checkAndSetProject'],
    removeUser:       ['sessionAuth', 'checkAndSetWritableProject'],
    findForUser:      ['sessionAuth', 'isSelf'],
    findForCommunity: ['sessionAuth', 'checkAndSetMembership'],
    updateMembership: ['sessionAuth', 'isSelf', 'checkAndSetProject']
  },

  PushNotificationController: {
    updateBadgeNo:    ['sessionAuth'],
    addDevice:        ['sessionAuth']
  },

  NetworkController: {
    findOne: ['sessionAuth', 'inNetwork']
  }

};

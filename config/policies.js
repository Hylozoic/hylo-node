/* eslint key-spacing:0 */

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

  SessionController: true,
  LinkedinController: ['sessionAuth'],

  InvitationController: {
    use: true,
    findOne: true,
    find: ['sessionAuth', 'canInvite'],
    create: ['sessionAuth', 'canInvite']
  },

  AdminSessionController: {
    create:  true,
    oauth:   true,
    destroy: true
  },

  AdminController: {
    '*': ['isAdmin']
  },

  SearchController: {
    show: ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    autocomplete: ['sessionAuth', 'checkAndSetMembership'],
    showFullText: ['sessionAuth']
  },

  UserController: {
    status:              true,
    create:              true,
    findSelf:            ['allowPublicAccess', 'sessionAuth'],
    findOne:             ['sessionAuth', 'inSameCommunityOrNetwork'],
    update:              ['sessionAuth', 'isSelf'],
    contributions:       ['sessionAuth', 'inSameCommunityOrNetwork'],
    thanks:              ['sessionAuth', 'inSameCommunityOrNetwork'],
    sendPasswordReset:   true,
    findForProject:      ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject'],
    findForProjectRedux: ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject'],
    findForCommunity:    ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findForNetwork:      ['sessionAuth', 'inNetwork'],
    findForPostVote:     ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost']
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
    findSettings:    ['sessionAuth', 'canInvite'],
    update:          ['sessionAuth', 'isModerator'],
    addSlack:        ['sessionAuth', 'isModerator'],
    findModerators:  ['sessionAuth', 'isModerator'], // FIXME move to UserController
    addModerator:    ['sessionAuth', 'isModerator'],
    removeModerator: ['sessionAuth', 'isModerator'],
    removeMember:    ['sessionAuth', 'isModerator'],
    leave:           ['sessionAuth', 'checkAndSetMembership'],
    validate:        true,
    create:          ['sessionAuth'],
    findForNetwork:  ['sessionAuth', 'inNetwork'],
    joinWithCode:    ['sessionAuth']
  },

  PostController: {
    findOne:                     ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    findForCommunity:            ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    checkFreshnessForCommunity:  ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findForProject:              ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject'],
    checkFreshnessForProject:    ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject'],
    findForUser:                 ['sessionAuth', 'inSameCommunityOrNetwork'],
    checkFreshnessForUser:       ['sessionAuth', 'inSameCommunityOrNetwork'],
    findForNetwork:              ['sessionAuth', 'inNetwork'],
    checkFreshnessForNetwork:    ['sessionAuth', 'inNetwork'],
    create:                      ['sessionAuth', 'inCommunitiesOrProject'],
    update:                      ['sessionAuth', 'checkAndSetWritablePost'],
    follow:                      ['sessionAuth', 'checkAndSetPost'],
    respond:                     ['sessionAuth', 'checkAndSetPost'],
    findForFollowed:             ['sessionAuth', 'isSelf'],
    checkFreshnessForFollowed:   ['sessionAuth', 'isSelf'],
    findForAllForUser:           ['sessionAuth', 'isSelf'],
    checkFreshnessForAllForUser: ['sessionAuth', 'isSelf'],
    fulfill:                     ['sessionAuth', 'checkAndSetOwnPost'],
    vote:                        ['sessionAuth', 'checkAndSetPost'],
    complain:                    ['sessionAuth', 'checkAndSetPost'],
    destroy:                     ['sessionAuth', 'checkAndSetWritablePost'],
    createFromEmail: true
  },

  CommentController: {
    create:          ['sessionAuth', 'checkAndSetPost'],
    thank:           ['sessionAuth'],
    findForPost:     ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    destroy:         ['sessionAuth', 'isCommentOwner'],
    createFromEmail: true
  },

  MessageController: {
    relayFromEmail: true,
    createWaitlistRequest: true
  },

  ProjectController: {
    create:              ['sessionAuth'],
    find:                ['allowPublicAccess', 'sessionAuth'],
    update:              ['sessionAuth', 'checkAndSetWritableProject'],
    findOne:             ['allowPublicAccess', 'sessionAuth', 'checkAndSetProject'],
    invite:              ['sessionAuth', 'checkAndSetWritableProject'],
    join:                ['sessionAuth', 'checkAndSetProject'],
    removeUser:          ['sessionAuth', 'checkAndSetWritableProject'],
    findForUser:         ['sessionAuth', 'isSelf'],
    findForCommunity:    ['sessionAuth', 'checkAndSetMembership'],
    updateMembership:    ['sessionAuth', 'isSelf', 'checkAndSetProject'],
    toggleModeratorRole: ['sessionAuth', 'checkAndSetWritableProject']
  },

  DeviceController: {
    create:           ['sessionAuth'],
    destroy:          ['sessionAuth'],
    updateBadgeNo:    ['sessionAuth']
  },

  NetworkController: {
    findOne: ['sessionAuth', 'inNetwork'],
    create:  ['sessionAuth'],
    update:  ['sessionAuth', 'inNetwork'],
    validate:        true
  },

  SubscriptionController: {
    create: true
  },

  StaticPageController: {
    proxy: ['renderOpenGraphTags']
  },

  NexudusController: true,

  MobileAppController: true,

  LiveStatusController: true

}

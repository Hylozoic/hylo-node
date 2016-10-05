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

  InvitationController: {
    findOne: true,
    use: ['sessionAuth'],
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
    findForCommunity:    ['sessionAuth', 'checkAndSetMembership'],
    findForNetwork:      ['sessionAuth', 'inNetwork'],
    findAll:             ['sessionAuth']
  },

  ActivityController: {
    find:             ['sessionAuth'],
    findForCommunity: ['sessionAuth', 'checkAndSetMembership'],
    update:           ['sessionAuth', 'isActivityOwner'],
    markAllRead:      ['sessionAuth']
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
    pinPost:         ['sessionAuth', 'isModerator'],
    leave:           ['sessionAuth', 'checkAndSetMembership'],
    updateMembership:['sessionAuth', 'checkAndSetMembership'],
    validate:        true,
    create:          ['sessionAuth'],
    findForNetwork:  ['sessionAuth', 'inNetwork'],
    findForNetworkNav:  ['sessionAuth', 'inNetwork'],
    joinWithCode:    ['sessionAuth'],
    updateChecklist: ['sessionAuth', 'isModerator', 'checkAndSetMembership']
  },

  PostController: {
    findThreads:                          ['sessionAuth'],
    findOne:                              ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    findForCommunity:                     ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    checkFreshnessForCommunity:           ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    findForUser:                          ['sessionAuth', 'inSameCommunityOrNetwork'],
    checkFreshnessForUser:                ['sessionAuth', 'inSameCommunityOrNetwork'],
    findForNetwork:                       ['sessionAuth', 'inNetwork'],
    checkFreshnessForNetwork:             ['sessionAuth', 'inNetwork'],
    create:                               ['sessionAuth', 'inCommunities'],
    findOrCreateThread:                   ['sessionAuth'],
    update:                               ['sessionAuth', 'checkAndSetWritablePost'],
    follow:                               ['sessionAuth', 'checkAndSetPost'],
    rsvp:                                 ['sessionAuth', 'checkAndSetPost'],
    updateLastRead:                       ['sessionAuth', 'checkAndSetPost'],
    subscribe:                            ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    unsubscribe:                          ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    typing:                               ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    findForFollowed:                      ['sessionAuth', 'isSelf'],
    checkFreshnessForFollowed:            ['sessionAuth', 'isSelf'],
    findForAllForUser:                    ['sessionAuth', 'isSelf'],
    checkFreshnessForAllForUser:          ['sessionAuth', 'isSelf'],
    findForTagInAllCommunities:           ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    checkFreshnessForTagInAllCommunities: ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    fulfill:                              ['sessionAuth', 'checkAndSetWritablePost'],
    vote:                                 ['sessionAuth', 'checkAndSetPost'],
    complain:                             ['sessionAuth', 'checkAndSetPost'],
    destroy:                              ['sessionAuth', 'checkAndSetWritablePost'],
    createFromEmailForm: true
  },

  CommentController: {
    create:          ['sessionAuth', 'checkAndSetPost'],
    thank:           ['sessionAuth'],
    findForPost:     ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    destroy:         ['sessionAuth', 'isCommentOwner'],
    update:          ['sessionAuth', 'isCommentOwner'],
    createFromEmail: true
  },

  MessageController: {
    relayFromEmail: true,
    createWaitlistRequest: true
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

  NexudusController: true,
  MobileAppController: true,

  LiveStatusController: {
    show: ['doNotCache']
  },

  TagController: {
    findOne: ['sessionAuth'],
    findOneInCommunity: ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    findFollowed: ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    follow: ['sessionAuth'],
    findForCommunity: ['sessionAuth', 'checkAndSetMembership'],
    removeFromCommunity: ['sessionAuth', 'isModerator'],
    updateForCommunity: ['sessionAuth', 'isModerator'],
    findOneSummary: ['sessionAuth', 'checkAndSetMembership'],
    create: ['sessionAuth', 'checkAndSetMembership']
  },

  LinkPreviewController: {
    findOne: ['sessionAuth']
  }
}

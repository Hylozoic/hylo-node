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
    create: ['sessionAuth', 'canInvite'],
    reinviteAll: ['sessionAuth', 'canInvite', 'checkAndSetMembership']
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
    findSelf:            ['allowPublicAccess', 'accessTokenAuth', 'sessionAuth'],
    findOne:             ['accessTokenAuth', 'sessionAuth', 'inSameCommunityOrNetwork'],
    update:              ['sessionAuth', 'isSelf'],
    contributions:       ['sessionAuth', 'inSameCommunityOrNetwork'],
    thanks:              ['sessionAuth', 'inSameCommunityOrNetwork'],
    sendPasswordReset:   true,
    findForCommunity:    ['sessionAuth', 'checkAndSetMembership'],
    findForNetwork:      ['sessionAuth', 'inNetwork'],
    findAll:             ['sessionAuth'],
    resetTooltips:       ['sessionAuth', 'isSelf']
  },

  ActivityController: {
    find:             ['sessionAuth'],
    findForCommunity: ['sessionAuth', 'checkAndSetMembership'],
    update:           ['sessionAuth', 'isActivityOwner'],
    markAllRead:      ['sessionAuth']
  },

  CommunityController: {
    find:                   ['sessionAuth', 'isAdmin'],
    findOne:                ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    findSettings:           ['sessionAuth', 'canInvite'],
    update:                 ['sessionAuth', 'isModerator'],
    addSlack:               ['sessionAuth', 'isModerator'],
    findModerators:         ['sessionAuth', 'isModerator'], // FIXME move to UserController
    addModerator:           ['sessionAuth', 'isModerator'],
    removeModerator:        ['sessionAuth', 'isModerator'],
    removeMember:           ['sessionAuth', 'isModerator'],
    pinPost:                ['sessionAuth', 'isModerator'],
    leave:                  ['sessionAuth', 'checkAndSetMembership'],
    updateMembership:       ['sessionAuth', 'checkAndSetMembership'],
    validate:               true,
    create:                 ['sessionAuth'],
    findForNetwork:         ['sessionAuth', 'inNetwork'],
    findForNetworkNav:      ['sessionAuth', 'inNetwork'],
    joinWithCode:           ['sessionAuth'],
    updateChecklist:        ['sessionAuth', 'isModerator', 'checkAndSetMembership'],
    requestToJoin:          ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    joinRequests:           ['sessionAuth', 'isModerator', 'checkAndSetMembership'],
    approveJoinRequest:     ['sessionAuth', 'isModerator', 'checkAndSetMembership'],
    approveAllJoinRequests: ['sessionAuth', 'isModerator', 'checkAndSetMembership']
  },

  PostController: {
    findThreads:                          ['sessionAuth'],
    findOne:                              ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    findForCommunity:                     ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    checkFreshnessForCommunity:           ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    findForUser:                          ['sessionAuth', 'inSameCommunityOrNetwork'],
    checkFreshnessForUser:                ['sessionAuth', 'inSameCommunityOrNetwork'],
    findForNetwork:                       ['sessionAuth', 'inNetwork'],
    checkFreshnessForNetwork:             ['sessionAuth', 'inNetwork'],
    create:                               ['accessTokenAuth', 'sessionAuth', 'inCommunities'],
    findOrCreateThread:                   ['sessionAuth'],
    update:                               ['sessionAuth', 'checkAndSetWritablePost'],
    follow:                               ['sessionAuth', 'checkAndSetPost'],
    unfollow:                             ['sessionAuth', 'checkAndSetPost'],
    rsvp:                                 ['sessionAuth', 'checkAndSetPost'],
    updateLastRead:                       ['sessionAuth', 'checkAndSetPost'],
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
    subscribe:                            ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    unsubscribe:                          ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    typing:                               ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    subscribeToThreads:                   ['isSocket', 'sessionAuth'],
    unsubscribeFromThreads:               ['isSocket', 'sessionAuth'],
    createFromEmailForm: ['checkAndDecodeToken']
  },

  CommentController: {
    create:          ['sessionAuth', 'checkAndSetPost', 'setComment'],
    thank:           ['sessionAuth'],
    findForParent:   ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost', 'setComment'],
    destroy:         ['sessionAuth', 'isCommentOwner'],
    update:          ['sessionAuth', 'isCommentOwner'],
    createFromEmail: true,
    createBatchFromEmailForm: ['checkAndDecodeToken']
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
  },

  TokenController: {
    create: ['sessionAuth'],
    destroy: ['sessionAuth']
  }
}

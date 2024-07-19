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

  AdminController: {
    '*': 'isAdmin'
  },

  MobileAppController: {
    '*': true
  },

  NexudusController: {
    '*': true
  },

  SessionController: {
    createWithJWT: ['checkJWT'],
    '*': true
  },

  SubscriptionController: {
    '*': true
  },

  UploadController: {
    '*': 'sessionAuth'
  },

  ExportController: {
    '*': 'sessionAuth'
  },

  AdminSessionController: {
    create:  true,
    oauth:   true,
    destroy: true
  },

  CommentController: {
    createFromEmail: true,
    createBatchFromEmailForm: ['checkAndDecodeToken']
  },

  GroupController: {
    subscribe:   ['isSocket', 'sessionAuth', 'checkAndSetMembership'],
    unsubscribe: ['isSocket', 'sessionAuth', 'checkAndSetMembership']
  },

  PostController: {
    updateLastRead:         ['sessionAuth', 'checkAndSetPost'],
    subscribe:              ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    unsubscribe:            ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    typing:                 ['isSocket', 'sessionAuth', 'checkAndSetPost'],
    createFromEmailForm:    ['checkAndDecodeToken'],

    // FIXME these two should go in UserController
    subscribeToUpdates:     ['isSocket', 'sessionAuth'],
    unsubscribeFromUpdates: ['isSocket', 'sessionAuth']
  },

  UserController: {
    create: ['checkClientCredentials'],
    getNotificationSettings: true,
    updateNotificationSettings: true
  },

  PaymentController: {
    registerStripe: ['sessionAuth']
  }
}

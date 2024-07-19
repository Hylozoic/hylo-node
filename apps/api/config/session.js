const { v4: uuidv4 } = require('uuid')

/**
 * Session Configuration
 * (sails.config.session)
 *
 * Sails session integration leans heavily on the great work already done by
 * Express, but also unifies Socket.io with the Connect session store. It uses
 * Connect's cookie parser to normalize configuration differences between Express
 * and Socket.io and hooks into Sails' middleware interpreter to allow you to access
 * and auto-save to `req.session` with Socket.io the same way you would with Express.
 *
 * For more information on configuring the session, check out:
 * https://sailsjs.com/documentation/reference/configuration/sails-config-session
 */

module.exports.session = {

  /***************************************************************************
  *                                                                          *
  * Session secret is automatically generated when your new app is created   *
  * Replace at your own risk in production-- you will invalidate the cookies *
  * of your users, forcing them to log in again.                             *
  *                                                                          *
  ***************************************************************************/
  secret: process.env.COOKIE_SECRET,

  genid: function(req) {
    // use UUIDs for session IDs prefixed by userId so we can find and clear all sessions for this user on password change
    return (req.userId || 'anon') + ":" + uuidv4()
  },

  /***************************************************************************
  *                                                                          *
  * Set the session cookie expire time                                       *
  * The maxAge is set by milliseconds                                        *
  *                                                                          *
  ***************************************************************************/

  name: process.env.COOKIE_NAME, // cookie name, instead of sails.sid

  cookie: {
    domain: process.env.COOKIE_DOMAIN,
    maxAge: 60 * 86400000, // 60 days
    secure: process.env.PROTOCOL === 'https',
    sameSite: process.env.PROTOCOL === 'https' ? 'None' : 'Lax'
  },

  /***************************************************************************
  *                                                                          *
  * In production, uncomment the following lines to set up a shared redis    *
  * session store that can be shared across multiple Sails.js servers        *
  ***************************************************************************/

  adapter: '@sailshq/connect-redis',

  /***************************************************************************
  *                                                                          *
  * The following values are optional, if no options are set a redis         *
  * instance running on localhost is expected. Read more about options at:   *
  * https://github.com/visionmedia/connect-redis                             *
  *                                                                          *
  *                                                                          *
  ***************************************************************************/

  url: process.env.REDIS_URL,
  ttl: 86400 * 60,
  prefix: 'sess:'

  /***************************************************************************
  *                                                                          *
  * Uncomment the following lines to use your Mongo adapter as a session     *
  * store                                                                    *
  *                                                                          *
  ***************************************************************************/

  // adapter: 'mongo',
  // host: 'localhost',
  // port: 27017,
  // db: 'sails',
  // collection: 'sessions',

  /***************************************************************************
  *                                                                          *
  * Optional Values:                                                         *
  *                                                                          *
  * # Note: url will override other connection settings url:                 *
  * 'mongodb://user:pass@host:port/database/collection',                     *
  *                                                                          *
  ***************************************************************************/

  // username: '',
  // password: '',
  // auto_reconnect: false,
  // ssl: false,
  // stringify: true

};

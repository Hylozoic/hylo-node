/**
 * Production environment settings
 *
 * This file can include shared settings for a production environment,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the production        *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

  // models: {
  //   connection: 'someMysqlServer'
  // },

  /***************************************************************************
   * Set the port in the production environment to 80                        *
   ***************************************************************************/

  // port: 80,

  /***************************************************************************
   * Set the log level in production environment to "silent"                 *
   ***************************************************************************/

  // log: {
  //   level: "silent"

  http: {
    cache: 365.25 * 24 * 60 * 60 * 1000 // one year
  },

  sockets: {
    onlyAllowOrigins: [
      "https://www.hylo.com",
      "https://hylo.com",
      "https://api.hylo.com",
      "https://staging.hylo.com",
      "https://node1.hylo.com",
      "https://review.hylo.com",
      "https://api-staging.hylo.com",
      "https://api-review.hylo.com",
      "http://localhost:9000",
      "https://localhost:9000",
      "http://localhost:3000",
      "https://localhost:3000",
      "http://localhost:3001",
      "https://localhost:3001"
    ]
  }
};

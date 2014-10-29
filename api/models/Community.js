/**
* Community.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name: 'string',
    slug: 'string',
    beta_access_code: 'string',
    users: {
      collection: 'user',
      via: 'communities',
      through: 'communityuser'
    }
  },

  autoCreatedAt: false,
  autoUpdatedAt: false

};


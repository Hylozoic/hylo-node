/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name: 'string',
    email: 'string',
    communities: {
      collection: 'community',
      via: 'users',
      through: 'communityuser'
    },
    linkedAccounts: {
      collection: 'linkedAccount',
      via: 'user'
    }
  },

  tableName: 'users',
  autoCreatedAt: false,
  autoUpdatedAt: false

};


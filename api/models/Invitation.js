var util = require('util'),
  uuid = require('node-uuid');

module.exports = bookshelf.Model.extend({
  tableName: 'community_invite',

  community: function() {
    return this.belongsTo(Community);
  },

  creator: function() {
    return this.belongsTo(User, 'invited_by_id');
  }

}, {

  create: function(opts) {
    return new Invitation({
      invited_by_id: opts.user.id,
      community_id: opts.community.id,
      email: opts.email,
      token: uuid.v4(),
      created: new Date()
    }).save();
  },

  createAndSend: function(opts, cb) {
    Invitation.create(opts).then(function(invitation) {

      var link = util.format(
        "http://%s/community/invite/%s",
        process.env.DOMAIN, invitation.get('token')
      );

      Email.sendInvitation(opts.email, {
        recipient: opts.email,
        community_name: opts.community.get('name'),
        invite_link: link
      }, cb);

    });
  }

});
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
    var role = (opts.moderator ? Membership.MODERATOR_ROLE : Membership.DEFAULT_ROLE);

    return new Invitation({
      invited_by_id: opts.user.id,
      community_id: opts.community.id,
      email: opts.email,
      role: role,
      token: uuid.v4(),
      created: new Date()
    }).save();
  },

  createAndSend: function(opts) {
    return Invitation.create(opts)
    .then(function(invitation) {

      var link = util.format(
        "http://%s/community/invite/%s",
        process.env.DOMAIN, invitation.get('token')
      );

      return Email.sendInvitation(opts.email, {
        inviter_name: opts.user.get('name'),
        recipient: opts.email,
        community_name: opts.community.get('name'),
        invite_link: link
      });
    });
  }

});
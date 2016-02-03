var util = require('util'),
  uuid = require('node-uuid');

module.exports = bookshelf.Model.extend({
  tableName: 'community_invite',

  community: function() {
    return this.belongsTo(Community);
  },

  creator: function() {
    return this.belongsTo(User, 'invited_by_id');
  },

  user: function () {
    return this.belongsTo(User, 'used_by_id')
  },

  isUsed: function() {
    return !!this.get('used_by_id');
  },

  use: function(userId, opts) {
    if (!opts) opts = {};
    var self = this, trx = opts.transacting;
    return Membership.create(
      userId,
      this.get('community_id'),
      {
        role: Number(this.get('role')),
        transacting: trx
      }
    ).tap(function() {
      return self.save({used_by_id: userId, used_on: new Date()}, {patch: true, transacting: trx});
    });
  }

}, {

  find: function(id, opts) {
    return Invitation.where({id: id}).fetch(opts);
  },

  create: function(opts) {
    var role = (opts.moderator ? Membership.MODERATOR_ROLE : Membership.DEFAULT_ROLE);

    return new Invitation({
      invited_by_id: opts.userId,
      community_id: opts.communityId,
      email: opts.email,
      role: role,
      token: uuid.v4(),
      created: new Date()
    }).save();
  },

  createAndSend: function(opts) {
    return Invitation.create(opts)
    .then(function(invitation) {
      return Promise.join(
        invitation.load('creator'),
        invitation.load('community')
      );
    })
    .spread(function(invitation) {
      var creator = invitation.relations.creator,
        community = invitation.relations.community;

      var data = _.extend(_.pick(opts, 'message', 'subject'), {
        inviter_name: creator.get('name'),
        inviter_email: creator.get('email'),
        community_name: community.get('name'),
        invite_link: Frontend.Route.useInvitation(invitation.get('token')),
        tracking_pixel_url: Analytics.pixelUrl('Invitation', {
          recipient: opts.email,
          community: community.get('name')
        })
      });

      return Email.sendInvitation(opts.email, data);
    });
  }

});

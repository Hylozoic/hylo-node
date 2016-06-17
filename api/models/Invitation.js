var util = require('util')
var uuid = require('node-uuid')

module.exports = bookshelf.Model.extend({
  tableName: 'community_invite',

  community: function () {
    return this.belongsTo(Community)
  },

  creator: function () {
    return this.belongsTo(User, 'invited_by_id')
  },

  tag: function () {
    return this.belongsTo(Tag)
  },

  user: function () {
    return this.belongsTo(User, 'used_by_id')
  },

  isUsed: function () {
    return !!this.get('used_by_id')
  },

  use: function (userId, opts) {
    if (!opts) opts = {}
    let self = this
    let trx = opts.transacting
    return Membership.create(
      userId,
      this.get('community_id'),
      {
        role: Number(this.get('role')),
        transacting: trx
      }
    ).tap(function () {
      return self.save({used_by_id: userId, used_on: new Date()}, {patch: true, transacting: trx})
    })
  }

}, {

  find: function (id, opts) {
    return Invitation.where({id: id}).fetch(opts)
  },

  create: function (opts) {
    var role = (opts.moderator ? Membership.MODERATOR_ROLE : Membership.DEFAULT_ROLE)

    return new Invitation({
      invited_by_id: opts.userId,
      community_id: opts.communityId,
      email: opts.email,
      tag_id: opts.tagId,
      role: role,
      token: uuid.v4(),
      created: new Date()
    }).save()
  },

  createAndSend: function (opts) {
    return Invitation.create(opts)
    .then(invitation => Promise.join(
      invitation.load('creator'),
      invitation.load('community'),
      invitation.load('tag')
    ))
    .spread(invitation => {
      let creator = invitation.relations.creator
      let community = invitation.relations.community

      let data = _.extend(_.pick(opts, 'message', 'subject'), {
        inviter_name: creator.get('name'),
        inviter_email: creator.get('email'),
        community_name: community.get('name'),
        invite_link: Frontend.Route.useInvitation(invitation.get('token')),
        tracking_pixel_url: Analytics.pixelUrl('Invitation', {
          recipient: opts.email,
          community: community.get('name')
        })
      })
      if (invitation.get('tag_id')) {
        data.tag_name = invitation.relations.tag.get('name')
        return Email.sendTagInvitation(opts.email, data)
      } else {
        return Email.sendInvitation(opts.email, data)
      }
    })
  }
})

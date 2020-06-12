import uuid from 'node-uuid'
import EnsureLoad from './mixins/EnsureLoad'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'community_invites',

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

  expiredBy: function () {
    return this.belongsTo(User, 'expired_by_id')
  },

  isUsed: function () {
    return !!this.get('used_by_id')
  },

  isExpired: function () {
    return !!this.get('expired_by_id')
  },

  tagName: function () {
    return this.get('tag_id')
      ? Tag.find({ id: this.get('tag_id') }).then(t => t.get('name'))
      : Promise.resolve()
  },

  // this should always return the membership, regardless of whether the
  // invitation is unused, whether the membership already exists, and whether
  // the tag follow already exists
  async use (userId, { transacting } = {}) {
    const user = await User.find(userId, {transacting})
    const community = await this.community().fetch({transacting})
    const role = Number(this.get('role'))
    const membership =
      await GroupMembership.forPair(user, community).fetch({transacting}) ||
      await user.joinCommunity(community, role, {transacting})

    if (!this.isUsed() && this.get('tag_id')) {
      try {
        await TagFollow.add({
          tagId: this.get('tag_id'),
          userId,
          communityId: this.get('community_id'),
          transacting
        })
      } catch (err) {
        // do nothing if the tag follow already exists
        if (!err.message || !err.message.includes('duplicate key value')) {
          throw err
        }
      }
    }

    if (!this.isUsed()) {
      await this.save({used_by_id: userId, used_at: new Date()},
        {patch: true, transacting})
    }

    return membership
  },

  expire: function (userId, opts = {}) {
    const { transacting } = opts
    return this.save({expired_by_id: userId, expired_at: new Date()},
      {patch: true, transacting})
  },

  send: function () {
    return this.ensureLoad(['creator', 'community', 'tag'])
    .then(() => {
      const { creator, community } = this.relations
      const email = this.get('email')

      const data = {
        subject: this.get('subject'),
        message: this.get('message'),
        inviter_name: creator.get('name'),
        inviter_email: creator.get('email'),
        community_name: community.get('name'),
        invite_link: Frontend.Route.useInvitation(this.get('token'), email),
        tracking_pixel_url: Analytics.pixelUrl('Invitation', {
          recipient: email,
          community: community.get('name')
        })
      }
      return this.save({
        sent_count: this.get('sent_count') + 1,
        last_sent_at: new Date()
      })
      .then(() => {
        if (this.get('tag_id')) {
          throw new Error('need to re-implement tag invitations')
        } else {
          return Email.sendInvitation(email, data)
        }
      })
    })
  }

}, EnsureLoad), {

  find: (idOrToken, opts) => {
    if (!idOrToken) return Promise.resolve(null)
    const attr = isNaN(Number(idOrToken)) ? 'token' : 'id'
    return Invitation.where(attr, idOrToken).fetch(opts)
  },

  create: function (opts) {
    return new Invitation({
      invited_by_id: opts.userId,
      community_id: opts.communityId,
      email: opts.email.toLowerCase(),
      tag_id: opts.tagId,
      role: GroupMembership.Role[opts.moderator ? 'MODERATOR' : 'DEFAULT'],
      token: uuid.v4(),
      created_at: new Date(),
      subject: opts.subject,
      message: opts.message
    }).save()
  },

  createAndSend: function ({invitation}) {
    return Invitation.find(invitation.id)
      .then(invitation =>
        invitation.send()
      )
  },

  reinviteAll: function (opts) {
    const { communityId } = opts
    return Invitation.where({community_id: communityId, used_by_id: null, expired_by_id: null})
    .fetchAll({withRelated: ['creator', 'community', 'tag']})
    .then(invitations =>
      Promise.map(invitations.models, invitation => invitation.send()))
  },

  resendAllReady () {
    return Invitation.query(q => {
      const whereClause = "((sent_count=1 and last_sent_at < now() - interval '4 day') or " +
        "(sent_count=2 and last_sent_at < now() - interval '9 day'))"
      q.whereRaw(whereClause)
      q.whereNull('used_by_id')
      q.whereNull('expired_by_id')
    })
    .fetchAll({withRelated: ['creator', 'community', 'tag']})
    .tap(invitations => Promise.map(invitations.models, i => i.send()))
    .then(invitations => invitations.pluck('id'))
  }

})

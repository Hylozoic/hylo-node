import { v4 as uuidv4 } from 'uuid'
import EnsureLoad from './mixins/EnsureLoad'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_invites',
  requireFetch: false,
  hasTimestamps: ['created_at', null],

  group: function () {
    return this.belongsTo(Group)
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
    const user = await User.find(userId, { transacting })
    const group = await this.group().fetch({ transacting })
    const role = Number(this.get('role'))
    const membership =
      await GroupMembership.forPair(user, group).fetch({ transacting }) ||
      await user.joinGroup(group, { role, fromInvitation: true, transacting })

    if (!this.isUsed() && this.get('tag_id')) {
      try {
        await TagFollow.add({
          tagId: this.get('tag_id'),
          userId,
          groupId: this.get('group_id'),
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
      await this.save({ used_by_id: userId, used_at: new Date() }, { patch: true, transacting })
    }

    return membership
  },

  expire: function (userId, opts = {}) {
    const { transacting } = opts
    return this.save({expired_by_id: userId, expired_at: new Date()},
      {patch: true, transacting})
  },

  send: function () {
    return this.ensureLoad(['creator', 'group', 'tag'])
    .then(() => {
      const { creator, group } = this.relations
      const email = this.get('email')

      const data = {
        subject: this.get('subject'),
        message: this.get('message'),
        inviter_name: creator.get('name'),
        inviter_email: creator.get('email'),
        locale: creator.get('settings').locale || 'en',
        // TODO: change this data name in the email
        group_name: group.get('name'),
        invite_link: Frontend.Route.useInvitation(this.get('token'), email),
        tracking_pixel_url: Analytics.pixelUrl('Invitation', {
          recipient: email,
          group: group.get('name')
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
      group_id: opts.groupId,
      email: opts.email.toLowerCase(),
      tag_id: opts.tagId,
      role: GroupMembership.Role[opts.moderator ? 'MODERATOR' : 'DEFAULT'],
      token: uuidv4(),
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
    const { groupId } = opts
    return Invitation.where({group_id: groupId, used_by_id: null, expired_by_id: null})
    .fetchAll({withRelated: ['creator', 'group', 'tag']})
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
    .fetchAll({withRelated: ['creator', 'group', 'tag']})
    .tap(invitations => Promise.map(invitations.models, i => i.send()))
    .then(invitations => invitations.pluck('id'))
  }

})

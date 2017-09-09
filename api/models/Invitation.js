var uuid = require('node-uuid')
import { map } from 'lodash/fp'
import { presentForList } from '../presenters/UserPresenter'
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
      ? Tag.find(this.get('tag_id')).then(t => t.get('name'))
      : Promise.resolve()
  },

  // this should always return the membership, regardless of whether the
  // invitation is unused, whether the membership already exists, and whether
  // the tag follow already exists
  use: function (userId, opts = {}) {
    const { transacting } = opts
    return Membership.where({
      user_id: userId, community_id: this.get('community_id')
    }).fetch({withRelated: 'community'})
    .then(membership => membership ||
      Membership.create(userId, this.get('community_id'),
        {role: Number(this.get('role')), transacting}))
    .tap(() => !this.isUsed() && this.get('tag_id') &&
      TagFollow.add({
        tagId: this.get('tag_id'),
        userId,
        communityId: this.get('community_id'),
        transacting
      })
      .catch(err => {
        // do nothing if the tag follow already exists
        if (!err.message || !err.message.includes('duplicate key value')) {
          throw err
        }
      }))
    .tap(() => !this.isUsed() &&
      this.save({used_by_id: userId, used_at: new Date()},
        {patch: true, transacting}))
  },

  expire: function (userId, opts = {}) {
    const { transacting } = opts
    return this.save({expired_by_id: userId, expired_at: new Date()},
      {patch: true, transacting})
  },

  send: function () {
    return this.ensureLoad(['creator', 'community', 'tag'])
    .then(() => {
      const { creator, community, tag } = this.relations
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
          return TagFollow.findFollowers(community.id, this.get('tag_id'), 3)
          .then(followers => {
            data.participants = map(u => presentForList(u, {tags: true}), followers)
            data.tag_name = tag.get('name')
            return Email.sendTagInvitation(email, data)
          })
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
    var role = (opts.moderator ? Membership.MODERATOR_ROLE : Membership.DEFAULT_ROLE)

    return new Invitation({
      invited_by_id: opts.userId,
      community_id: opts.communityId,
      email: opts.email,
      tag_id: opts.tagId,
      role: role,
      token: uuid.v4(),
      created_at: new Date(),
      subject: opts.subject,
      message: opts.message
    }).save()
  },

  createAndSend: function (opts) {
    return Invitation.create(opts)
    .tap(i => i.refresh({withRelated: ['creator', 'community', 'tag']}))
    .tap(invitation => invitation.send())
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

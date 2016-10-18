import { find, get, isNull, isUndefined, merge, pick } from 'lodash'
import { filter, pickBy } from 'lodash/fp'
import { normalizeMemberships, normalizePost, uniqize } from '../../lib/util/normalize'
import { fetchAndPresentFollowed } from '../services/TagPresenter'

const relationsForSelf = [
  'memberships',
  {'memberships.community': qb => qb.column('id', 'name', 'slug', 'avatar_url')},
  'tags',
  'linkedAccounts'
]

const recentTaggedPost = (userId, tag, viewingUserId) => {
  const opts = {withComments: true, withVotes: true}
  return Post.query(q => {
    q.join('posts_tags', 'post.id', 'posts_tags.post_id')
    q.join('tags', 'tags.id', 'posts_tags.tag_id')
    q.where({
      'tags.name': tag,
      user_id: userId,
      parent_post_id: null
    })
    q.orderBy('id', 'desc')
    q.limit(1)
  })
  .fetch({withRelated: PostPresenter.relations(viewingUserId, opts)})
  .then(post => post && PostPresenter.present(post, viewingUserId, opts))
}

const extraAttributes = (user, viewingUserId, forSelf) =>
  Promise.props({
    public_email: user.encryptedEmail(),
    post_count: Post.countForUser(user), // TODO remove after hylo-frontend is gone
    event_count: Post.countForUser(user, 'event'),
    grouped_post_count: Post.groupedCountForUser(user),
    contribution_count: Contribution.countForUser(user),
    thank_count: Thank.countForUser(user),
    extra_info: user.get('extra_info'),
    tags: user.relations.tags.pluck('name'),
    recent_request: recentTaggedPost(user.id, 'request', viewingUserId),
    recent_offer: recentTaggedPost(user.id, 'offer', viewingUserId),
    shared_communities: forSelf ? null
      : Membership.sharedCommunityIds([user.id, viewingUserId])
  })

const shortAttributes = [
  'id', 'name', 'avatar_url', 'created_at',
  'bio', 'intention', 'work',
  'facebook_url', 'linkedin_url', 'twitter_name'
]

const cleanBasicAttributes = attrs => {
  attrs.memberships.forEach(m => {
    delete m.deactivated_at
    delete m.deactivator_id
    delete m.user_id
  })
  attrs.linkedAccounts.forEach(l => {
    delete l.id
    delete l.user_id
    delete l.provider_user_id
  })
  return attrs
}

const normalizeUser = user => {
  const buckets = {people: [], communities: []}
  normalizePost(user.recent_request, buckets)
  normalizePost(user.recent_offer, buckets)
  normalizeMemberships(user.memberships, buckets)
  uniqize(buckets)
  buckets.people = filter(u => u.id !== user.id, buckets.people)
  return Object.assign(buckets, user)
}

const fetchActiveUser = (id, options) =>
  User.find(id, options).tap(user => {
    if (!user || !user.get('active')) throw new Error('User not found')
  })

const fetchForSelf = (userId, isAdmin) =>
  fetchActiveUser(userId, {withRelated: relationsForSelf})
  .then(user => Promise.join(
    cleanBasicAttributes(user.toJSON()),
    extraAttributes(user, user.id, true)
  ))
  .then(attributes => _.extend.apply(_, attributes))

module.exports = {
  normalizeUser,

  fetchForOther: (id, viewingUserId) =>
    fetchActiveUser(id, {withRelated: 'tags'})
    .then(user => extraAttributes(user, viewingUserId)
      .then(extra => Object.assign(user.pick(shortAttributes), extra))),

  presentForList: function (user, opts = {}) {
    var moreAttributes = {
      tags: user.relations.tags ? user.relations.tags.pluck('name') : null
    }

    const getMembership = communityId =>
      find(user.relations.memberships.models, m => m.get('community_id') === communityId)

    if (get(opts.communityIds, 'length') === 1) {
      const membership = getMembership(opts.communityId || opts.communityIds[0])
      if (membership) {
        moreAttributes.joined_at = membership.get('created_at')
        if (membership.get('role') === Membership.MODERATOR_ROLE) {
          moreAttributes.isModerator = true
        }
      }
    }

    if (opts.communityIds && !moreAttributes.joined_at) {
      // find the earliest join date among all relevant memberships
      moreAttributes.joined_at = opts.communityIds.reduce((joinedAt, communityId) => {
        const membership = getMembership(communityId)
        if (membership) return new Date(Math.min(joinedAt, membership.get('created_at')))
        return joinedAt
      }, new Date())
    }

    return pickBy(x => !isNull(x) && !isUndefined(x), merge(
      pick(user.attributes, shortAttributes),
      moreAttributes
    ))
  },

  fetchAndPresentForSelf: (userId, session, isAdmin) =>
    fetchForSelf(userId, isAdmin)
    .then(attributes => Promise.props(Object.assign(attributes, {
      is_admin: isAdmin,
      new_message_count: User.unseenThreadCount(userId),
      provider_key: session.userProvider,
      left_nav_tags: fetchAndPresentFollowed(null, userId)
    })))
    .then(normalizeUser)
}

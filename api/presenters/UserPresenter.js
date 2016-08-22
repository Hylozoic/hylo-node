import { find, get, isNull, isUndefined, map, merge, pick } from 'lodash'
import { pickBy } from 'lodash/fp'

const relationsForSelf = [
  'memberships',
  {'memberships.community': qb => qb.column('id', 'name', 'slug', 'avatar_url', 'financial_requests_enabled')},
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

const extraAttributes = (user, viewingUserId) =>
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
    shared_communities: Membership.sharedCommunityIds([user.id, viewingUserId])
  })

const selfOnlyAttributes = (user, isAdmin) =>
  Promise.props({
    notification_count: Activity.unreadCountForUser(user),
    is_admin: isAdmin
  })

const shortAttributes = [
  'id', 'name', 'avatar_url',
  'bio', 'intention', 'work',
  'facebook_url', 'linkedin_url', 'twitter_name'
]

const UserPresenter = module.exports = {
  shortAttributes: shortAttributes,

  fetchForSelf: function (userId, isAdmin) {
    return User.find(userId, {withRelated: relationsForSelf})
    .tap(user => {
      if (!user || !user.get('active')) throw new Error('User not found')
    })
    .then(user => Promise.join(
      user.toJSON(),
      extraAttributes(user, user.id),
      selfOnlyAttributes(user, isAdmin)
    ))
    .then(attributes => _.extend.apply(_, attributes))
  },

  presentForSelf: function (attributes, session) {
    return _.extend(attributes, {provider_key: session.userProvider})
  },

  fetchForOther: function (id, viewingUserId) {
    var user
    return User.find(id, {withRelated: 'tags'})
    .tap(user => {
      if (!user || !user.get('active')) throw new Error('User not found')
    })
    .tap(u => user = u)
    .then(user => extraAttributes(user, viewingUserId))
    .then(extra => _.extend(user.attributes, extra))
  },

  presentForList: function (user, opts = {}) {
    var moreAttributes = {
      tags: map(get(user, 'relations.tags.models'), t => t.pick('id', 'name'))
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
      pick(user.attributes, UserPresenter.shortAttributes),
      moreAttributes
    ))
  }

}

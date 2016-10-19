import { merge, pick } from 'lodash'
import { get, some } from 'lodash/fp'
import {
  fetchAndPresentFollowed,
  fetchAndPresentForCommunity,
  fetchAndPresentSummary,
  withRelatedSpecialPost,
  presentWithPost
} from '../services/TagPresenter'
import { countTotal } from '../../lib/util/knex'

module.exports = {
  findOne: function (req, res) {
    return Tag.find(req.param('tagName'), withRelatedSpecialPost)
    .tap(tag => tag && TagFollow.where({
      user_id: req.session.userId,
      tag_id: tag.id
    }).query().update({new_post_count: 0}))
    .then(tag => tag ? res.ok(presentWithPost(tag)) : res.notFound())
    .catch(res.serverError)
  },

  findOneInCommunity: function (req, res) {
    let tag
    const { userId } = req.session

    return Tag.find(req.param('tagName'), withRelatedSpecialPost)
    .then(t => {
      if (!t) return res.notFound()
      tag = t
      return CommunityTag
      .where({community_id: res.locals.community.id, tag_id: tag.id})
      .fetch({withRelated: [
        'owner',
        {'community.tagFollows': q => {
          q.where({'tag_follows.tag_id': tag.id})
          q.limit(20)
          countTotal(q, 'tag_follows')
        }},
        'community.tagFollows.user'
      ]})
      .tap(ct => ct && userId && TagFollow.where({
        user_id: userId, tag_id: ct.get('tag_id')
      }).query().update({new_post_count: 0}))
      .then(ct => {
        if (!ct) return res.notFound()
        const { owner, community } = ct.relations
        const { tagFollows } = community.relations
        const followers = tagFollows.models.map(tf =>
          tf.relations.user.pick('id', 'name', 'avatar_url'))
        const followed = some(f => f.id === userId, followers)
        const followerCount = tagFollows.first() ? tagFollows.first().get('total') : 0
        return res.ok(merge(
          ct.pick('description', 'is_default', 'community_id'),
          presentWithPost(tag),
          {
            followed,
            followers,
            followerCount,
            owner: owner ? owner.pick('id', 'name', 'avatar_url') : null,
            created: get('id', owner) === userId
          }
        ))
      })
    })
    .catch(res.serverError)
  },

  findFollowed: function (req, res) {
    return (req.param('communityId') === 'all'
      ? Promise.resolve()
      : Community.find(req.param('communityId')))
    .then(com => fetchAndPresentFollowed(get('id', com), req.session.userId))
    .then(res.ok, res.serverError)
  },

  findOneSummary: function (req, res) {
    return Promise.join(
      Community.find(req.param('communityId')),
      Tag.find(req.param('tagName')),
      fetchAndPresentSummary
    )
    .then(res.ok, res.serverError)
  },

  follow: function (req, res) {
    return Promise.join(
      Tag.find(req.param('tagName')),
      Community.find(req.param('communityId')),
      (tag, community) => {
        if (!tag) return res.notFound()

        const attrs = {
          community_id: community.id,
          tag_id: tag.id,
          user_id: req.session.userId
        }

        return TagFollow.where(attrs).fetch()
        .then(tf => tf ? tf.destroy() : new TagFollow(attrs).save())
      })
    .then(res.ok, res.serverError)
  },

  findForCommunity: function (req, res) {
    return fetchAndPresentForCommunity(res.locals.community.id, {
      limit: req.param('limit'),
      offset: req.param('offset'),
      sort: req.param('sort')
    })
    .then(res.ok)
  },

  removeFromCommunity: function (req, res) {
    Community.find(req.param('communityId'))
    .then(community => CommunityTag.where({
      community_id: community.id,
      tag_id: req.param('tagId')
    }).destroy())
    .then(() => res.ok({}))
  },

  create: function (req, res) {
    const { community } = res.locals
    const { name, description, is_default } = pick(req.allParams(), ['name', 'description', 'is_default'])
    return bookshelf.transaction(trx => {
      const trxOpts = {transacting: trx}
      return Tag.findOrCreate(name, trxOpts)
      .tap(tag => new TagFollow({
        community_id: community.id,
        tag_id: tag.id,
        user_id: req.session.userId
      }).save(null, trxOpts))
      .then(tag => new CommunityTag({
        tag_id: tag.id,
        community_id: community.id,
        description,
        user_id: req.session.userId,
        is_default
      }).save(null, trxOpts))
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  updateForCommunity: function (req, res) {
    const params = pick(req.allParams(), ['description', 'is_default'])
    return Community.find(req.param('communityId'))
    .then(community =>
      CommunityTag.query().where({
        community_id: community.id,
        tag_id: req.param('tagId')
      }).update(params))
    .then(() => res.ok({}))
  }
}

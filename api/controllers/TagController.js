import { merge } from 'lodash'
import { get, some } from 'lodash/fp'
import {
  fetchAndPresentFollowed,
  fetchAndPresentForCommunity,
  fetchAndPresentSummary,
  withRelatedSpecialPost,
  presentWithPost
} from '../services/TagPresenter'

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
    return Tag.find(req.param('tagName'), withRelatedSpecialPost)
    .then(t => {
      if (!t) return
      tag = t
      return CommunityTag
      .where({community_id: res.locals.community.id, tag_id: tag.id})
      .fetch({withRelated: [
        'owner',
        {'community.tagFollows': q => q.where({'tag_follows.tag_id': tag.id})},
        'community.tagFollows.user'
      ]})
      .tap(ct => ct && TagFollow.where({
        user_id: req.session.userId,
        tag_id: ct.get('tag_id')
      }).query().update({new_post_count: 0}))
      .then(ct => {
        if (!ct) return res.notFound()
        const { owner, community } = ct.relations
        const { tagFollows } = community.relations
        const { userId } = req.session
        const followers = tagFollows.models.map(tf =>
          tf.relations.user.pick('id', 'name', 'avatar_url'))
        const followed = some(f => f.id === userId, followers)
        return res.ok(merge(
          ct.pick('description', 'community_id'),
          presentWithPost(tag),
          {
            followed,
            followers,
            owner: owner.pick('id', 'name', 'avatar_url'),
            created: owner.id === userId
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
      offset: req.param('offset')
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
  }
}

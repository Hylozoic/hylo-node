import { merge } from 'lodash'
import {
  fetchAndPresentFollowed, fetchAndPresentForCommunity,
  fetchAndPresentForLeftNav, fetchAndPresentSummary, withRelatedSpecialPost,
  presentWithPost
} from '../services/TagPresenter'

module.exports = {

  findOne: function (req, res) {
    return Tag.find(req.param('tagName'), withRelatedSpecialPost)
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
        {'community.tagFollows': q => q.where({
          'tag_follows.tag_id': tag.id,
          'tag_follows.user_id': req.session.userId
        })}
      ]})
    })
    .then(ct => {
      if (!ct) return res.notFound()
      return res.ok(merge(
        ct.pick('description', 'community_id'),
        presentWithPost(tag),
        {
          owner: ct.relations.owner.pick('id', 'name', 'avatar_url'),
          followed: ct.relations.community.relations.tagFollows.length > 0,
          created: ct.relations.owner.id === req.session.userId
        }
      ))
    })
    .catch(res.serverError)
  },

  findFollowed: function (req, res) {
    return Community.find(req.param('communityId'))
    .then(com => fetchAndPresentFollowed(com.id, req.session.userId))
    .then(res.ok, res.serverError)
  },

  findForLeftNav: function (req, res) {
    return Community.find(req.param('communityId'))
    .then(com => fetchAndPresentForLeftNav(com.id, req.session.userId))
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

  resetNewPostCount: function (req, res) {
    return Promise.join(
      Tag.find(req.param('tagName')),
      Community.find(req.param('communityId')),
      (tag, community) =>
        TagFollow.where({
          user_id: req.session.userId,
          tag_id: tag.id,
          community_id: community.id
        }).fetch()
        .then(tf => tf && tf.save({new_post_count: 0})))
    .then(res.ok)
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

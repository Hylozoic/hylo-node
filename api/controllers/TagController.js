import { pick } from 'lodash'
import { get, some } from 'lodash/fp'
import {
  fetchAndPresentForCommunity,
  fetchAndPresentSummary,
  presentTag
} from '../services/TagPresenter'
import { countTotal } from '../../lib/util/knex'

module.exports = {
  findOne: function (req, res) {
    return Tag.find(req.param('tagName'))
    .tap(tag => tag && TagFollow.where({
      user_id: req.session.userId,
      tag_id: tag.id
    }).query().update({new_post_count: 0}))
    .then(tag => tag ? res.ok(presentTag(tag)) : res.notFound())
    .catch(res.serverError)
  },

  findOneInCommunity: function (req, res) {
    let tag, communityTag, follows
    const { userId } = req.session

    return Tag.find(req.param('tagName'))
    .then(t => {
      if (!t) return res.notFound()
      tag = t
      return CommunityTag
      .where({community_id: res.locals.community.id, tag_id: tag.id})
      .fetch({withRelated: 'owner'}).then(ct => { communityTag = ct })
      .tap(() => TagFollow.query(q => {
        q.where({
          community_id: res.locals.community.id,
          tag_id: tag.id
        })
        q.limit(20)
        countTotal(q, 'tag_follows')

        // make sure the current user's follow, if it exists, doesn't get cut
        // off by the limit, so we know if the user is following the tag
        if (userId) {
          q.orderBy(bookshelf.knex.raw(`case
            when tag_follows.user_id = ${userId} then 0
            else id end`))
        }
      }).fetchAll({withRelated: 'user'}).then(tf => { follows = tf }))
      .tap(() => userId &&
        TagFollow.where({user_id: userId, tag_id: t.id})
        .query().update({new_post_count: 0}))
      .then(() => {
        const { owner } = get('relations', communityTag) || {}
        const followers = follows.models.map(tf =>
          tf.relations.user.pick('id', 'name', 'avatar_url'))
        return res.ok(Object.assign(
          {
            followers,
            followed: some(f => f.id === userId, followers),
            followerCount: follows.first() ? follows.first().get('total') : 0,
            owner: owner ? owner.pick('id', 'name', 'avatar_url') : null,
            created: get('id', owner) === userId
          },
          presentTag(tag),
          communityTag ? communityTag.pick('description', 'is_default', 'community_id') : null
        ))
      })
    })
    .catch(res.serverError)
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
      (tag, community) =>
        TagFollow.toggle(
          tag.id,
          req.session.userId,
          community.id
        ).then(res.ok, res.serverError)
    )
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
      .tap(tag => TagFollow.add({
        communityId: community.id,
        tagId: tag.id,
        userId: req.session.userId,
        transacting: trx
      }))
      .tap(tag => new CommunityTag({
        tag_id: tag.id,
        community_id: community.id,
        description,
        user_id: req.session.userId,
        is_default
      }).save(null, trxOpts))
    })
    .then(tag => res.ok({id: tag.id}))
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

import { filter, includes, map } from 'lodash'

var fetchAndPresentTagJoins = (joinClass, communityId, userId) =>
  joinClass.where({community_id: communityId, user_id: userId})
  .fetchAll({withRelated: 'tag'})
  .then(joins =>
    joins.map(join => ({
      name: join.relations.tag.get('name')
    })))

var fetchAndPresentFollowed = (communityId, userId) =>
  fetchAndPresentTagJoins(TagFollow, communityId, userId)

var fetchAndPresentCreated = (communityId, userId) =>
  fetchAndPresentTagJoins(CommunityTag, communityId, userId)

module.exports = {

  findOne: function (req, res) {
    return Tag.find(req.param('tagName'))
    .then(tag => {
      if (!tag) return res.notFound()
      return CommunityTag.where({community_id: res.locals.community.id, tag_id: tag.id})
      .fetch({withRelated: [
        'owner',
        {'community.tagFollows': qb =>
            qb.where({'tag_follows.tag_id': tag.id, 'tag_follows.user_id': req.session.userId})}
      ]})
      .then(communityTag => {
        var result = communityTag.pick('id', 'description', 'community_id')
        result.name = tag.get('name')
        result.owner = communityTag.relations.owner.pick('id', 'name', 'avatar_url')
        result.followed = communityTag.relations.community.relations.tagFollows.length > 0
        result.created = result.owner.id === req.session.userId
        return result
      })
      .then(res.ok)
      .catch(res.serverError)
    })
  },

  findFollowed: function (req, res) {
    return Community.find(req.param('communityId'))
    .then(com => fetchAndPresentFollowed(com.id, req.session.userId))
    .then(res.ok)
    .catch(res.serverError)
  },

  findForLeftNav: function (req, res) {
    return Community.find(req.param('communityId'))
    .then(com => Promise.join(
      fetchAndPresentFollowed(com.id, req.session.userId),
      fetchAndPresentCreated(com.id, req.session.userId),
      (followed, created) => ({
        followed: filter(followed, f => !includes(map(created, 'name'), f.name)),
        created
      })
    ))
    .then(res.ok)
    .catch(res.serverError)
  },

  follow: function (req, res) {
    return Promise.join(
      Tag.find(req.param('tagName')),
      Community.find(req.param('communityId')),
      (tag, community) => {
        if (!tag) return res.notFound()

        return TagFollow.where({
          community_id: community.id,
          tag_id: tag.id,
          user_id: req.session.userId
        }).fetch()
        .then(tagFollow => {
          return tagFollow
            ? tagFollow.destroy()
            : new TagFollow({
              community_id: community.id,
              tag_id: tag.id,
              user_id: req.session.userId
            })
            .save()
        })
      })
    .then(res.ok)
    .catch(res.serverError)
  }
}

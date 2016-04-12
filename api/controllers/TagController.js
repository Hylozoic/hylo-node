var fetchAndPresentFollowed = (communityId, userId) =>
  FollowedTag.where({community_id: communityId, user_id: userId})
  .fetchAll({withRelated: 'tag'})
  .then(followedTags =>
    followedTags.map(followedTag => ({
      name: followedTag.relations.tag.get('name')
    })))

var fetchAndPresentCreated = (communityId, userId) =>
  CommunityTag.where({community_id: communityId, owner_id: userId})
  .fetchAll({withRelated: 'tag'})
  .then(createdTags =>
    createdTags.map(createdTag => ({
      name: createdTag.relations.tag.get('name')
    })))

module.exports = {

  findOne: function (req, res) {
    return Tag.find(req.param('tagName'))
    .then(tag => {
      if (!tag) return res.notFound()
      return CommunityTag.where({community_id: res.locals.community.id, tag_id: tag.id})
      .fetch({withRelated: ['owner', 'community.followedTags']})
      .then(communityTag => {
        var result = communityTag.pick('id', 'description', 'community_id')
        result.name = tag.get('name')
        result.owner = communityTag.relations.owner.pick('id', 'name', 'avatar_url')
        result.followed = !!communityTag.relations.community.relations.followedTags.find(ft => {
          return ft.get('user_id') === req.session.userId &&
          Number(ft.get('tag_id')) === tag.id
        })

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
        followed: _.filter(followed, f => !_.includes(_.map(created, 'name'), f.name)),
        created: created
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

        return FollowedTag.where({
          community_id: community.id,
          tag_id: tag.id,
          user_id: req.session.userId
        }).fetch()
        .then(followedTag => {
          if (followedTag) {
            return followedTag.destroy()
          } else {
            return new FollowedTag({
              community_id: community.id,
              tag_id: tag.id,
              user_id: req.session.userId
            })
            .save()
          }
        })
      })
    .then(res.ok)
    .catch(res.serverError)
  }
}

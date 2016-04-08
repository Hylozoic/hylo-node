module.exports = {

  findOne: function (req, res) {
    return Tag.find(req.param('tagName'))
    .then(tag => {
      if (!tag) return res.notFound()
      return Promise.join(
        CommunityTag.where({community_id: res.locals.community.id, tag_id: tag.id})
        .fetch({withRelated: 'owner'}),
        FollowedTag.where({community_id: res.locals.community.id, tag_id: tag.id, user_id: req.session.userId})
        .fetch(),
        (communityTag, followedTag) => {
          var result = communityTag.pick('id', 'description', 'community_id')
          result.name = tag.get('name')
          result.owner = communityTag.relations.owner.pick('id', 'name', 'avatar_url')
          result.followed = !!followedTag
          return result
        })
      .then(res.ok)
      .catch(res.serverError)
    })
  },

  findFollowed: function (req, res) {
    return res.ok({})
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

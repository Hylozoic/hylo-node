module.exports = {

  findOne: function (req, res) {
    return Tag.find(req.param('tagName'))
    .then(tag => {
      if (!tag) return res.notFound()
      return CommunityTag.where({community_id: res.locals.community.id, tag_id: tag.id})
      .fetch({withRelated: 'owner'})
      .then(communityTag => {
        var result = communityTag.pick('id', 'description', 'community_id')
        result.name = tag.get('name')
        result.owner = communityTag.relations.owner.pick('id', 'name', 'avatar_url')
        return result
      })
      .then(res.ok)
      .catch(res.serverError)
    })
  }
}

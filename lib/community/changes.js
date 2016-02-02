var Promise = require('bluebird')

module.exports = {
  changedCommunities: function (startTime, endTime) {
    return Promise.join(
      // new members
      User.createdInTimeRange(startTime, endTime)
      .fetchAll({withRelated: ['memberships']}),

      // new posts
      Post.createdInTimeRange(startTime, endTime)
      .query(qb => qb.where('post.type', '!=', 'welcome'))
      .fetchAll({withRelated: [
        {communities: qb => qb.column('community.id')}
      ]}),

      // new comments
      Comment.createdInTimeRange(startTime, endTime)
      .query(qb => {
        qb.join('post', function () {
          this.on('post.id', 'comment.post_id')
        })
        qb.where('post.type', '!=', 'welcome')
      })
      .fetchAll({withRelated: [
        {post: qb => qb.column('id')},
        {'post.communities': qb => qb.column('community.id')}
      ]})
    ).spread(function (users, posts, comments) {
      var communityIds = []

      users.each(u => {
        var ids = u.relations.memberships.where({active: true}).map(m => m.get('community_id'))
        communityIds.push(ids)
      })

      posts.each(p => {
        var ids = p.relations.communities.map('id')
        communityIds.push(ids)
      })

      comments.each(c => {
        var ids = c.relations.post.relations.communities.map('id')
        communityIds.push(ids)
      })

      return _.union.apply(_, communityIds).sort((a, b) => a > b)
    })
  }

}

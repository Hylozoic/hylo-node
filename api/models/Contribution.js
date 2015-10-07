module.exports = bookshelf.Model.extend({
  tableName: 'contributor',

  post: function () {
    return this.belongsTo(Post, 'post_id')
  },

  user: function () {
    return this.belongsTo(User, 'user_id').query({where: {active: true}})
  }

}, {
  queryForUser: function (userId, communityIds) {
    return Contribution.query(q => {
      q.orderBy('date_contributed')
      q.join('post', 'post.id', '=', 'contributor.post_id')

      q.where({'contributor.user_id': userId, 'post.active': true})

      if (communityIds) {
        q.join('post_community', 'post_community.post_id', '=', 'post.id')
        q.join('community', 'community.id', '=', 'post_community.community_id')
        q.whereIn('community.id', communityIds)
      }
    })
  },

  countForUser: function (user) {
    return this.query().count()
    .where({
      'contributor.user_id': user.id,
      'post.active': true
    })
    .join('post', function () {
      this.on('post.id', '=', 'contributor.post_id')
    })
    .then(function (rows) {
      return rows[0].count
    })
  }

})

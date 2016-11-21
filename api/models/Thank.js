module.exports = bookshelf.Model.extend({
  tableName: 'thank_you',

  comment: function () {
    return this.belongsTo(Comment)
  },

  user: function () {
    return this.belongsTo(User).query({where: {active: true}})
  },

  thankedBy: function () {
    return this.belongsTo(User, 'thanked_by_id')
  }

}, {
  queryForUser: function (userId, communityIds) {
    return Thank.query(q => {
      q.orderBy('date_thanked')
      q.join('comments', 'comments.id', '=', 'thank_you.comment_id')
      q.join('post', 'post.id', '=', 'comments.post_id')

      q.where({
        'comments.user_id': userId,
        'comments.active': true,
        'post.active': true
      })

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
      'thank_you.user_id': user.id,
      'comments.active': true
    })
    .join('comments', function () {
      this.on('comments.id', '=', 'thank_you.comment_id')
    })
    .then(function (rows) {
      return rows[0].count
    })
  },

  create: function (comment, userId) {
    return new Thank({
      thanked_by_id: userId,
      comment_id: comment.get('id'),
      user_id: comment.get('user_id'),
      date_thanked: new Date()
    }).save()
  }

})

module.exports = bookshelf.Model.extend({
  tableName: 'thanks',

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
      q.join('comments', 'comments.id', '=', 'thanks.comment_id')
      q.join('posts', 'posts.id', '=', 'comments.post_id')

      q.where({
        'comments.user_id': userId,
        'comments.active': true,
        'posts.active': true
      })

      if (communityIds) {
        q.join('post_community', 'post_community.post_id', '=', 'posts.id')
        q.join('communities', 'communities.id', '=', 'post_community.community_id')
        q.whereIn('communities.id', communityIds)
      }
    })
  },

  countForUser: function (user) {
    return this.query().count()
    .where({
      'thanks.user_id': user.id,
      'comments.active': true
    })
    .join('comments', function () {
      this.on('comments.id', '=', 'thanks.comment_id')
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

module.exports = bookshelf.Model.extend({
  tableName: 'contributor',

  post: function() {
    return this.belongsTo(Post, 'post_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id").query({where: {active: true}});
  }

}, {

  countForUser: function(user) {
    return this.query().count()
    .where({
      'contributor.user_id': user.id,
      'post.active': true
    })
    .join('post', function() {
      this.on('post.id', '=', 'contributor.post_id')
    })
    .then(function(rows) {
      return rows[0].count;
    });
  }

});

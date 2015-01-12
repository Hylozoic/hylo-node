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
    return bookshelf.knex('contributor').count().where({user_id: user.id}).then(function(rows) {
      return rows[0].count;
    });
  }

});

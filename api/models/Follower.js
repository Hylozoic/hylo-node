var Promise = require('bluebird');

module.exports = bookshelf.Model.extend({
  tableName: 'follower',

  post: function() {
    return this.belongsTo(Post, 'post_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id").query({where: {active: true}})
  }

}, {
  getFollowers: function(postId) {
    return bookshelf.knex("follower").where({
      post_id: postId
    });
  },

  addFollower: function(postId, followerId, addedById, options) {
    // TODO add validation to make sure follower is a member of the community that the post belongs to.
    return Follower.where({post_id: postId, user_id: followerId})
      .fetch(_.pick(options, "transacting"))
      .then(function(existingFollower) {
        if (existingFollower) {
          sails.log.debug("user already following post... returning follower");
          return Promise.resolve(existingFollower);
        } else {
          return new Follower({
            post_id: postId,
            date_added: new Date(),
            user_id: followerId,
            added_by_id: addedById
          }).save(null, options);
        }
      });
  }
});

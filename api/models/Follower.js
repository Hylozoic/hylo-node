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

  create: function(postId, options) {
    // TODO add validation to make sure follower is a member of the community that the post belongs to.
    return Follower.where({post_id: postId, user_id: options.followerId})
      .fetch(_.pick(options, "transacting"))
      .then(function(existingFollower) {
        if (existingFollower) {
          sails.log.error("user is already following post!");
          return Promise.resolve(existingFollower);
        } else {
          return new Follower({
            post_id: postId,
            date_added: new Date(),
            user_id: options.followerId,
            added_by_id: options.addedById
          }).save(null, _.pick(options, "transacting"));
        }
      });
  }
});

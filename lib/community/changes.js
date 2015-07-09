var Promise = require('bluebird');

module.exports = {

  changedCommunities: function(startTime, endTime) {

    return Promise.join(
      // new members
      User.createdInTimeRange(startTime, endTime).fetchAll({withRelated: ['memberships']}),

      // new posts
      Post.createdInTimeRange(startTime, endTime)
      .query(qb => qb.where('post.type', '!=', 'welcome'))
      .fetchAll({withRelated: [
        {communities: function(qb) {
          qb.column('id');
        }}
      ]}),

      // new comments
      Comment.createdInTimeRange(startTime, endTime)
      .query(qb => {
        qb.join('post', () => this.on('post.id', 'comment.post_id'));
        qb.where('post.type', '!=', 'welcome');
      })
      .fetchAll({withRelated: [
        {post: function(qb) {
          qb.column('id');
        }},
        {'post.communities': function(qb) {
          qb.column('id');
        }}
      ]})
    ).spread(function(users, posts, comments) {

      var communityIds = [];

      users.each(function(u) {
        var ids = u.relations.memberships.map(function(m) { return m.get('community_id') });
        communityIds.push(ids);
      });

      posts.each(function(s) {
        var ids = s.relations.communities.map('id');
        communityIds.push(ids);
      });

      comments.each(function(c) {
        var ids = c.relations.post.relations.communities.map('id');
        communityIds.push(ids);
      });

      var idSet = _.union.apply(_, communityIds).sort(function(a, b) { return a > b });
      return idSet;
    });

  }

};

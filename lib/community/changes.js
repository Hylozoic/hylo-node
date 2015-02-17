var format = require('util').format,
  Promise = require('bluebird');

var Changes = {

  changedCommunities: function(startTime, endTime) {

    return Promise.join(
      // new members
      User.createdInTimeRange(startTime, endTime)
      .fetchAll({withRelated: ['memberships']}),

      // new seeds
      Post.createdInTimeRange(startTime, endTime)
      .fetchAll({withRelated: [
        {communities: function(qb) {
          qb.column('id');
        }}
      ]}),

      // new comments
      Comment.createdInTimeRange(startTime, endTime)
      .fetchAll({withRelated: [
        {post: function(qb) {
          qb.column('id');
        }},
        {'post.communities': function(qb) {
          qb.column('id');
        }}
      ]})
    )
    .spread(function(users, seeds, comments) {

      var communityIds = [];

      users.each(function(u) {
        var ids = u.relations.memberships.map(function(m) { return m.get('community_id') });
        communityIds.push(ids);
      });

      seeds.each(function(s) {
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

module.exports = Changes;
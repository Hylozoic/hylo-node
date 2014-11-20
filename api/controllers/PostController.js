module.exports = {
  find: function(req, res) {
    var params = _.pick(req.allParams(), ['sort', 'limit', 'start', 'postType']),
      sortCol = (params.sort == 'top' ? 'num_votes' : 'last_updated');

    Community.withId(req.param('id')).then(function(community) {

      // weird:
      //
      // if i just do community.posts().fetch(), it runs:
      //
      //   select "post".*, "post_community"."community_id" as "_pivot_community_id", "post_community"."post_id" as "_pivot_post_id"
      //   from "post" inner join "post_community" on "post_community"."post_id" = "post"."id"
      //   where "post_community"."community_id" = $1
      //
      // but if i add other clauses as below, it drops the join and runs:
      //
      //   select * from "post" where "type" = $1 order by "last_updated" desc limit $2 offset $3

      var query = community.posts().query();
      if (params.postType && params.postType != 'all') {
        query = query.where({type: params.postType});
      }
      query.orderBy(sortCol, 'desc')
      .limit(params.limit)
      .offset(params.start).then(function(posts) {
        res.ok(posts);
      })
    })
  }
}
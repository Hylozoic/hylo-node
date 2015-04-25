require(require('root-path')('test/setup'));

var format = require('util').format,
  heredoc = require('heredoc'),
  time = require('time');

describe('Search', function() {

  describe('.forSeeds', function() {

    it('produces the expected SQL for a complex query', function() {

      var query = Search.forSeeds({
        limit: 5,
        offset: 7,
        users: [42, 41],
        communities: [9, 12],
        follower: 37,
        term: 'milk toast',
        type: 'request',
        start_time: new Date(1427252052983), // Tue Mar 24 2015 19:54:12 GMT-0700 (PDT)
        end_time: new Date(1427856852983), // Tue Mar 31 2015 19:54:12 GMT-0700 (PDT)
        sort: 'post.last_updated'
      }).query().toString();

      var tz = new time.Date().getTimezone();
      if (tz == 'America/Los_Angeles') {
        var startTime = '2015-03-24 19:54:12.983',
          endTime = '2015-03-31 19:54:12.983';
      } else {
        var startTime = '2015-03-25 02:54:12.983',
          endTime = '2015-04-01 02:54:12.983';
      }

      var expected = format(heredoc.strip(function() {/*
        select *, count(*) over () as total
        from "post"
        inner join "post_community" on "post_community"."post_id" = "post"."id"
        inner join "follower" on "follower"."post_id" = "post"."id"
        where "post"."active" = true
        and "post"."creator_id" in (42, 41)
        and "post_community"."community_id" in (9, 12)
        and (((to_tsvector('english', post.name) @@ to_tsquery('milk:* & toast:*'))
          or (to_tsvector('english', post.description) @@ to_tsquery('milk:* & toast:*'))))
        and "follower"."user_id" = 37
        and "post"."creator_id" != 37
        and "type" = 'request'
        and ((post.creation_date between '%s' and '%s')
          or (post.last_updated between '%s' and '%s'))
        order by "post"."last_updated" desc
        limit 5
        offset 7
      */}).replace(/(\n\s*)/g, ' ').trim(), startTime, endTime, startTime, endTime);

      expect(query).to.equal(expected);
    });

  });

})
require(require('root-path')('test/setup'))

var heredoc = require('heredoc')
var time = require('time')

describe('Search', function () {
  describe('.forPosts', function () {
    it('produces the expected SQL for a complex query', function () {
      var query = Search.forPosts({
        limit: 5,
        offset: 7,
        users: [42, 41],
        communities: [9, 12],
        follower: 37,
        term: 'milk toast',
        type: 'request',
        start_time: new Date(1427252052983), // Tue Mar 24 2015 19:54:12 GMT-0700 (PDT)
        end_time: new Date(1427856852983), // Tue Mar 31 2015 19:54:12 GMT-0700 (PDT)
        sort: 'post.updated_at'
      }).query().toString()

      var tz = new time.Date().getTimezone()
      var startTime, endTime
      if (tz === 'America/Los_Angeles') {
        startTime = '2015-03-24T19:54:12.983-07:00'
        endTime = '2015-03-31T19:54:12.983-07:00'
      } else {
        startTime = '2015-03-25T02:54:12.983+00:00'
        endTime = '2015-04-01T02:54:12.983+00:00'
      }

      var expected = format(heredoc.strip(function () { /*
        select post.*, count(*) over () as total, "post_community"."pinned"
        from "post"
        inner join "follower" on "follower"."post_id" = "post"."id"
        inner join "post_community" on "post_community"."post_id" = "post"."id"
        where "post"."active" = 'true'
        and "post"."user_id" in ('42', '41')
        and (((to_tsvector('english', post.name) @@ to_tsquery('milk:* & toast:*'))
          or (to_tsvector('english', post.description) @@ to_tsquery('milk:* & toast:*'))))
        and "follower"."user_id" = '37'
        and (post.user_id != '37' or post.user_id is null)
        and "type" = 'request'
        and ((post.created_at between '%s' and '%s')
          or (post.updated_at between '%s' and '%s'))
        and "post_community"."community_id" in ('9', '12')
        and "parent_post_id" is null
        group by "post"."id", "post_community"."post_id", "post_community"."pinned"
        order by post_community.pinned desc, post.updated_at desc
        limit '5'
        offset '7'
      */}).replace(/(\n\s*)/g, ' ').trim(), startTime, endTime, startTime, endTime)

      expect(query).to.equal(expected)
    })

    it('excludes welcome posts by default', () => {
      var query = Search.forPosts({communities: 9}).query().toString()
      expect(query).to.contain('("post"."type" != \'welcome\' or "post"."type" is null)')
    })

    it('excludes welcome posts when type is "all"', () => {
      var query = Search.forPosts({communities: 9, type: 'all'}).query().toString()
      expect(query).to.contain('("post"."type" != \'welcome\' or "post"."type" is null)')
    })
  })

  describe('.forUsers', () => {
    var cat, dog, house

    before(() => {
      cat = new User({name: 'Mister Cat', email: 'iam@cat.org', active: true})
      dog = new User({name: 'Mister Dog', email: 'iam@dog.org', active: true})
      house = new Community({name: 'House', slug: 'House'})

      return cat.save()
      .then(() => dog.save())
      .then(() => house.save())
      .then(() => cat.joinCommunity(house))
    })

    it('finds members based on name', () => {
      return Search.forUsers({term: 'mister'}).fetchAll().then(users => {
        expect(users.length).to.equal(2)
      })
    })

    describe('for a community', () => {
      it('finds members', () => {
        return Search.forUsers({term: 'mister', communities: [house.id]}).fetchAll()
        .then(users => {
          expect(users.length).to.equal(1)
          expect(users.first().get('name')).to.equal('Mister Cat')
        })
      })

      it('excludes inactive members', () => {
        return Membership.query().where({
          user_id: cat.id,
          community_id: house.id
        }).update({active: false}).then(() => {
          return Search.forUsers({term: 'mister', communities: [house.id]}).fetchAll().then(users => {
            expect(users.length).to.equal(0)
          })
        })
      })
    })
  })
})

require(require('root-path')('test/setup'))
var heredoc = require('heredoc')
var moment = require('moment-timezone')

describe('Search', function () {
  describe('.forPosts', function () {
    it('produces the expected SQL for a complex query', function () {
      var startTime = moment('2015-03-24 19:54:12-04:00')
      var endTime = moment('2015-03-31 19:54:12-04:00')
      var tz = moment.tz.guess()
      var startTimeAsString = startTime.tz(tz).format('YYYY-MM-DD HH:mm:ss.SSS')
      var endTimeAsString = endTime.tz(tz).format('YYYY-MM-DD HH:mm:ss.SSS')

      var query = Search.forPosts({
        limit: 5,
        offset: 7,
        users: [42, 41],
        communities: [9, 12],
        follower: 37,
        term: 'milk toast',
        type: 'request',
        start_time: startTime.toDate(),
        end_time: endTime.toDate(),
        sort: 'post.updated_at'
      }).query().toString()

      var expected = format(heredoc.strip(function () { /*
        select post.*, count(*) over () as total, "post_community"."pinned"
        from "post"
        inner join "follower" on "follower"."post_id" = "post"."id"
        inner join "post_community" on "post_community"."post_id" = "post"."id"
        where "post"."active" = true
        and "post"."user_id" in (42, 41)
        and (((to_tsvector('english', post.name) @@ to_tsquery('milk:* & toast:*'))
          or (to_tsvector('english', post.description) @@ to_tsquery('milk:* & toast:*'))))
        and "follower"."user_id" = 37
        and (post.user_id != 37 or post.user_id is null)
        and "type" = 'request'
        and ((post.created_at between '%s' and '%s')
          or (post.updated_at between '%s' and '%s'))
        and "post_community"."community_id" in (9, 12)
        and "parent_post_id" is null
        group by "post"."id", "post_community"."post_id", "post_community"."pinned"
        order by "post"."updated_at" desc
        limit 5
        offset 7
      */}).replace(/(\n\s*)/g, ' ').trim(),
      startTimeAsString,
      endTimeAsString,
      startTimeAsString,
      endTimeAsString)

      expect(query).to.equal(expected)
    })

    it('excludes welcome and thread posts by default', () => {
      var query = Search.forPosts({communities: 9}).query().toString()
      expect(query).to.contain('("post"."type" not in (\'welcome\', \'thread\') or "post"."type" is null)')
    })

    it('excludes welcome and thread posts when type is "all"', () => {
      var query = Search.forPosts({communities: 9, type: 'all'}).query().toString()
      expect(query).to.contain('("post"."type" not in (\'welcome\', \'thread\') or "post"."type" is null)')
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

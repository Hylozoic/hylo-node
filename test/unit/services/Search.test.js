import moment from 'moment-timezone'
import { expectEqualQuery } from '../../setup/helpers'
import setup from '../../setup'

describe('Search', function () {
  describe('.forPosts', function () {
    it('produces the expected SQL for a complex query', function () {
      var startTime = moment('2015-03-24 19:54:12-04:00')
      var endTime = moment('2015-03-31 19:54:12-04:00')
      var tz = moment.tz.guess()
      var startTimeAsString = startTime.tz(tz).format('YYYY-MM-DD HH:mm:ss.SSS')
      var endTimeAsString = endTime.tz(tz).format('YYYY-MM-DD HH:mm:ss.SSS')

      const search = Search.forPosts({
        limit: 5,
        offset: 7,
        users: [42, 41],
        communities: [9, 12],
        follower: 37,
        term: 'milk toast',
        type: 'request',
        start_time: startTime.toDate(),
        end_time: endTime.toDate(),
        sort: 'posts.updated_at'
      })

      expectEqualQuery(search, `select posts.*, count(*) over () as total, "communities_posts"."pinned"
        from "posts"
        inner join "follows" on "follows"."post_id" = "posts"."id"
        inner join "communities_posts" on "communities_posts"."post_id" = "posts"."id"
        where "posts"."active" = true
        and "posts"."user_id" in (42, 41)
        and "follows"."user_id" = 37
        and (posts.user_id != 37 or posts.user_id is null)
        and ((posts.created_at between '${startTimeAsString}' and '${endTimeAsString}')
          or (posts.updated_at between '${startTimeAsString}' and '${endTimeAsString}'))
        and "posts"."type" = 'request'
        and (((to_tsvector('english', posts.name) @@ to_tsquery('milk:* & toast:*'))
        or (to_tsvector('english', posts.description) @@ to_tsquery('milk:* & toast:*'))))
        and "communities_posts"."community_id" in (9, 12)
        and "parent_post_id" is null
        group by "posts"."id", "communities_posts"."post_id", "communities_posts"."pinned"
        order by "posts"."updated_at" desc
        limit 5
        offset 7`)
    })

    it('includes only basic post types by default', () => {
      var query = Search.forPosts({communities: 9}).query().toString()
      expect(query).to.contain('("posts"."type" in (\'discussion\', \'request\', \'offer\') or "posts"."type" is null)')
    })

    it('includes only basic post types when type is "all"', () => {
      var query = Search.forPosts({communities: 9, type: 'all'}).query().toString()
      expect(query).to.contain('("posts"."type" in (\'discussion\', \'request\', \'offer\') or "posts"."type" is null)')
    })

    it('accepts an option to change the name of the total column', () => {
      const query = Search.forPosts({totalColumnName: 'wowee'}).query().toString()
      expect(query).to.contain('count(*) over () as wowee')
    })
  })

  describe('.forUsers', () => {
    var cat, dog, catdog, house

    before(() => {
      cat = new User({name: 'Mister Cat', email: 'iam@cat.org', active: true})
      dog = new User({name: 'Mister Dog', email: 'iam@dog.org', active: true})
      catdog = new User({name: 'Cat Dog', email: 'iam@catdog.org', active: true})
      house = new Community({name: 'House', slug: 'House'})

      return setup.clearDb()
      .then(() => cat.save())
      .then(() => dog.save())
      .then(() => catdog.save())
      .then(() => house.save())
      .then(() => cat.joinCommunity(house))
      .then(() => FullTextSearch.dropView().catch(err => {})) // eslint-disable-line handle-callback-err
      .then(() => FullTextSearch.createView())
    })

    function userSearchTests (key) {
      it('finds members based on name', () => {
        return Search.forUsers({[key]: 'mister'}).fetchAll().then(users => {
          expect(users.length).to.equal(2)
        })
      })

      it('doesn\'t find members by letters in the middle or end of their name', () => {
        return Search.forUsers({[key]: 'ister'}).fetchAll().then(users => {
          expect(users.length).to.equal(0)
        })
      })

      it('finds members by the beginning letters of their first or last name', () => {
        return Search.forUsers({[key]: 'Cat'}).fetchAll().then(users => {
          expect(users.length).to.equal(2)
        })
      })
    }

    describe('for autocomplete', () => {
      userSearchTests('autocomplete')
    })

    describe('with a term', () => {
      userSearchTests('term')
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

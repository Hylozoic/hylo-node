import setup from '../../setup'
import mockKnex from 'mock-knex'

describe('Membership', function () {
  var user, community

  describe('.find', function () {
    before(function () {
      community = new Community({slug: 'foo', name: 'Foo'})
      user = new User({name: 'Cat', email: 'a@b.c'})
      return setup.clearDb().then(function () {
        return Promise.join(
          community.save(),
          user.save()
        )
      }).then(function () {
        return user.joinCommunity(community)
      })
    })

    it('works with a community id', function () {
      return Membership.find(user.id, community.id).then(function (membership) {
        expect(membership).to.exist
      })
    })

    it('works with a community slug', function () {
      return Membership.find(user.id, community.get('slug')).then(function (membership) {
        expect(membership).to.exist
      })
    })

    it('returns nothing for a blank user id', function () {
      return Membership.find(null, community.id).then(function (membership) {
        expect(membership).not.to.exist
      })
    })

    it('does not return an inactive membership', function () {
      return Membership.query().where({
        user_id: user.id,
        community_id: community.id
      }).update({active: false}).then(() => {
        return Membership.find(user.id, community.id)
      }).then(membership => {
        expect(membership).not.to.exist
      })
    })
  })

  describe('.create', function () {
    var tag
    before(function () {
      community = new Community({slug: 'bar', name: 'bar'})
      user = new User({name: 'Dog', email: 'b@c.d'})
      tag = new Tag({name: 'hello'})
      return Promise.join(
        community.save(),
        user.save(),
        tag.save()
      )
      .then(() => CommunityTag.create({
        tag_id: tag.id,
        community_id: community.id,
        is_default: true
      }))
    })

    it('creates tag follows for default tags', function () {
      return Membership.create(user.id, community.id, {role: Membership.DEFAULT_ROLE})
      .then(() => user.load('followedTags'))
      .then(() => {
        expect(user.relations.followedTags.length).to.equal(1)
        var tagNames = user.relations.followedTags.map(t => t.get('name'))
        expect(tagNames[0]).to.equal('hello')
      })
    })
  })

  describe('.inAllCommunities', () => {
    var tracker

    beforeEach(() => {
      user = {id: 5}
      mockKnex.mock(bookshelf.knex)
      tracker = mockKnex.getTracker()
      tracker.install()
      tracker.on('query', (query, step) => {
        const { sql, bindings } = query

        if (sql.match(/^select "community_id" from "communities_users"/)) {
          return query.response([{community_id: '1'}, {community_id: '2'}])
        }

        if (sql.match(/^select "network_id" from "communities"/) &&
          ['4', '5'].includes(bindings[0])) {
          return query.response([{network_id: '1'}])
        }

        if (sql.match(/^select distinct "network_id", "network_id" from "communities"/)) {
          return query.response([{network_id: '1'}])
        }

        query.response([])
      })
    })

    afterEach(() => {
      tracker.uninstall()
      mockKnex.unmock(bookshelf.knex)
    })

    it('is true if the user is in all communities', () => {
      return Membership.inAllCommunities(5, ['1', '2'])
      .then(result => expect(result).to.be.true)
    })

    it('is false if the user is not in all communities', () => {
      return Membership.inAllCommunities(5, ['1', '2', '3'])
      .then(result => expect(result).to.be.false)
    })

    it("is true if the user is in a community's network", () => {
      return Membership.inAllCommunities(5, ['4', '5'])
      .then(result => expect(result).to.be.true)
    })
  })
})

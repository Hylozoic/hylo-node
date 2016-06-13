var setup = require(require('root-path')('test/setup'))

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
    before(function () {
      community = new Community({slug: 'bar', name: 'bar'})
      user = new User({name: 'Dog', email: 'b@c.d'})
      return Promise.join(
        community.save(),
        user.save(),
        Tag.createDefaultTags())
    })

    it('creates tag follows for default tags', function () {
      return Membership.create(user.id, community.id, {role: Membership.DEFAULT_ROLE})
      .then(() => user.load('followedTags'))
      .then(() => {
        expect(user.relations.followedTags.length).to.equal(3)
        var tagNames = user.relations.followedTags.map(t => t.get('name'))
        expect(_.includes(tagNames, 'offer')).to.deep.equal(true)
        expect(_.includes(tagNames, 'request')).to.deep.equal(true)
        expect(_.includes(tagNames, 'intention')).to.deep.equal(true)
      })
    })
  })
})

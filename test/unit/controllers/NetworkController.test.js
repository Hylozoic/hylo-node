var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var NetworkController = require(root('api/controllers/NetworkController'))

describe('NetworkController', () => {
  var req, res, fixtures

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    return setup.clearDb()
      .then(() => Promise.props({
        u1: new User({name: 'U1'}).save(),
        c1: new Community({name: 'Moderated C1', slug: 'c1'}).save(),
        c2: new Community({name: 'Moderated C2', slug: 'c2'}).save(),
        c3: new Community({name: 'Unmoderated C3', slug: 'c3'}).save(),
        c4: new Community({name: 'Unmoderated C4', slug: 'c4'}).save()
      })
      .then(props => fixtures = props))
      .then(() => Membership.create(fixtures.u1.id, fixtures.c1.id, {role: Membership.MODERATOR_ROLE}))
      .then(() => Membership.create(fixtures.u1.id, fixtures.c2.id, {role: Membership.MODERATOR_ROLE}))
  })

  describe('#create', () => {
    it('works', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {name: 'Foo', slug: 'foo', description: 'abcde', avatar_url: 'http://bar.com/a.jpg', banner_url: 'http://baz.com/b.jpg', communities: [fixtures.c1.id]})

      return NetworkController.create(req, res)
      .then(() => Network.find('foo', {withRelated: ['communities']}))
      .then(network => {
        expect(network).to.exist
        expect(network.get('name')).to.equal('Foo')
        expect(network.get('slug')).to.equal('foo')
        expect(network.get('description')).to.equal('abcde')
        expect(network.get('avatar_url')).to.equal('http://bar.com/a.jpg')
        expect(network.get('banner_url')).to.equal('http://baz.com/b.jpg')
        expect(network.relations.communities.first().id).to.equal(fixtures.c1.id)
      })
    })

    it('only adds communities you are a moderator of', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {name: 'Bar', slug: 'bar', description: 'abcde', avatar_url: 'http://bar.com/a.jpg', banner_url: 'http://baz.com/b.jpg', communities: [fixtures.c1.id, fixtures.c4.id]})

      return NetworkController.create(req, res)
      .then(() => Network.find('bar', {withRelated: ['communities']}))
      .then(network => {
        expect(network).to.exist
        expect(network.get('slug')).to.equal('bar')
        expect(_.find(network.relations.communities.models, c => c.id === fixtures.c1.id)).to.not.equal(undefined)
        expect(_.find(network.relations.communities.models, c => c.id === fixtures.c4.id)).to.equal(undefined)
      })
    })
  })

  describe('#update', () => {
    it('works', () => {
      req.session.userId = fixtures.u1.id
      req.user = {email: 'admin@hylo.com'}

      _.extend(req.params, {networkId: 'prefoo', name: 'Foo', slug: 'foo', description: 'abcde', avatar_url: 'http://bar.com/a.jpg', banner_url: 'http://baz.com/b.jpg', communities: []})
      return new Network({name: 'PreFoo', slug: 'prefoo', description: 'preabcde', avatar_url: 'http://prebar.com/prea.jpg', banner_url: 'http://prebaz.com/preb.jpg'}).save()
      .then(() => NetworkController.update(req, res))
      .then(() => Network.find('foo', {withRelated: ['communities']}))
      .then(network => {
        expect(network).to.exist
        expect(network.get('name')).to.equal('Foo')
        expect(network.get('slug')).to.equal('foo')
        expect(network.get('description')).to.equal('abcde')
        expect(network.get('avatar_url')).to.equal('http://bar.com/a.jpg')
        expect(network.get('banner_url')).to.equal('http://baz.com/b.jpg')
      })
    })

    it.skip('updates communities you are a moderator of', () => {
      // this test is currently broken because you can only update networks if you're an admin, but then you can update ALL
      // communities. Leaving the code here for when Network moderators are a thing.
      req.session.userId = fixtures.u1.id
      req.user = {email: 'admin@hylo.com'}

      // u1 is moderator of c1 and c2. foo network contains c1 and c3 to begin.
      // The update tries to add c2 and c4 and remove c1 and c3.
      // It adds c2 and removes c1, resulting in c2 and c3 being part of the network

      _.extend(req.params, {networkId: 'foo', name: 'Updated Foo', communities: [fixtures.c2.id, fixtures.c4.id]})

      return new Network({name: 'Foo', slug: 'foo', description: 'abcde', avatar_url: 'http://prebar.com/prea.jpg', banner_url: 'http://prebaz.com/preb.jpg'}).save()
      .then(network => Promise.join(
        fixtures.c1.save({network_id: network.id}, {patch: true}),
        fixtures.c3.save({network_id: network.id}, {patch: true})
      ))
      .then(() => NetworkController.update(req, res))
      .then(() => Network.find('foo', {withRelated: ['communities']}))
      .then(network => {
        expect(network).to.exist
        expect(network.get('slug')).to.equal('foo')
        var communityIds = network.relations.communities.pluck('id')
        expect(_.includes(communityIds, fixtures.c1.id)).to.equal(false)
        expect(_.includes(communityIds, fixtures.c2.id)).to.equal(true)
        expect(_.includes(communityIds, fixtures.c3.id)).to.equal(true)
        expect(_.includes(communityIds, fixtures.c4.id)).to.equal(false)
      })
    })

    it('returns a 403 if you\'re not an admin', () => {
      req.session.userId = fixtures.u1.id

      _.extend(req.params, {networkId: 'prefoo', name: 'Foo', slug: 'foo', description: 'abcde', avatar_url: 'http://bar.com/a.jpg', banner_url: 'http://baz.com/b.jpg', communities: []})
      return new Network({name: 'PreFoo', slug: 'prefoo', description: 'preabcde', avatar_url: 'http://prebar.com/prea.jpg', banner_url: 'http://prebaz.com/preb.jpg'}).save()
      .then(() => NetworkController.update(req, res))
      .then(() => Network.find('prefoo', {withRelated: ['communities']}))
      .then(network => {
        expect(res.statusCode).to.equal(403)
        expect(network).to.exist
        expect(network.get('name')).to.equal('PreFoo')
        expect(network.get('slug')).to.equal('prefoo')
        expect(network.get('description')).to.equal('preabcde')
        expect(network.get('avatar_url')).to.equal('http://prebar.com/prea.jpg')
        expect(network.get('banner_url')).to.equal('http://prebaz.com/preb.jpg')
      })
    })
  })
})

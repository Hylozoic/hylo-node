var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var NetworkController = require(root('api/controllers/NetworkController'))

describe('NetworkController', () => {
  var req, res, fixtures

  before(() =>
  setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1'}).save(),
      c1: new Community({name: 'C1', slug: 'c1'}).save()
    }))
    .then(props => fixtures = props))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
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
  })
})

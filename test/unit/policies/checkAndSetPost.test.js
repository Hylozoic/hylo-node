var setup = require(require('root-path')('test/setup'))
var checkAndSetPost = require(require('root-path')('api/policies/checkAndSetPost'))
describe('checkAndSetPost', function () {
  var fixtures, req, res, next

  before(function () {
    return setup.clearDb().then(function () {
      return Promise.props({
        u1: new User({name: 'U1'}).save(),
        c1: new Community({name: 'C1', slug: 'c1'}).save(),
        c2: new Community({name: 'C2', slug: 'c2'}).save(),
        p1: new Post({name: 'P1', active: true}).save(),
        p2: new Post({name: 'P2', active: true}).save()
      })
    })
    .then(function (props) {
      fixtures = props
      return Promise.props({
        pc1: props.c1.posts().attach(props.p1.id),
        pc2: props.c2.posts().attach(props.p2.id),
        m1: Membership.create(props.u1.id, props.c1.id)
      })
    })
    .then(function (props) {
      fixtures.m1 = props.m1
    })
  })

  describe('with a userId', function () {
    before(function () {
      req = {
        session: {userId: fixtures.u1.id}
      }
    })

    beforeEach(function () {
      next = spy()
    })

    it('returns 404 given a null postId request param', () => {
      req.param = function (name) {
        if (name === 'postId') return null
      }

      res = {
        locals: {},
        notFound: spy(function () {})
      }

      return checkAndSetPost(req, res, next)
      .then(() => expect(res.notFound).to.have.been.called())
    })

    it('allows access to a joined community', () => {
      req.param = function (name) {
        if (name === 'postId') return fixtures.p1.id
      }

      res = {
        locals: {},
        forbidden: spy(function () {})
      }

      return checkAndSetPost(req, res, next)
      .then(() => expect(next).to.have.been.called())
    })

    it('denies access to other communities', () => {
      req.param = function (name) {
        if (name === 'postId') return fixtures.p2.id
      }

      res = {
        locals: {},
        forbidden: spy(function () {})
      }

      return checkAndSetPost(req, res, next)
      .then(() => {
        expect(next).to.not.have.been.called()
        expect(res.forbidden).to.have.been.called()
      })
    })
  })
})

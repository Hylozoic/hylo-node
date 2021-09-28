var setup = require(require('root-path')('test/setup'))
var checkAndSetPost = require(require('root-path')('api/policies/checkAndSetPost'))
describe('checkAndSetPost', function () {
  var fixtures, req, res, next

  before(function () {
    return setup.clearDb().then(function () {
      return Promise.props({
        u1: new User({name: 'U1', email: 'a@b.c'}).save(),
        g1: new Group({name: 'G1', slug: 'g1', group_data_type: 1}).save(),
        g2: new Group({name: 'G2', slug: 'g2', group_data_type: 1}).save(),
        p1: new Post({name: 'P1', active: true}).save(),
        p2: new Post({name: 'P2', active: true}).save()
      })
    })
    .then(function (props) {
      fixtures = props
      return Promise.props({
        pg1: props.g1.posts().attach(props.p1.id),
        pg2: props.g2.posts().attach(props.p2.id)
      })
    })
    .then(() => fixtures.g1.addMembers([fixtures.u1.id]))
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

    it('allows access to a joined group', () => {
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

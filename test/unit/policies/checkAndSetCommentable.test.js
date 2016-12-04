const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const checkAndSetCommentable = require(rootPath('api/policies/checkAndSetCommentable'))
describe('checkAndSetCommentable', () => {
  var fixtures, req, res, next

  before(() => {
    return setup.clearDb().then(() => {
      return Promise.props({
        u1: new User({name: 'U1', email: 'a@b.c'}).save(),
        c1: new Community({name: 'C1', slug: 'c1'}).save(),
        c2: new Community({name: 'C2', slug: 'c2'}).save(),
        p1: new Post({name: 'P1', active: true}).save(),
        p2: new Post({name: 'P2', active: true}).save()
      })
    })
    .then(props => {
      fixtures = props
      return Promise.props({
        cm1: factories.comment({post_id: fixtures.p1.id}).save(),
        cm2: factories.comment({post_id: fixtures.p2.id}).save(),
        pc1: props.c1.posts().attach(fixtures.p1.id),
        pc2: props.c2.posts().attach(fixtures.p2.id),
        m1: Membership.create(fixtures.u1.id, fixtures.c1.id)
      })
    })
    .then(props => {
      fixtures.cm1 = props.cm1
      fixtures.cm2 = props.cm2
    })
  })

  describe('with a userId', () => {
    before(() => {
      req = {
        session: {userId: fixtures.u1.id}
      }
    })

    beforeEach(() => {
      next = spy()
    })

    it('returns 404 given a null postId and null commentId request param', () => {
      req.param = name => {
        if (name === 'postId') return null
        if (name === 'commentId') return null
      }

      res = {
        locals: {},
        notFound: spy(() => {})
      }

      return checkAndSetCommentable(req, res, next)
      .then(() => expect(res.notFound).to.have.been.called())
    })

    it('returns Bad Request given both postId and commentId request params', () => {
      req.param = name => {
        if (name === 'postId') return 1
        if (name === 'commentId') return 2
      }

      res = {
        locals: {},
        badRequest: spy(() => {})
      }

      return checkAndSetCommentable(req, res, next)
      .then(() => expect(res.badRequest).to.have.been.called())
    })

    it('allows access to a post in a joined community', () => {
      req.param = name => {
        if (name === 'postId') return fixtures.p1.id
      }

      res = {
        locals: {},
        forbidden: spy(() => {})
      }

      return checkAndSetCommentable(req, res, next)
      .then(() => expect(next).to.have.been.called())
    })

    it('allows access to a comment in a joined community', () => {
      req.param = name => {
        if (name === 'commentId') return fixtures.cm1.id
      }

      res = {
        locals: {},
        forbidden: spy(() => {})
      }

      return checkAndSetCommentable(req, res, next)
      .then(() => expect(next).to.have.been.called())
    })

    it('denies access to a post in another community', () => {
      req.param = name => {
        if (name === 'postId') return fixtures.p2.id
      }

      res = {
        locals: {},
        forbidden: spy(() => {})
      }

      return checkAndSetCommentable(req, res, next)
      .then(() => {
        expect(next).to.not.have.been.called()
        expect(res.forbidden).to.have.been.called()
      })
    })

    it('denies access to a comment in another community', () => {
      req.param = name => {
        if (name === 'commentId') return fixtures.cm2.id
      }

      res = {
        locals: {},
        forbidden: spy(() => {})
      }

      return checkAndSetCommentable(req, res, next)
      .then(() => {
        expect(next).to.not.have.been.called()
        expect(res.forbidden).to.have.been.called()
      })
    })
  })
})

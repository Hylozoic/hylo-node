const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const setComment = require(rootPath('api/policies/setComment'))
describe('setComment', () => {
  var fixtures, req, res, next

  before(() => {
    req = {}
    return setup.clearDb().then(() => {
      return Promise.props({
        u1: new User({name: 'U1', email: 'a@b.c'}).save(),
        c1: new Community({name: 'C1', slug: 'c1'}).save(),
        p1: new Post({name: 'P1', active: true}).save()
      })
    })
    .then(props => {
      fixtures = props
      return Promise.props({
        cm1: factories.comment({post_id: fixtures.p1.id}).save()
      })
    })
    .then(props => {
      fixtures.cm1 = props.cm1
    })
  })

  beforeEach(() => {
    next = spy()
  })

  it('returns 404 given a bad commentId', () => {
    req.param = name => {
      if (name === 'commentId') return -1
    }

    res = {
      locals: {},
      notFound: spy(() => {})
    }

    return setComment(req, res, next)
    .then(() => expect(res.notFound).to.have.been.called())
  })

  it('sets res.locals.comment', () => {
    req.param = name => {
      if (name === 'commentId') return fixtures.cm1.id
    }

    res = {
      locals: {},
      forbidden: spy(() => {})
    }

    return setComment(req, res, next)
    .then(() => {
      expect(res.locals.comment.id).to.equal(fixtures.cm1.id)
      expect(next).to.have.been.called()
    })
  })
})

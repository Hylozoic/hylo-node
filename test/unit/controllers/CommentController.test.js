const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const CommentController = require(rootPath('api/controllers/CommentController'))

describe('CommentController', function () {
  var fixtures, req, res

  before(() =>
    setup.clearDb().then(() => Promise.props({
      u1: factories.user().save(),
      u2: factories.user().save(),
      u3: factories.user().save(),
      p1: factories.post().save(),
      p2: factories.post().save(),
      g1: factories.group().save(),
      cm1: factories.comment().save()
    }))
    .then(props => {
      fixtures = props
    })
    .then(() => Promise.join(
      fixtures.p1.groups().attach(fixtures.g1.id),
      fixtures.p1.comments().create(fixtures.cm1),
      fixtures.g1.addMembers([fixtures.u1.id])
    )))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('#createFromEmail', function () {
    beforeEach(() => {
      req.params['stripped-text'] = 'foo bar baz'
      req.params['To'] = 'wa'
    })

    it('raises an error with an invalid address', function () {
      const send = spy(() => {})
      res.status = spy(() => ({send}))
      CommentController.createFromEmail(req, res)
      expect(res.status).to.have.been.called.with(422)
      expect(send).to.have.been.called.with('Invalid reply address: wa')
    })

    it('creates a comment with created_from=email', function () {
      Analytics.track = spy(Analytics.track)
      req.params.To = Email.postReplyAddress(fixtures.p1.id, fixtures.u3.id)

      return CommentController.createFromEmail(req, res)
      .then(async () => {
        expect(Analytics.track).to.have.been.called()
        expect(res.ok).to.have.been.called()
        const comments = await fixtures.p1.comments().fetch()
        const comment = comments.last()
        expect(comment).to.exist
        expect(comment.text()).to.equal('<p>foo bar baz</p>\n')
        expect(comment.get('user_id')).to.equal(fixtures.u3.id)
        expect(comment.get('created_from')).to.equal('email')
      })
    })

    it("doesn't use markdown when the comment is for a thread", () => {
      req.params.To = Email.postReplyAddress(fixtures.p1.id, fixtures.u3.id)
      return fixtures.p1.save({type: Post.Type.THREAD}, {patch: true})
      .then(() => CommentController.createFromEmail(req, res))
      .then(() => fixtures.p1.comments().fetch())
      .then(comments => {
        const comment = comments.last()
        expect(comment).to.exist
        expect(comment.text()).to.equal('foo bar baz')
      })
    })
  })

  describe('createBatchFromEmailForm', () => {
    var p1, p2, p3

    beforeEach(() => {
      p1 = factories.post({user_id: fixtures.u1.id, created_at: new Date('2020-12-12 00:00:00')})
      p2 = factories.post({user_id: fixtures.u2.id, created_at: new Date('2020-12-12 00:00:00')})
      p3 = factories.post({user_id: fixtures.u1.id})
      res.serverError = spy()
      res.locals.tokenData = {
        groupId: fixtures.g1.id,
        userId: fixtures.u1.id
      }
      return Promise.join(p1.save(), p2.save(), p3.save())
      .then(() => Promise.join(
        p1.groups().attach(fixtures.g1),
        p2.groups().attach(fixtures.g1),
        p3.groups().attach(fixtures.g1)))
    })

    it('creates comments', () => {
      req.params[`post-${p1.id}`] = 'Reply to first post'
      req.params[`post-${p2.id}`] = 'Reply to second post'
      return CommentController.createBatchFromEmailForm(req, res)
      .then(() => Promise.join(p1.load('comments'), p2.load('comments'), p3.load('comments')))
      .then(() => {
        expect(p1.relations.comments.length).to.equal(1)
        expect(p1.relations.comments.first().get('text')).to.equal('<p>Reply to first post</p>\n')
        expect(p2.relations.comments.length).to.equal(1)
        expect(p2.relations.comments.first().get('text')).to.equal('<p>Reply to second post</p>\n')
        expect(p3.relations.comments.length).to.equal(0)
      })
    })
  })
})

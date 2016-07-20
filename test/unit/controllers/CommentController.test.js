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
      c1: factories.community().save()
    }))
    .then(props => fixtures = props)
    .then(() => fixtures.p1.communities().attach(fixtures.c1.id)))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('#create', function () {
    beforeEach(() => {
      req.session.userId = fixtures.u1.id
    })

    it('creates a comment', function () {
      var commentText = format('<p>Hey <a data-user-id="%s">U2</a> and <a data-user-id="%s">U3</a>! )</p>',
          fixtures.u2.id, fixtures.u3.id)
      var responseData

      req.param = function (name) {
        if (name === 'text') return commentText
      }

      res = {
        locals: {post: fixtures.p1},
        serverError: spy(console.error),
        ok: spy(function (x) { responseData = x })
      }

      return CommentController.create(req, res)
      .then(function () {
        expect(res.ok).to.have.been.called()
        expect(res.serverError).not.to.have.been.called()
        expect(responseData).to.exist
        expect(responseData.user).to.exist
        expect(responseData.text).to.equal(commentText)
        return fixtures.p1.load('comments')
      })
    })

    it('creates an activity for post follower', function () {
      var commentText = 'Replying to a post that u2 is following'
      var responseData

      req.param = function (name) {
        if (name === 'text') return commentText
      }

      res = {
        locals: {post: fixtures.p2},
        serverError: spy(console.error),
        ok: spy(function (x) { responseData = x })
      }

      return Promise.join(
        Follow.create(fixtures.u1.id, fixtures.p2.id),
        Follow.create(fixtures.u2.id, fixtures.p2.id)
      )
      .then(() => CommentController.create(req, res))
      .then(() => Activity.where({comment_id: responseData.id}).fetchAll())
      .then(activities => {
        expect(activities.length).to.equal(1)
        const activity = activities.first()
        expect(activity).to.exist
        expect(activity.get('actor_id')).to.equal(fixtures.u1.id)
        expect(activity.get('reader_id')).to.equal(fixtures.u2.id)
        expect(activity.get('post_id')).to.equal(fixtures.p2.id)
        expect(activity.get('meta')).to.deep.equal({reasons: ['newComment']})
        expect(activity.get('unread')).to.equal(true)
      })
    })

    it('creates an activity when there is a mention', function () {
      var commentText = `<p>Hey <a data-user-id="${fixtures.u3.id}">U3</a>`
      var responseData

      req.param = function (name) {
        if (name === 'text') return commentText
      }

      res = {
        locals: {post: fixtures.p2},
        serverError: spy(console.error),
        ok: spy(function (x) { responseData = x })
      }

      return CommentController.create(req, res)
      .then(() =>
        Activity.where({
          comment_id: responseData.id,
          reader_id: fixtures.u3.id
        }).fetch())
      .then(activity => {
        expect(activity).to.exist
        expect(activity.get('actor_id')).to.equal(fixtures.u1.id)
        expect(activity.get('post_id')).to.equal(fixtures.p2.id)
        expect(activity.get('meta')).to.deep.equal({reasons: ['commentMention']})
        expect(activity.get('unread')).to.equal(true)
      })
    })

    it('rejects a tag with no description', function () {
      const commentText = '<p>Hey #commenttag</p>'
      req.params.text = commentText
      res.locals.post = fixtures.p1

      return CommentController.create(req, res)
      .then(() => expect(res.body).to.deep.equal({
        tagsMissingDescriptions: {commenttag: [fixtures.c1.id]}
      }))
    })

    it('saves a new tag with description to the community', () => {
      req.params.text = '<p>Hey #wow</p>'
      res.locals.post = fixtures.p1
      req.params.tagDescriptions = {wow: 'wow!!1'}

      return CommentController.create(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
      })
      .then(() => Comment.find(res.body.id, {withRelated: ['tags', 'tags.communities']}))
      .then(comment => {
        const tag = comment.relations.tags.first()
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('wow')
        const community = tag.relations.communities.first()
        expect(community).to.exist
        expect(community.id).to.equal(fixtures.c1.id)
        expect(community.pivot.get('description')).to.equal('wow!!1')
      })
    })
  })

  describe('#createFromEmail', function () {
    beforeEach(() => {
      req.params['stripped-text'] = 'foo bar baz'
    })

    it('raises an error with an invalid address', function () {
      res.serverError = spy(() => {})
      CommentController.createFromEmail(req, res)
      expect(res.serverError).to.have.been.called()
    })

    it('creates a comment', function () {
      Analytics.track = spy(Analytics.track)
      req.params.To = Email.postReplyAddress(fixtures.p1.id, fixtures.u3.id)

      return CommentController.createFromEmail(req, res)
      .then(function () {
        expect(Analytics.track).to.have.been.called()
        expect(res.ok).to.have.been.called()
        return fixtures.p1.comments().fetch()
      })
      .then(function (comments) {
        var comment = comments.find(c => c.get('post_id') === fixtures.p1.id)
        expect(comment).to.exist
        expect(comment.get('text')).to.equal('<p>foo bar baz</p>\n')
        expect(comment.get('user_id')).to.equal(fixtures.u3.id)
      })
    })
  })
})

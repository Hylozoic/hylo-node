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
        expect(responseData.user_id).to.exist
        expect(responseData.text).to.equal(commentText)
        expect(responseData.people).to.exist
        expect(responseData.people[0].name).to.equal(fixtures.u1.get('name'))
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
      req.params.tagDescriptions = {wow: {description: 'wow!!1'}}

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

    it('creates a comment with created_from=email', function () {
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
        expect(comment.get('created_from')).to.equal('email')
      })
    })
  })

  describe('update', () => {
    it('updates the comment text', () => {
      var comment
      req.params.text = 'updated comment text'
      comment = factories.comment({text: 'original text'})
      return comment.save()
      .then(() => req.params.commentId = comment.id)
      .then(() => CommentController.update(req, res))
      .then(() => Comment.find(comment.id))
      .then(comment => {
        expect(comment).to.exist
        expect(comment.get('text')).to.equal('updated comment text')
      })
    })

    it('saves a new tag with description to the community', () => {
      var comment
      req.params.text = 'updated comment text with #anewtag'
      req.params.tagDescriptions = {anewtag: {description: 'new tag description'}}
      comment = factories.comment({text: 'original text', post_id: fixtures.p1.id})
      return comment.save()
      .then(() => req.params.commentId = comment.id)
      .then(() => CommentController.update(req, res))
      .then(() => Comment.find(comment.id, {withRelated: ['tags', 'tags.communities']}))
      .then(comment => {
        const tag = comment.relations.tags.first()
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('anewtag')
        const community = tag.relations.communities.first()
        expect(community).to.exist
        expect(community.id).to.equal(fixtures.c1.id)
        expect(community.pivot.get('description')).to.equal('new tag description')
      })
    })
  })

  describe('createBatchFromEmailForm', () => {
    var token, p1, p2, p3

    beforeEach(() => {
      p1 = factories.post({user_id: fixtures.u1.id})
      p2 = factories.post({user_id: fixtures.u2.id})
      p3 = factories.post({user_id: fixtures.u1.id})
      token = Email.formToken(fixtures.c1.id, fixtures.u1.id)
      res.serverError = spy()
      return Promise.join(p1.save(), p2.save(), p3.save())
      .then(() => Promise.join(
        p1.communities().attach(fixtures.c1),
        p2.communities().attach(fixtures.c1),
        p3.communities().attach(fixtures.c1)))
    })

    it('throws an error with a bad token', () => {
      req.params.token = 'abadtoken'
      return CommentController.createBatchFromEmailForm(req, res)
      .then(() => expect(res.serverError).to.have.been.called)
    })

    it('creates comments', () => {
      req.params.token = token
      req.params[`post-${p1.id}`] = 'Reply to first post'
      req.params[`post-${p2.id}`] = 'Reply to second post'
      return CommentController.createBatchFromEmailForm(req, res)
      .then(() => Promise.join(p1.load('comments'), p2.load('comments'), p3.load('comments')))
      .then(() => {
        expect(p1.relations.comments.length).to.equal(1)
        expect(p1.relations.comments.first().get('text')).to.equal('Reply to first post')
        expect(p2.relations.comments.length).to.equal(1)
        expect(p2.relations.comments.first().get('text')).to.equal('Reply to second post')
        expect(p3.relations.comments.length).to.equal(0)
      })
    })
  })
})

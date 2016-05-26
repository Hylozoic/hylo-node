var setup = require(require('root-path')('test/setup'))
var CommentController = require(require('root-path')('api/controllers/CommentController'))

describe('CommentController', function () {
  var fixtures, req, res

  before(function (done) {
    setup.clearDb().then(function () {
      return Promise.props({
        u1: new User({name: 'U1', email: 'a@b.c'}).save(),
        u2: new User({name: 'U2', email: 'b@b.c'}).save(),
        u3: new User({name: 'U3', email: 'c@b.c'}).save(),
        p1: new Post({name: 'P1', active: true}).save(),
        p2: new Post({name: 'P2', active: true}).save(),
        c1: new Community({name: 'C1', slug: 'c1'}).save()
      })
    })
      .then(function (props) {
        fixtures = props
        done()
      })
  })

  describe('#create', function () {
    before(function () {
      req = {
        session: {userId: fixtures.u1.id}
      }
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

    it('creates a tag', function () {
      var commentText = '<p>Hey #commenttag</p>'

      req.param = function (name) {
        if (name === 'text') return commentText
      }

      res = {
        locals: {post: fixtures.p1},
        ok: x => x
      }

      return CommentController.create(req, res)
      .then(() => Tag.find('commenttag', {withRelated: 'comments'}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.relations.comments.length).to.equal(1)
        expect(tag.relations.comments.models[0].get('text')).to.equal(commentText)
      })
    })
  })

  describe('#createFromEmail', function () {
    var params = {
      'stripped-text': 'foo bar baz'
    }

    before(function () {
      req = {
        param: function (name) {
          return params[name]
        }
      }
      res = {}
    })

    it('raises an error with an invalid address', function () {
      res = {
        serverError: spy(function () {})
      }

      CommentController.createFromEmail(req, res)
      expect(res.serverError).to.have.been.called()
    })

    it('creates a comment', function (done) {
      Analytics.track = spy(Analytics.track)
      params.To = Email.postReplyAddress(fixtures.p1.id, fixtures.u3.id)

      res = {
        ok: spy(function () {}),
        serverError: done
      }

      CommentController.createFromEmail(req, res)
        .then(function () {
          expect(Analytics.track).to.have.been.called()
          expect(res.ok).to.have.been.called()
          return fixtures.p1.comments().fetch()
        })
        .then(function (comments) {
          var comment = comments.find(c => c.get('post_id') === fixtures.p1.id)
          expect(comment).to.exist
          expect(comment.get('text')).to.equal('foo bar baz')
          expect(comment.get('user_id')).to.equal(fixtures.u3.id)
          done()
        })
        .catch(done)
    })
  })
})

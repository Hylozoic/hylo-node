var moment = require('moment')
var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('Post', function () {
  describe('#addFollowers', function () {
    var u1, u2, u3, post

    before(function (done) {
      u1 = new User()
      u2 = new User()
      u3 = new User()
      post = new Post()
      Promise.join(
        u1.save(),
        u2.save(),
        u3.save()
      ).then(function () {
        post.set('user_id', u1.id)
        return post.save()
      }).then(function () {
        done()
      })
    })

    it('creates activity notifications', function () {
      return post.addFollowers([u2.id], u3.id, {createActivity: true}).then(function () {
        return Promise.join(
          post.load('followers'),
          Activity.where('reader_id', 'in', [u1.id, u2.id]).fetchAll()
        )
      })
      .spread(function (post, activity) {
        expect(post.relations.followers.length).to.equal(1)
        var follower = post.relations.followers.first()
        expect(follower.id).to.equal(u2.id)
        expect(follower.pivot.get('added_by_id')).to.equal(u3.id)

        expect(activity.length).to.equal(2)
        var a1 = _.find(activity.models, function (a) { return a.get('reader_id') === u1.id })
        expect(a1).to.exist
        expect(a1.get('action')).to.equal('follow')

        var a2 = _.find(activity.models, function (a) { return a.get('reader_id') === u2.id })
        expect(a2).to.exist
        expect(a2.get('action')).to.equal('followAdd')
      })
    })
  })

  describe('#isVisibleToUser', () => {
    var post, c1, c2, user

    beforeEach(() => {
      post = new Post({name: 'hello', active: true})
      user = new User({name: 'Cat'})
      c1 = factories.community({active: true})
      c2 = factories.community({active: true})
      return Promise.join(post.save(), user.save(), c1.save(), c2.save())
      .then(() => user.joinCommunity(c1))
      .then(() => post.communities().attach(c2.id))
    })

    it('is true if the post is public', () => {
      return post.save({visibility: Post.Visibility.PUBLIC_READABLE}, {patch: true})
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })

    it('is false if the user is not connected by community or project', () => {
      return Post.isVisibleToUser(post.id, user.id)
      .then(visible => expect(visible).to.be.false)
    })

    it('is false if the user and post share a community', () => {
      return Membership.create(user.id, c2.id)
      .then(() => post.communities().attach(c1.id))
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })

    it("is false if the user has a disabled membership in the post's community", () => {
      return Membership.create(user.id, c2.id)
      .then(ms => ms.save({active: false}, {patch: true}))
      .then(() => post.communities().attach(c1.id))
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })

    it("is true if the user is in the post's project", () => {
      var project = new Project({title: 'Lazy day', slug: 'lazy-day'})
      return project.save()
      .then(() => ProjectMembership.create(user.id, project.id))
      .then(() => PostProjectMembership.create(post.id, project.id))
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })

    it('is true if the user and post share a network', () => {
      var network = new Network()
      return network.save()
      .then(() => Promise.join(
        c1.save({network_id: network.id}, {patch: true}),
        c2.save({network_id: network.id}, {patch: true})
      ))
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })

    it('is true if the user is following the post', () => {
      return Follow.create(user.id, post.id)
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })
  })

  describe('#updateCommentCount', () => {
    var post

    before(() => {
      post = new Post({updated_at: moment().subtract(1, 'month').toDate()})
      return post.save()
      .then(post => Promise.join(
        new Comment({post_id: post.id, active: true}).save(),
        new Comment({post_id: post.id, active: true}).save()
      ))
    })

    it('updates the count and updated_at', () => {
      return post.updateCommentCount()
      .then(count => {
        expect(count).to.equal(2)
        expect(post.get('num_comments')).to.equal(2)
        expect(post.get('updated_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)
      })
    })
  })

  describe('.createdInTimeRange', () => {
    var post

    before(() => {
      post = new Post({
        name: 'foo',
        created_at: new Date(),
        active: true
      })
      return post.save()
    })

    it('works', () => {
      var now = new Date()
      return Post.createdInTimeRange(new Date(now - 10000), now)
      .fetch().then(p => {
        expect(p).to.exist
        expect(p.id).to.equal(post.id)
      })
    })
  })

  describe('.copy', () => {
    var post

    before(() => {
      post = factories.post()
      return post.save()
    })

    it('creates a copy of the post with changed attributes', () => {
      var p2 = post.copy({
        description: 'foo'
      })

      return p2.save()
      .then(() => {
        expect(p2.id).to.exist
        expect(p2.id).not.to.equal(post.id)
        expect(p2.get('description')).to.equal('foo')
        expect(p2.get('name')).to.equal(post.get('name'))
      })
    })
  })
})

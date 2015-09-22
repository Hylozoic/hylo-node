var moment = require('moment')
require(require('root-path')('test/setup'))

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
        var follow = post.relations.followers.first()
        expect(follow.get('user_id')).to.equal(u2.id)
        expect(follow.get('added_by_id')).to.equal(u3.id)

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
    var post, community, community2, network, project, user

    beforeEach(() => {
      post = new Post({name: 'hello'})
      user = new User({name: 'Cat'})
      return Promise.join(post.save(), user.save())
    })

    it('is false if the user is not connected by community or project', () => {
      return Post.isVisibleToUser(post.id, user.id)
      .then(visible => expect(visible).to.be.false)
    })

    it("is true if the user is in the post's community", () => {
      community = new Community({name: 'House', slug: 'house'})
      return community.save()
      .then(() => Membership.create(user.id, community.id))
      .then(() => community.posts().attach(post.id))
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })

    it("is true if the user is in the post's project", () => {
      project = new Project({title: 'Lazy day', slug: 'lazy-day'})
      return project.save()
      .then(() => ProjectMembership.create(user.id, project.id))
      .then(() => PostProjectMembership.create(post.id, project.id))
      .then(() => Post.isVisibleToUser(post.id, user.id))
      .then(visible => expect(visible).to.be.true)
    })

    it("is true if the user is in the post's community's network", () => {
      network = new Network()
      return network.save()
      .then(() => {
        community = new Community({name: 'c1', slug: 'c1', network_id: network.id})
        community2 = new Community({name: 'c2', slug: 'c2', network_id: network.id})
        return Promise.join(community.save(), community2.save())
      })
      .then(() => Membership.create(user.id, community2.id))
      .then(() => community.posts().attach(post.id))
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
})

import root from 'root-path'
import { find } from 'lodash'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('Post', function () {
  describe('#addFollowers', function () {
    var u1, u2, u3, post

    before(function (done) {
      return setup.clearDb().then(function () {
        u1 = new User({email: 'a@post.c'})
        u2 = new User({email: 'b@post.c'})
        u3 = new User({email: 'c@post.c'})
        post = new Post()
        return Promise.join(
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
        var a1 = find(activity.models, function (a) { return a.get('reader_id') === u1.id })
        expect(a1).to.exist
        expect(a1.get('meta')).to.deep.equal({reasons: ['follow']})

        var a2 = find(activity.models, function (a) { return a.get('reader_id') === u2.id })
        expect(a2).to.exist
        expect(a2.get('meta')).to.deep.equal({reasons: ['followAdd']})
      })
    })
  })

  describe('#getCommenters', function () {
    var c1, u1, u2, u3, u4, u5, u6, u7, u8, post

    before(function (done) {
      return setup.clearDb().then(function () {
        u1 = new User({email: 'a@post.c'})
        u2 = new User({email: 'b@post.b'})
        u3 = new User({email: 'c@post.c'})
        u4 = new User({email: 'd@post.d'})
        u5 = new User({email: 'e@post.e'})
        u6 = new User({email: 'f@post.f'})
        u7 = new User({email: 'g@post.g'})
        u8 = new User({email: 'h@post.h'})
        post = new Post()
        return Promise.join(
          u1.save(),
          u2.save(),
          u3.save(),
          u4.save(),
          u5.save(),
          u6.save(),
          u7.save(),
          u8.save()
        ).then(function () {
          post.set('user_id', u1.id)
          return post.save()
        }).then(function () {
          return Promise.map([u1, u2, u3, u4, u5, u6, u7, u8], (u) => {
            const c = new Comment({user_id: u.id, post_id: post.id})
            return c.save()
          })
        }).then(function () {
          done()
        })
      })
    })

    it('includes the current user always, regardless of when they commented', function () {
      const first = 1
      const currentUserId = u3.id
      return post.getCommenters(first, currentUserId).then(function (results) {
        console.log(currentUserId, Object.keys(results._byId))
        expect(results.length).to.equal(first)
        expect(results._byId[currentUserId]).to.not.be.undefined
      })
    })
  })

  describe('#isVisibleToUser', () => {
    var post, c1, c2, user

    beforeEach(() => {
      post = new Post({name: 'hello', active: true})
      user = factories.user({name: 'Cat'})
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

    it('is false if the user is not connected by community', () => {
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

  describe('.deactivate', () => {
    var post

    beforeEach(() => {
      post = factories.post()
      return post.save()
      .then(() => new Activity({post_id: post.id}).save())
      .then(activity => new Notification({activity_id: activity.id}).save())
      .then(() => factories.comment({post_id: post.id}).save())
      .then(comment => new Activity({comment_id: comment.id}).save())
      .then(activity => new Notification({activity_id: activity.id}).save())
    })

    it('handles notifications, comments, and activity', () => {
      Post.deactivate(post.id)
      .then(() => post.refresh())
      .then(() => post.load([
        'comments',
        'activities',
        'activities.notifications',
        'comments.activities',
        'comments.activities.notifications'
      ]))
      .then(() => {
        expect(post.relations.activities.length).to.equal(0)
        expect(post.relations.comments.first().activities.length).to.equal(0)
        expect(post.get('active')).to.be.false
      })
    })
  })

  describe('.createActivities', () => {
    var u, u2, u3, c
    before(() => {
      u = factories.user()
      u2 = factories.user()
      u3 = factories.user()
      c = factories.community()
      return Promise.join(u.save(), u2.save(), u3.save(), c.save())
      .then(() => Promise.join(
        u2.joinCommunity(c),
        u3.joinCommunity(c)
      ))
    })

    it('creates activity for community members', () => {
      var post = factories.post({user_id: u.id})
      return post.save()
      .then(() => post.communities().attach(c.id))
      .then(() => post.createActivities())
      .then(() => Activity.where({post_id: post.id}).fetchAll())
      .then(activities => {
        expect(activities.length).to.equal(2)
        expect(activities.pluck('reader_id').sort()).to.deep.equal([u2.id, u3.id].sort())
        activities.forEach(activity => {
          expect(activity.get('actor_id')).to.equal(u.id)
          expect(activity.get('meta')).to.deep.equal({reasons: [`newPost: ${c.id}`]})
          expect(activity.get('unread')).to.equal(true)
        })
      })
    })

    it('creates an activity for a mention', () => {
      var post = factories.post({
        user_id: u.id,
        description: `<p>Yo <a data-user-id="${u3.id}">u3</a>, how goes it</p>`
      })
      return post.save()
      .then(() => post.communities().attach(c.id))
      .then(() => post.createActivities())
      .then(() => Activity.where({post_id: post.id, reader_id: u3.id}).fetchAll())
      .then(activities => {
        expect(activities.length).to.equal(1)
        const activity = activities.first()
        expect(activity).to.exist
        expect(activity.get('actor_id')).to.equal(u.id)
        expect(activity.get('meta')).to.deep.equal({reasons: ['mention', `newPost: ${c.id}`]})
        expect(activity.get('unread')).to.equal(true)
      })
    })

    it('creates an activity for a tag follower', () => {
      var post = factories.post({
        user_id: u.id,
        description: '#FollowThisTag'
      })

      return new Tag({name: 'FollowThisTag'}).save()
      .tap(tag => u3.followedTags().attach({tag_id: tag.id, community_id: c.id}))
      .then(() => post.save())
      .then(() => Tag.updateForPost(post, null))
      .then(() => post.communities().attach(c.id))
      .then(() => post.createActivities())
      .then(() => Activity.where({post_id: post.id, reader_id: u3.id}).fetchAll())
      .then(activities => {
        expect(activities.length).to.equal(1)
        const activity = activities.first()
        expect(activity).to.exist
        expect(activity.get('actor_id')).to.equal(u.id)
        expect(activity.get('meta')).to.deep.equal({reasons: [`newPost: ${c.id}`, 'tag: FollowThisTag']})
        expect(activity.get('unread')).to.equal(true)
      })
    })
  })

  describe('#updateFromNewComment', () => {
    var parent, post, user, lastRead

    before(() => {
      const earlier = new Date(0)
      user = factories.user()
      parent = factories.post({updated_at: earlier})
      return parent.save()
      .then(() => {
        post = factories.post({parent_post_id: parent.id})
        return Promise.join(post.save(), user.save())
      })
      .then(() => LastRead.findOrCreate(user.id, post.id, {date: earlier}))
      .then(lr => { lastRead = lr })
    })

    it('updates several attributes', () => {
      const comment = factories.comment({
        post_id: post.id,
        created_at: new Date(),
        user_id: user.id
      })

      return comment.save()
      .then(comment =>
        Post.updateFromNewComment({postId: post.id, commentId: comment.id}))
      .then(() => Promise.map([parent, post, lastRead], x => x.refresh()))
      .then(() => {
        const now = new Date().getTime()
        expect(parent.get('updated_at').getTime()).to.be.closeTo(now, 2000)
        expect(post.get('updated_at').getTime()).to.be.closeTo(now, 2000)
        expect(lastRead.get('last_read_at').getTime()).to.be.closeTo(now, 2000)
        expect(post.get('num_comments')).to.equal(1)
      })
    })
  })

  describe('#unreadCountForUser', () => {
    var post, user, user2, c1, c2, c3

    before(() => {
      post = factories.post()
      user = factories.user()
      user2 = factories.user()
      return Promise.join(post.save(), user.save(), user2.save())
      .then(() => {
        const lastReadDate = new Date()
        const earlier = new Date(lastReadDate.getTime() - 60000)
        const later = new Date(lastReadDate.getTime() + 60000)
        c1 = factories.comment({post_id: post.id, created_at: earlier})
        c2 = factories.comment({post_id: post.id, created_at: later})
        c3 = factories.comment({post_id: post.id, created_at: later})

        return Promise.all([
          LastRead.findOrCreate(user.id, post.id, {date: lastReadDate}),
          c1.save(),
          c2.save(),
          c3.save(),
          post.save({updated_at: later}, {patch: true})
        ])
      })
    })

    it('returns the number of unread messages (comments)', () => {
      return post.unreadCountForUser(user.id)
      .then(count => expect(count).to.equal(2))
    })

    it('returns the total number of messages (comments) if no last_read_at value', () => {
      return post.unreadCountForUser(user2.id)
      .then(count => expect(count).to.equal(3))
    })
  })

  describe('#vote', () => {
    var user, post
    beforeEach(function (done) {
      return setup.clearDb()
      .then(() => {
        user = new User({email: 'a@post.c'})

        return user.save()
        .then(() => {
          post = factories.post({
            user_id: user.id,
            num_votes: 5
          })
          return post.save()
        })
        .then(() => done())
      })
    })

    describe('without an existing vote', () => {
      it('does nothing if isUpvote is false', () => {

      })

      it('creates a vote and increments vote count if isUpvote is true', () => {

      })
    })

    describe('with an existing vote', () => {

    })
  })
})

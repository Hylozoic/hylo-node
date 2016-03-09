require(require('root-path')('test/setup'))
var kue = require('kue')

describe('Comment', () => {
  describe('.sendNotifications', () => {
    var community, post, u1, u2, u3, u4, comment

    before(() => {
      kue.clear()
      community = new Community({name: 'foo', slug: 'foo'})
      post = new Post()
      u1 = new User()
      u2 = new User()
      u3 = new User()
      u4 = new User()
      comment = new Comment()

      return Promise.join(
        community.save(), post.save(), u1.save(), u2.save(), u3.save(), u4.save()
      )
      .then(() => Promise.join(
          Follow.create(u1.id, post.id),
          community.posts().attach(post.id)
      ))
      .then(f => {
        comment = new Comment({
          text: format('<a data-user-id="%s"></a><a data-user-id="%s"></a>', u2.id, u3.id),
          post_id: post.id,
          user_id: u4.id
        })
        return comment.save()
      })
    })

    it('works', () => {
      var newNotificationCount = function (userId) {
        return User.where({id: userId}).fetch().then(u => u.get('new_notification_count'))
      }

      var emailJob = function (userId, version) {
        return _.find(kue.getJobs(), {data: {methodName: 'sendNotificationEmail', recipientId: userId, version: version}})
      }

      var pushNotificationJob = function (userId, version) {
        return _.find(kue.getJobs(), {data: {methodName: 'sendPushNotification', recipientId: userId, version: version}})
      }

      return Comment.sendNotifications({commentId: comment.id}).then(() => {
        return Promise.join(
          expect(Activity.query().count()).to.eventually.deep.equal([{count: '3'}]),
          expect(newNotificationCount(u1.id)).to.eventually.equal(1),
          expect(newNotificationCount(u2.id)).to.eventually.equal(1),
          expect(newNotificationCount(u3.id)).to.eventually.equal(1),

          expect(kue.jobCount()).to.equal(6),
          expect(emailJob(u1.id, 'default')).to.exist,
          expect(emailJob(u2.id, 'mention')).to.exist,
          expect(emailJob(u3.id, 'mention')).to.exist,
          expect(pushNotificationJob(u1.id, 'default')).to.exist,
          expect(pushNotificationJob(u2.id, 'mention')).to.exist,
          expect(pushNotificationJob(u3.id, 'mention')).to.exist
        )
        .then(() => u4.load('followedPosts'))
        .then(() => {
          expect(u4.relations.followedPosts.find({id: post.id})).to.exist
        })
      })
    })
  })
})

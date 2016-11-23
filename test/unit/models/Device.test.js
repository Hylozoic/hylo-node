require('../../setup')
import factories from '../../setup/factories'

describe('Device', () => {
  describe('.sendPushNotification', () => {
    var user, post

    beforeEach(() => {
      user = factories.user({new_notification_count: 6})
      post = factories.post({type: Post.Type.THREAD, num_comments: 1})
      return Promise.join(post.save(), user.save())
      .then(() => Follow.create(user.id, post.id))
    })

    it('creates a PushNotification with the right badge number', () => {
      const device = new Device({
        token: 'foo',
        user_id: user.id,
        enabled: true,
        version: 1
      })

      return device.save()
      .then(() => device.sendPushNotification('hello!', '/hello/world?amaze=yes'))
      .catch(err => {
        expect(err.message).to.equal('OneSignal.notify for device foo failed with status code 400')
      })
      .then(() => PushNotification.where({device_token: 'foo'}).fetch())
      .then(push => {
        expect(push).to.exist
        const queuedAt = push.get('queued_at')
        expect(queuedAt).to.exist
        expect(new Date() - new Date(queuedAt)).to.be.below(2000)
        expect(push.get('badge_no')).to.equal(7)
      })
    })
  })
})

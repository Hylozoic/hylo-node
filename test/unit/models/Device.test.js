import '../../setup'
import factories from '../../setup/factories'
import { mockify, unspyify } from '../../setup/helpers'

describe('Device', () => {
  let user, device

  beforeEach(() => {
    mockify(OneSignal, 'notify', () => {})
    user = factories.user({new_notification_count: 6})
    return user.save()
    .then(() => {
      device = factories.device({
        user_id: user.id,
        enabled: true,
        version: '2'
      })
      return device.save()
    })
  })

  afterEach(() => unspyify(OneSignal, 'notify'))

  describe('.resetNotificationCount', () => {
    it('sends a push notification with badge_no = 0', () => {
      return device.resetNotificationCount()
      .then(() => device.pushNotifications().fetchOne())
      .then(push => expect(push.get('badge_no')).to.equal(0))
    })
  })

  describe('.sendPushNotification', () => {
    it('creates a PushNotification with the right badge number', () => {
      return device.sendPushNotification('hello!', '/hello/world?amaze=yes')
      .then(() => PushNotification.where({device_id: device.id}).fetch())
      .then(push => {
        expect(push).to.exist
        const queuedAt = push.get('queued_at')
        expect(queuedAt).to.exist
        expect(new Date() - new Date(queuedAt)).to.be.below(2000)
        expect(push.get('badge_no')).to.equal(6)
      })
    })
  })
})

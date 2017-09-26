import factories from '../../setup/factories'
import { mockify, unspyify } from '../../setup/helpers'

describe('PushNotification', function () {
  describe('when PUSH_NOTIFICATIONS_ENABLED is not set', () => {
    var device, pushNotification, tmpEnvVar

    before(() => {
      tmpEnvVar = process.env.PUSH_NOTIFICATIONS_ENABLED
      delete process.env.PUSH_NOTIFICATIONS_ENABLED

      device = factories.device()

      pushNotification = new PushNotification({
        alert: 'hi',
        path: '/p',
        badge_no: 7,
        platform: 'ios_macos'
      })

      return device.save()
      .then(() => pushNotification.set('device_id', device.id))
      .then(() => pushNotification.save())
    })

    after(() => {
      process.env.PUSH_NOTIFICATIONS_ENABLED = tmpEnvVar
    })

    it('sets sent_at and disabled', function () {
      return pushNotification.send()
      .then(result => {
        return pushNotification.fetch()
        .then(pn => {
          expect(pn.get('sent_at')).not.to.equal(null)
          expect(pn.get('disabled')).to.be.true
        })
      })
    })

    describe('when PUSH_NOTIFICATIONS_TESTING_ENABLED is set', () => {
      var device, pushNotification, tmpEnvVar2

      before(() => {
        tmpEnvVar2 = process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED
        process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED = true

        device = factories.device()

        pushNotification = new PushNotification({
          alert: 'hi',
          path: '/p',
          badge_no: 7,
          platform: 'ios_macos'
        })

        return device.save()
        .then(() => pushNotification.set('device_id', device.id))
        .then(() => pushNotification.save())
      })

      after(() => {
        process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED = tmpEnvVar2
      })

      beforeEach(() => mockify(OneSignal, 'notify', spy(() => {})))
      afterEach(() => unspyify(OneSignal, 'notify'))

      it('sets sent_at and disabled for a non-test device', function () {
        return pushNotification.send()
        .then(result => {
          return pushNotification.fetch()
          .then(pn => {
            expect(pn.get('sent_at')).not.to.equal(null)
            expect(pn.get('disabled')).to.be.true
            expect(OneSignal.notify).not.to.have.been.called()
          })
        })
      })

      it('sends for a test device', function () {
        return device.save({tester: true}, {patch: true})
        .then(() => pushNotification.send())
        .then(result => {
          return pushNotification.fetch()
          .then(pn => {
            expect(pn.get('sent_at')).not.to.equal(null)
            expect(pn.get('disabled')).to.be.false
            expect(OneSignal.notify).to.have.been.called()
          })
        })
      })
    })
  })
})

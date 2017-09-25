import factories from '../../setup/factories'

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
  })
})

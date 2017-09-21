var setup = require(require('root-path')('test/setup'))
var nock = require('nock')

describe('PushNotification', function () {
  var pushNotification, tmpEnvVar

  before(() => {
    pushNotification = new PushNotification({
      device_token: 'abcd',
      alert: 'hi',
      path: '/p',
      badge_no: 7,
      platform: 'ios_macos'
    })

    tmpEnvVar = process.env.DISABLE_PUSH_NOTIFICATIONS
    process.env.DISABLE_PUSH_NOTIFICATIONS = true
    return setup.clearDb().then(() => pushNotification.save())
  })

  after(() => {
    process.env.DISABLE_PUSH_NOTIFICATIONS = tmpEnvVar
  })

  describe('.send', () => {
    beforeEach(() => {
      nock(OneSignal.host).post('/api/v1/notifications')
      .reply(200, {result: 'success'})
    })

    it('sets sent_at and disabled', function () {
      return pushNotification.send()
      .then(result => {
        return pushNotification.fetch()
        .then(pn => {
          expect(pn.get('sent_at')).to.not.equal(null)
          expect(pn.get('disabled')).to.be.true
        })
      })
    })
  })
})

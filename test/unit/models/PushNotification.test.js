var setup = require(require('root-path')('test/setup'))
var nock = require('nock')

describe('PushNotification', function () {
  var pushNotification

  before(() => {
    pushNotification = new PushNotification({
      device_token: 'abcd',
      alert: 'hi',
      path: '/p',
      badge_no: 7,
      platform: 'ios_macos'
    })

    return setup.clearDb().then(() => pushNotification.save())
  })

  describe('.send', () => {
    beforeEach(() => {
      nock(OneSignal.host).post('/api/v1/notifications')
      .reply(200, {result: 'success'})
    })

    it('sets sent_at', function () {
      return pushNotification.send()
      .then(result => {
        expect(result.body).to.deep.equal({result: 'success'})
        return pushNotification.fetch()
        .then(pn => {
          expect(pn.get('sent_at')).to.not.equal(null)
        })
      })
    })
  })
})

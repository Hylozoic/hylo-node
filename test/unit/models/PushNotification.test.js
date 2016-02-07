var setup = require(require('root-path')('test/setup'))
var nock = require('nock')

describe('PushNotification', function () {
  var pushNotification

  before(function () {
    pushNotification = new PushNotification({
      device_token: 'abcd',
      alert: 'hi',
      path: '/p',
      badge_no: 7,
      platform: 'ios_macos'
    })

    nock('https://onesignal.com').post('/api/v1/notifications').reply(200, {result: 'success'})

    return setup.clearDb()
    .then(() => pushNotification.save())
  })

  describe('.send', function () {
    it('sets time_sent', function (done) {
      pushNotification.send()
      .then(result => {
        expect(result.body).to.deep.equal({result: 'success'})
        return pushNotification.fetch()
        .then(pn => {
          expect(pn.get('time_sent')).to.not.equal(null)
        })
      }).exec(done)
    })
  })
})

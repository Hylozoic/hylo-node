import factories from '../../setup/factories'
import { mockify, unspyify } from '../../setup/helpers'

describe('PushNotification', () => {
  var device, pushNotification, tmpEnvVar, notifyCall

  before(() => {
    tmpEnvVar = process.env.PUSH_NOTIFICATIONS_ENABLED
    device = factories.device()

    return device.save()
  })

  beforeEach(async () => {
    notifyCall = null
    mockify(OneSignal, 'notify', spy(opts => {
      notifyCall = opts
    }))

    pushNotification = new PushNotification({
      alert: 'hi',
      path: '/p',
      badge_no: 7,
      platform: 'ios_macos'
    })
    await pushNotification.set('device_id', device.id)
    await pushNotification.save()
  })

  after(() => {
    process.env.PUSH_NOTIFICATIONS_ENABLED = tmpEnvVar
    unspyify(OneSignal, 'notify')
  })

  describe('without PUSH_NOTIFICATIONS_ENABLED', () => {
    before(() => {
      delete process.env.PUSH_NOTIFICATIONS_ENABLED
    })

    // it('returns correct text with textForAnnouncement', () => {
    //   var post = factories.post()
    //   expect(typeof pushNotification.textForAnnouncement(post)).toEqual('string')
    // })

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

    describe('with PUSH_NOTIFICATIONS_TESTING_ENABLED', () => {
      var tmpEnvVar2

      before(() => {
        tmpEnvVar2 = process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED
        process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED = true
      })

      after(() => {
        process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED = tmpEnvVar2
      })

      it('sets sent_at and disabled for a non-test device', async () => {
        await pushNotification.send()
        const pn = await pushNotification.fetch()
        expect(pn.get('sent_at')).not.to.equal(null)
        expect(pn.get('disabled')).to.be.true
        expect(OneSignal.notify).not.to.have.been.called()
      })

      it('sends for a test device', async () => {
        await device.save({tester: true}, {patch: true})
        const result = await pushNotification.send()
        const pn = await pushNotification.fetch()
        expect(pn.get('sent_at')).not.to.equal(null)
        expect(pn.get('disabled')).to.be.false
        expect(OneSignal.notify).to.have.been.called()
      })
    })
  })

  describe('with PUSH_NOTIFICATIONS_ENABLED', () => {
    before(() => {
      process.env.PUSH_NOTIFICATIONS_ENABLED = true
    })

    it('sends for a non-test device with token', async () => {
      await device.save({token: 'foo'}, {patch: true})
      const result = await pushNotification.send()
      const pn = await pushNotification.fetch()

      expect(pn.get('sent_at')).not.to.equal(null)
      expect(pn.get('disabled')).to.be.false
      expect(OneSignal.notify).to.have.been.called()

      expect(notifyCall).to.deep.equal({
        platform: 'ios_macos',
        deviceToken: 'foo',
        playerId: null,
        alert: 'hi',
        path: '/p',
        badgeNo: 7
      })
    })

    it('sends for a non-test device with player id', async () => {
      await device.save({token: null, player_id: 'bar'}, {patch: true})
      const result = await pushNotification.send()
      const pn = await pushNotification.fetch()

      expect(pn.get('sent_at')).not.to.equal(null)
      expect(pn.get('disabled')).to.be.false
      expect(OneSignal.notify).to.have.been.called()

      expect(notifyCall).to.deep.equal({
        platform: 'ios_macos',
        deviceToken: null,
        playerId: 'bar',
        alert: 'hi',
        path: '/p',
        badgeNo: 7
      })
    })
  })
})

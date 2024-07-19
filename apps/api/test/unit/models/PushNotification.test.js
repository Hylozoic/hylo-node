import factories from '../../setup/factories'
import { mockify, unspyify } from '../../setup/helpers'

describe('PushNotification', () => {
  let device, pushNotification, tmpEnvVar, notifyCall

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
      path: '/post',
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
    let user, post, group

    before(() => {
      delete process.env.PUSH_NOTIFICATIONS_ENABLED
    })

    beforeEach(async () => {
      const username = 'username'
      const postname = 'My Post'
      user = await factories.user({name: username, settings: {locale: 'en'}}).save()
      post = await factories.post({user_id: user.id, name: postname}).save()
      group = await factories.group({ name: 'Friends of Cheese' }).save()
    })

    it('returns correct text with textForAnnouncement', async () => {
      await post.load('user')
      const person = post.relations.user.get('name')
      const postName = post.get('name')
      const expected = `${person} sent an announcement "${postName}" to ${group.get('name')}`
      expect(PushNotification.textForAnnouncement(post, group, 'en')).to.equal(expected)
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
        path: '/post',
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
        path: '/post',
        badgeNo: 7
      })
    })
  })
})

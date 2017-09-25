import { registerDevice } from './mobile'
import factories from '../../../test/setup/factories'

describe('registerDevice', () => {
  var user, device

  before(() => {
    user = factories.user()
    return user.save()
    .then(() => {
      device = Device.forge({user_id: user.id, player_id: 'foo'})
      return device.save()
    })
  })

  it('creates a new device', () => {
    return registerDevice(user.id, {
      playerId: 'bar', platform: 'ios', version: '2'
    })
    .then(response => {
      expect(response.success).to.be.true
      return Device.where('player_id', 'bar').fetch()
    })
    .then(d => {
      expect(d).to.exist
      expect(d.get('user_id')).to.equal(user.id)
      expect(d.get('platform')).to.equal('ios')
      expect(d.get('version')).to.equal('2')
    })
  })

  it('updates an existing device', () => {
    return registerDevice(user.id, {
      playerId: 'foo', platform: 'ios', version: '2'
    })
    .then(() => device.refresh())
    .then(() => {
      expect(device.get('user_id')).to.equal(user.id)
      expect(device.get('platform')).to.equal('ios')
      expect(device.get('version')).to.equal('2')
    })
  })
})

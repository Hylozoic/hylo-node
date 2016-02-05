var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var DeviceController = require(root('api/controllers/DeviceController'))
var nock = require('nock')

describe('DeviceController', () => {
  var fixtures, req, res

  var deviceToken = '00000-0000-0000-000'
  var platform = 'ios_macos'
  var version = '1.0.6'

  before(() =>
    setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1'}).save()
    }))
    .then(props => fixtures = props))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    req.login(fixtures.u1.id)
    nock('https://onesignal.com').post('/api/v1/players').reply(200, { success: true, id: deviceToken })
  })

  describe('#create', () => {
    it('adds a device to the database', () => {
      _.extend(req.params, {
        token: deviceToken,
        platform: platform
      })

      req.headers = {'ios-version': version}

      return DeviceController.create(req, res)
      .then(() => {
        return Device.forge({token: deviceToken})
        .fetch()
        .then(device => {
          expect(device).to.exist
          expect(device.get('token')).to.equal(deviceToken)
          expect(device.get('platform')).to.equal(platform)
          expect(device.get('version')).to.equal(version)
          expect(device.get('user_id')).to.equal(fixtures.u1.id)
        })
      })
    })
  })
})

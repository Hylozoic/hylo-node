var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var DeviceController = require(root('api/controllers/DeviceController'))
var nock = require('nock')
var Promise = require('bluebird')

describe('DeviceController', () => {
  var fixtures, req, res

  var platform = 'ios_macos'
  var version = '1.0.6'

  before(() =>
    setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1', email: 'a@b.c'}).save(),
      u2: new User({name: 'U2', email: 'b@b.c'}).save()
    }))
    .then(props => fixtures = props))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    req.login(fixtures.u1.id)
    nock('https://onesignal.com').post('/api/v1/players').reply(200, { success: true, id: '000' })
  })

  describe('#create', () => {
    it('adds a device to the database', () => {
      var token = '00000-0000-0000-000'

      _.extend(req.params, {
        token,
        platform: platform
      })

      req.headers = {'ios-version': version}

      return DeviceController.create(req, res)
      .then(() => {
        return Device.where('token', '=', token)
        .fetch()
        .then(device => {
          expect(device).to.exist
          expect(device.get('token')).to.equal(token)
          expect(device.get('platform')).to.equal(platform)
          expect(device.get('version')).to.equal(version)
          expect(device.get('user_id')).to.equal(fixtures.u1.id)
        })
      })
    })

    it('replaces the same device with a newer version', () => {
      var oldVersion = '1.0.5'
      var token = '11111-0000-0000-111'

      _.extend(req.params, {
        token,
        platform: platform
      })

      req.headers = {'ios-version': version}

      return Device.forge({
        token,
        platform,
        version: oldVersion
      }).save()
      .then(() => DeviceController.create(req, res))
      .then(() => {
        return Device.where('token', '=', token)
        .fetchAll()
        .then(devices => {
          expect(devices.length).to.equal(1)
          expect(devices.models[0].get('token')).to.equal(token)
          expect(devices.models[0].get('platform')).to.equal(platform)
          expect(devices.models[0].get('version')).to.equal(version)
          expect(devices.models[0].get('user_id')).to.equal(fixtures.u1.id)
        })
      })
    })

    it('switches current device to new user', () => {
      var token = '22222-0000-0000-222'
      _.extend(req.params, {
        token,
        platform: platform
      })

      req.headers = {'ios-version': version}

      return Device.fetchAll()
      .then(devices => Promise.map(devices.models, device => device.destroy()))
      .then(() => Device.forge({
        token: req.param('token'),
        platform: platform,
        version: version,
        user_id: fixtures.u2.id
      }).save())
      .then(() => DeviceController.create(req, res)
        .then(() => {
          return Device.where('token', '=', token)
          .fetch()
          .then(device => {
            expect(device).to.exist
            expect(device.get('token')).to.equal(token)
            expect(device.get('user_id')).to.equal(fixtures.u1.id)
          })
        })
      )
    })
  })
})

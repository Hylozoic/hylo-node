var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var MobileAppController = require(root('api/controllers/MobileAppController'))

const mockIosStoreUrl = 'http://get-my-ios-app.com/lol'
const mockAndroidStoreUrl = 'http://get-my-android-app.com/lol'

describe('MobileAppController', () => {
  var req, res, tmpVar1, tmpVar2
  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    tmpVar1 = process.env.IOS_APP_STORE_URL
    tmpVar2 = process.env.ANDROID_APP_STORE_URL
    process.env.IOS_APP_STORE_URL = mockIosStoreUrl
    process.env.ANDROID_APP_STORE_URL = mockAndroidStoreUrl
  })

  afterEach(() => {
    process.env.IOS_APP_STORE_URL = tmpVar1
    process.env.ANDROID_APP_STORE_URL = tmpVar2
  })

  describe('updateInfo', () => {
    it('returns the force update object', () => {
      var expected = {
        type: 'force',
        title: 'A new version of the app is available',
        message: 'The version you are using is no longer compatible with the site. Please go to the App Store now to update',
        iTunesItemIdentifier: '1002185140'
      }
      MobileAppController.updateInfo({}, res)
      expect(res.body).to.deep.equal(expected)
    })
  })

  describe('checkShouldUpdate', () => {
    it('returns the expected object for ios suggest update', () => {
      var expected = {
        type: 'suggest',
        title: 'An update is available',
        message: 'The version you are using is no longer up to date. Please go to the App Store to update.',
        link: mockIosStoreUrl
      }

      req.params = {'ios-version': 'test-suggest'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.deep.equal(expected)
    })

    it('returns the expected object for ios < 2.1', () => {
      var expected = {
        type: 'force',
        title: 'A new version of the app is available',
        message: 'The version you are using is no longer supported. Please go to the App Store now to update.',
        link: mockIosStoreUrl
      }

      req.params = {'ios-version': '2.0'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.deep.equal(expected)
    })

    it('returns the expected object for android < 2.1', () => {
      var expected = {
        type: 'force',
        title: 'A new version of the app is available',
        message: 'The version you are using is no longer supported. Please go to the App Store now to update.',
        link: mockIosStoreUrl
      }

      req.params = {'android-version': '2.0'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.deep.equal(expected)
    })

    it('returns the expected object for android suggest update', () => {
      var expected = {
        type: 'suggest',
        title: 'An update is available',
        message: 'The version you are using is no longer up to date. Please go to the Play Store to update.',
        link: mockAndroidStoreUrl
      }

      req.params = {'android-version': 'test-suggest'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.deep.equal(expected)
    })

    it('returns the expected object for android force update', () => {
      var expected = {
        type: 'force',
        title: 'A new version of the app is available',
        message: 'The version you are using is no longer supported. Please go to the Play Store now to update.',
        link: mockAndroidStoreUrl
      }

      req.params = {'android-version': '1.9'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.deep.equal(expected)
    })

    it('returns undefined for android version 2.1', () => {
      req.params = {'android-version': '2.1'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.equal(undefined)
    })

    it('returns undefined for ios version 2.1', () => {
      req.params = {'ios-version': '2.1'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.equal(undefined)
    })

    it('returns undefined for android version > 2.1', () => {
      req.params = {'android-version': '2.1.1'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.equal(undefined)
    })

    it('returns undefined for ios version > 2.1', () => {
      req.params = {'ios-version': '2.1.1'}
      MobileAppController.checkShouldUpdate(req, res)
      expect(res.body).to.equal(undefined)
    })
  })
})

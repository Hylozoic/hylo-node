var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var MobileAppController = require(root('api/controllers/MobileAppController'))

describe('MobileAppController', () => {
  var req, res
  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('checkShouldUpdate', () => {
    describe('calls the resultBuilder with the right params', () => {
      // it('returns the expected object for ios suggest update', () => {
      //   var expected = {
      //     type: 'suggest',
      //     title: 'An update is available',
      //     message: 'The version you are using is not longer up to date. Please go to the App Store to update.',
      //     link: 'https://itunes.apple.com/app/id1002185140'
      //   }
      //
      //   req.params = {'ios-version': '2.0'}
      //   MobileAppController.checkShouldUpdate(req, res)
      //   expect(res.body).to.deep.equal(expected)
      // })
      it('returns the expected object for ios force update', () => {
        var expected = {
          type: 'force',
          title: 'A new version of the app is available',
          message: 'The version you are using is no longer compatible with the site. Please go to the App Store now to update',
          link: 'https://itunes.apple.com/app/id1002185140'
        }

        req.params = {'ios-version': '1.9'}
        MobileAppController.checkShouldUpdate(req, res)
        expect(res.body).to.deep.equal(expected)
      })
      // it('returns the expected object for android suggest update', () => {
      //   var expected = {
      //     type: 'suggest',
      //     title: 'An update is available',
      //     message: 'The version you are using is not longer up to date. Please go to the Play Store to update.',
      //     link: 'https://play.google.com/store/apps/details?id=com.hylo.reactnative'
      //   }
      //
      //   req.params = {'android-version': '2.0'}
      //   MobileAppController.checkShouldUpdate(req, res)
      //   expect(res.body).to.deep.equal(expected)
      // })
      it('returns the expected object for android force update', () => {
        var expected = {
          type: 'force',
          title: 'A new version of the app is available',
          message: 'The version you are using is no longer compatible with the site. Please go to the Play Store now to update',
          link: 'https://play.google.com/store/apps/details?id=com.hylo.reactnative'
        }

        req.params = {'android-version': '1.9'}
        MobileAppController.checkShouldUpdate(req, res)
        expect(res.body).to.deep.equal(expected)
      })
    })
  })
})

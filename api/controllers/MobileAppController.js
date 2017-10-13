module.exports = {
  updateInfo: function (req, res) {
    var iTunesItemIdentifier = '1002185140'
    var link = `https://itunes.apple.com/app/id${iTunesItemIdentifier}`
    var store = 'App Store'
    if (req.headers['android-version']) {
      link = 'https://play.google.com/store/apps/details?id=com.hylo.reactnative'
      store = 'Play Store'
    }

    var result = {
      type: 'force',
      title: 'A new version of the app is available',
      message: `The version you are using is no longer compatible with the site. Please go to the ${store} now to update.`,
      link
    }
    return res.ok(result)
  },
  checkShouldUpdate: function (req, res) {
    /*
    Format for result:
    result = {
      type: 'force',  // can be 'force' or 'suggest'
      title: 'A new version of the app is available',
      message: 'You can go to the App Store now to update',
      iTunesItemIdentifier: '1002185140'
    }
    */
    var SUGGEST = 'suggest'
    var FORCE = 'force'
    var IOS = 'ios'
    var ANDROID = 'android'
    var result = {}

    switch (req.param('ios-version')) {
      case '2.0':
        result = resultBuilder(SUGGEST, IOS)
        break
      case '1.9':
        result = resultBuilder(FORCE, IOS)
        break
      case undefined:
        break
      default:
        result = resultBuilder(FORCE, IOS)
    }

    switch (req.param('android-version')) {
      case '2.0':
        result = resultBuilder(SUGGEST, ANDROID)
        break
      case '1.9':
        result = resultBuilder(FORCE, ANDROID)
        break
      case undefined:
        break
      default:
        result = resultBuilder(FORCE, ANDROID)
    }

    return res.ok(result)
  }
}

function resultBuilder (type, platform) {
  var iTunesItemIdentifier = '1002185140'
  var appStoreLink = `https://itunes.apple.com/app/id${iTunesItemIdentifier}`
  var playStoreLink = 'https://play.google.com/store/apps/details?id=com.hylo.reactnative'
  var title = type === 'suggest' ? 'An update is available' : 'A new version of the app is available'
  var store = platform === 'ios' ? 'App Store' : 'Play Store'
  var suggestUpdateMessage = `The version you are using is not longer up to date. Please go to the ${store} to update.`
  var forceUpdateMessage = `The version you are using is no longer compatible with the site. Please go to the ${store} now to update`
  var message = type === 'suggest' ? suggestUpdateMessage : forceUpdateMessage
  var link = platform === 'ios' ? appStoreLink : playStoreLink
  return {
    type,
    title,
    message,
    link
  }
}

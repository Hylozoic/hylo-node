module.exports = {

  updateInfo: function (req, res) {
    var result = {}
    var iTunesItemIdentifier = '1002185140'
    var forceUpdate = {
      type: 'force',
      title: 'A new version of the app is available',
      iTunesItemIdentifier
    }
    var suggestUpdate = {
      type: 'suggest',
      title: 'An update is available',
      iTunesItemIdentifier
    }

    /*
    Format for result:
    result = {
      type: 'force',  // can be 'force' or 'suggest'
      title: 'A new version of the app is available',
      message: 'You can go to the App Store now to update',
      iTunesItemIdentifier: '1002185140'
    }
    */
    switch (req.param('ios-version')) {
      // case '2.0':
      //   result = Object.assign(
      //     suggestUpdate,
      //     { message: 'The version you are using is not longer up to date. Please go to the App Store to update.' }
      //   )
      //   break
      case '1.9':
        result = Object.assign(
          forceUpdate,
          { message: 'The version you are using is no longer compatible with the site. Please go to the App Store now to update' }
        )
        break
      case undefined:
        break
      default:
        result = Object.assign(
          forceUpdate,
          { message: 'The version you are using is no longer compatible with the site. Please go to the App Store now to update' }
        )
    }

    switch (req.param('android-version')) {
      // case '1.9':
      //   result = Object.assign(
      //     suggestUpdate,
      //     { message: 'The version you are using is not longer up to date. Please go to the App Store to update.' }
      //   )
      //   break
      case '1.9':
        result = Object.assign(
          forceUpdate,
          { message: 'The version you are using is no longer compatible with the site. Please go to the App Store now to update' }
        )
        break
      case undefined:
        break
      default:
        result = Object.assign(
          forceUpdate,
          { message: 'The version you are using is no longer compatible with the site. Please go to the App Store now to update' }
        )
    }
    res.ok(result)
  }
}

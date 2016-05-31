module.exports = {

  updateInfo: function (req, res) {
    var result = {}

    /*
    Format for result:
    result = {
      type: 'force',  // can be 'force' or 'suggest'
      title: 'A new version of the app is available',
      message: 'You can go to the App Store now to update',
      iTunesItemIdentifier: '1002185140'
    }
    */

    switch (req.headers['ios-version']) {
      case '1.6':
      case '1.65':
        result = {
          type: 'force',  // can be 'force' or 'suggest'
          title: 'A new version of the app is available',
          message: 'The version you are using is no longer compatible with the site. Please go to the App Store now to update',
          iTunesItemIdentifier: '1002185140'
        }
        break
      case undefined:
        break
    }

    switch (req.headers['android-version']) {
      case undefined:
        break
    }

    res.ok(result)
  }
}

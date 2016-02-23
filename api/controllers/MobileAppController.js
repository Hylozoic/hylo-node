module.exports = {

  updateInfo: function (req, res) {
    var result = {}

    switch (req.headers['ios-version']) {
      /*
      Format for result:
      result = {
        type: 'force',  // can be 'force' or 'suggest'
        title: 'A new version of the app is available',
        message: 'You can go to the App Store now to update',
        iTunesItemIdentifier: '1002185140'
      }
      */
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

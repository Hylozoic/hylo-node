module.exports = {

  updateInfo: function (req, res) {
    var result = {}

    switch (req.headers['ios-version']) {
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

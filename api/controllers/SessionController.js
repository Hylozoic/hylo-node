module.exports = {

  destroy: function(req, res) {
    req.session.authenticated = false;

    // now sign out of Play! janky janky janky.
    res.redirect('/logout');
  }

}
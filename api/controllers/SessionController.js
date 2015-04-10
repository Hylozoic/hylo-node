module.exports = {

  destroy: function(req, res) {
    req.session.destroy();

    // now sign out of Play! janky janky janky.
    res.redirect('/logout');
  }

}
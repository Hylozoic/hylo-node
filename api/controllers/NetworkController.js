module.exports = {

  findOne: function(req, res) {
    res.ok(res.locals.network);
  }

};
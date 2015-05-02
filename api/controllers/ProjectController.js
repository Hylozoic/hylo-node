module.exports = {

  create: function(req, res) {
    console.log(JSON.stringify(req.allParams(), null, 2));
    res.ok({});
  }

};
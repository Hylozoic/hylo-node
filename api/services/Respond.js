module.exports = {
  with: function(obj, res) {
    var json = JSON.stringify(obj, null, (process.env.PRETTY_JSON ? 2 : null));
    res.setHeader('Content-Type', 'application/json');
    res.send(json);
  }
}
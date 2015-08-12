var moment = require('moment');

var sanitizeForJSON = function(str){
  return str.replace(/\\/g, "\\\\")
  .replace(/\n/g, "\\n")
  .replace(/\r/g, "\\r")
  .replace(/\t/g, "\\t")
  .replace(/\f/g, "\\f")
  .replace(/"/g,"\\\"")
  .replace(/'/g,"\\\'")
  .replace(/\&/g, "\\&");
};

var nvd3Format = function(data, times) {
  return _(data).keys().map(name => ({
    key: sanitizeForJSON(name),
    values: _.map(times, t => [Number(t), data[name][t] || 0])
  }))
  .sortBy(series => _.sum(series.values, v => -v[1]))
  .value();
};

var countNew = function(model, interval, unit) {
  var now = moment(),
    then = moment().clone().subtract(interval, unit),
    data = {},
    times = {},
    withRelated = (model === Comment ? ['post.communities'] : ['communities']);

  return model.query(q => {
    q.whereRaw('created_at between ? and ?', [then, now]);

    if (model === Post) {
      q.where('type', '!=', 'welcome');
    }
  }).fetchAll({withRelated: withRelated})
  .then(results => {
    results.models.map(x => {
      var community = (model === Comment ? x.relations.post : x).relations.communities.first(),
        series = (community ? community.get('name').substring(0, 20) : 'none'),
        time = Number(moment(x.get('created_at')).startOf('day'));

      // create a nested hash for communities & times
      if (!data[series]) data[series] = {};
      if (!data[series][time]) data[series][time] = 0;
      data[series][time] += 1;

      // keep a list of all times seen;
      // the stacked bar chart in nvd3 requires all series
      // to be the same length, so we have to zero-fill
      if (!times[time]) times[time] = true;
    });

    return nvd3Format(data, _.keys(times).sort());
  });
};

module.exports = {

  index: function(req, res) {
    res.ok(req.user);
  },

  metrics: function(req, res) {
    Promise.props({
      newUsers: countNew(User, 1, 'month'),
      newPosts: countNew(Post, 1, 'month'),
      newComments: countNew(Comment, 1, 'month')
    })
    .then(res.ok, res.serverError);
  }

};

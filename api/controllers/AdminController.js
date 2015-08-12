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
  var maxSeries;
  return _(data).keys()
  .tap(keys => maxSeries = Math.min(keys.length, 19))
  .sortByAll([key => -1 * _.sum(_.values(data[key])), _.identity])
  .reduce((result, name, index, keys) => {
    if (index < maxSeries) {
      result.push({
        key: sanitizeForJSON(name),
        values: _.map(times, t => [Number(t), data[name][t] || 0])
      });
    } else if (index === maxSeries) {
      var otherNames = keys.slice(index, keys.length);
      result.push({
        key: format('Other (%s)', otherNames.length),
        values: _.map(times, t => [Number(t), _.sum(otherNames, name => data[name][t] || 0)])
      });
    }
    return result;
  }, []);
};

var countNew = function(model, interval, unit) {
  var now = moment(),
    then = now.clone().subtract(interval, unit),
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
        series = (community ? community.get('name').substring(0, 15) : 'none'),
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

  countNew: countNew,

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

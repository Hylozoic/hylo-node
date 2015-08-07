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

module.exports = {

  index: function(req, res) {
    res.ok(req.user);
  },

  test: function(req, res) {
    var jobs = require('kue').createQueue();

      jobs.create('test', {
        title: 'My Very Own Test Job',
        factor: 'seven',
        arity: 'twelve',
        depth: 'quite in-'
      })
      .attempts(20)
      .backoff({delay: 1000, type: 'exponential'})
      .save(function(err) {
        if (err) return res.serverError(err);
        res.ok('testify!')
      });
  },

  metrics: function(req, res) {
    var now = moment(),
      then = moment().clone().subtract(1, 'month'),
      data = {},
      times = {};

    User.query(q => {
      q.whereRaw('created_at between ? and ?', [then, now]);
    }).fetchAll({withRelated: ['communities']})
    .then(users => {
      users.models.map(u => {
        var community = u.relations.communities.first(),
          series = (community ? community.get('name').substring(0, 20) : 'none'),
          time = Number(moment(u.get('created_at')).startOf('day'));

        // create a nested hash for communities & times
        if (!data[series]) data[series] = {};
        if (!data[series][time]) data[series][time] = 0;
        data[series][time] += 1;

        // keep a list of all times seen;
        // the stacked bar chart in nvd3 requires all series
        // to be the same length, so we have to zero-fill
        if (!times[time]) times[time] = true;
      });

      var allTimes = _.keys(times).sort();

      // format data for nvd3
      return _.map(_.keys(data), series => ({
        key: sanitizeForJSON(series),
        values: _.map(allTimes, t => [Number(t), data[series][t] || 0])
      }));
    })
    .then(arr => ({newUsers: arr}))
    .then(res.ok, res.serverError);
  }

};

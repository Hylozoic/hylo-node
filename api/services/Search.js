var format = require('util').format;

module.exports = {

  forSeeds: function(opts) {
    return Post.query(function(qb) {

      qb.limit(opts.limit);
      qb.offset(opts.offset);

      if (opts.communities) {
        qb.join('post_community', 'post_community.post_id', '=', 'post.id');
        qb.whereIn('post_community.community_id', [opts.communities]);
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['post.name', 'post.description']
        });
      }

    });
  },

  forUsers: function(opts) {
    return User.query(function(qb) {

      qb.limit(opts.limit || 1000);
      qb.offset(opts.offset || 0);
      qb.distinct('users.id');
      qb.where("users.active", "=", true);

      if (opts.communities) {
        qb.join('users_community', 'users_community.users_id', '=', 'users.id');
        qb.whereIn('users_community.community_id', opts.communities);
      }

      if (opts.term) {
        qb.join('users_skill', 'users_skill.user_id', '=', 'users.id');
        qb.join('users_org', 'users_org.user_id', '=', 'users.id');
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['users.name', 'users.bio', 'users_skill.skill_name', 'users_org.org_name']
        });
      }

      if (opts.start_time && opts.end_time) {
        qb.whereRaw('users.date_created between ? and ?', [opts.start_time, opts.end_time]);
      }

    });
  },

  addTermToQueryBuilder: function(term, qb, opts) {
    var query = _.chain(term.split(/\s*\s/)) // split on whitespace
      .map(function(word) {
        // remove any invalid characters
        return word.replace(/[,;'|:&()!]+/, '');
      })
      .reject(_.isEmpty)
      .reduce(function(result, word, key) {
        // build the tsquery string using logical | (OR) operands
        result += " | " + word;
        return result;
      }).value(),

      statement = '(' + opts.columns.map(function(col) {
      return format("(to_tsvector('english', %s) @@ to_tsquery(?))", col);
    }).join(' or ') + ')',

      values = _.times(opts.columns.length, function() { return query });

    qb.where(function() {
      this.whereRaw(statement, values);
    });
  }

}
module.exports = {

  forProjects: function(opts) {
    return Project.query(qb => {
      if (opts.user) {
        qb.leftJoin('projects_users', () => this.on('projects.id', '=', 'projects_users.project_id'));
        qb.where('projects.user_id', opts.user).orWhere(function() {
          this.where('projects_users.user_id', opts.user);
        });
      }

      if (opts.community) {
        qb.where('community_id', opts.community);
      }

      qb.groupBy('projects.id');
    });
  },

  forPosts: function(opts) {
    return Post.query(function(qb) {

      qb.limit(opts.limit);
      qb.offset(opts.offset);
      qb.where({'post.active': true});

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('*, count(*) over () as total'));

      if (opts.users) {
        qb.whereIn('post.creator_id', opts.users);
      }

      if (opts.communities) {
        qb.join('post_community', 'post_community.post_id', '=', 'post.id');
        qb.whereIn('post_community.community_id', opts.communities);
      }

      if (opts.project) {
        qb.join('posts_projects', 'posts_projects.post_id', '=', 'post.id');
        qb.where('posts_projects.project_id', opts.project);
      } else {
        qb.where('post.visibility', '!=', Post.Visibility.DRAFT_PROJECT);
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['post.name', 'post.description']
        });
      }

      if (opts.follower) {
        qb.join('follower', 'follower.post_id', '=', 'post.id');
        qb.where('follower.user_id', opts.follower);
        qb.where('post.creator_id', '!=', opts.follower);
      }

      if (opts.type && opts.type != 'all') {
        qb.where({type: opts.type});
      }

      if (opts.start_time && opts.end_time) {
        qb.whereRaw('((post.creation_date between ? and ?) or (post.last_updated between ? and ?))',
          [opts.start_time, opts.end_time, opts.start_time, opts.end_time]);
      }

      if (opts.visibility) {
        qb.where({visibility: opts.visibility});
      }

      if (opts.sort) {
        qb.orderBy(opts.sort, 'desc');
      }

    });
  },

  forUsers: function(opts) {
    return User.query(function(qb) {

      qb.limit(opts.limit || 1000);
      qb.offset(opts.offset || 0);
      qb.where("users.active", "=", true);

      // this is not necessarily what any consumer desires, but
      // some ordering must be specified for pagination
      qb.orderBy('name', 'asc');

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('count(users.*) over () as total'));

      if (opts.communities) {
        qb.join('users_community', 'users_community.users_id', '=', 'users.id');
        qb.whereIn('users_community.community_id', opts.communities);
        qb.where('users_community.active', true);
      }

      if (opts.project) {
        qb.join('projects_users', 'projects_users.user_id', '=', 'users.id');
        qb.whereIn('projects_users.project_id', opts.project);
      }

      if (opts.autocomplete) {
        qb.whereRaw("users.name ilike ?", opts.autocomplete + '%');
      }

      if (opts.term) {
        qb.leftJoin('users_skill', 'users_skill.user_id', '=', 'users.id');
        qb.leftJoin('users_org', 'users_org.user_id', '=', 'users.id');
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['users.name', 'users.bio', 'users_skill.skill_name', 'users_org.org_name']
        });
      }

      // prevent duplicates due to the joins
      qb.groupBy('users.id');

      if (opts.start_time && opts.end_time) {
        qb.whereRaw('users.date_created between ? and ?', [opts.start_time, opts.end_time]);
      }

    });
  },

  addTermToQueryBuilder: function(term, qb, opts) {
    var query = _.chain(term.split(/\s*\s/)) // split on whitespace
      .map(function(word) {
        // remove any invalid characters and add prefix matching
        return word.replace(/[,;'|:&()!\\]+/, '') + ':*';
      })
      .reject(_.isEmpty)
      .reduce(function(result, word, key) {
        // build the tsquery string using logical AND operands
        result += " & " + word;
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
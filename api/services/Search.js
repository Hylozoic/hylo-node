var listModelQuerySettings = (qb, table, column, opts) => {
  qb.limit(opts.limit || 20)

  // this will require the fetch or fetchAll call to have {columns: [column]}
  qb.groupBy(column)

  if (opts.autocomplete) {
    Search.addTermToQueryBuilder(opts.autocomplete, qb, {
      columns: [format('%s.%s', table, column)]
    })
    // qb.whereRaw('users_org.org_name ilike ?', opts.autocomplete + '%')
  }

  qb.whereRaw(format('length(%s) < 40', column))
}

module.exports = {
  forProjects: function (opts) {
    return Project.query(qb => {
      if (opts.user) {
        qb.leftJoin('projects_users', function () {
          this.on('projects.id', '=', 'projects_users.project_id')
        })
        qb.where(function () {
          this.where('projects.user_id', opts.user)
          .orWhere('projects_users.user_id', opts.user)
        })
      }

      if (opts.community) {
        qb.where(function () {
          var clause = this.whereIn('community_id', opts.community)

          if (opts.includePublic) {
            clause.orWhere('visibility', Project.Visibility.PUBLIC)
          }

          if (opts.publicOnly) {
            clause.andWhere('visibility', Project.Visibility.PUBLIC)
          }
        })
      } else if (opts.publicOnly) {
        qb.where('visibility', Project.Visibility.PUBLIC)
      }

      if (opts.published) {
        qb.whereRaw('published_at is not null')
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['projects.title', 'projects.intention', 'projects.details']
        })
      }

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('projects.*, count(*) over () as total'))

      qb.limit(opts.limit)
      qb.offset(opts.offset)
      qb.groupBy('projects.id')
      qb.orderBy('projects.updated_at', 'desc')
    })
  },

  forCommunities: function (opts) {
    return Community.query(qb => {
      if (opts.communities) {
        qb.whereIn('community.id', opts.communities)
      }

      if (opts.autocomplete) {
        qb.whereRaw('community.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['community.name']
        })
      }

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('community.*, count(*) over () as total'))

      qb.limit(opts.limit)
      qb.offset(opts.offset)
      qb.groupBy('community.id')
      qb.orderBy('community.name', 'asc')
    })
  },

  forPosts: function (opts) {
    return Post.query(function (qb) {
      qb.limit(opts.limit)
      qb.offset(opts.offset)
      qb.where({'post.active': true})

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('post.*, count(*) over () as total'))

      if (opts.users) {
        qb.whereIn('post.user_id', opts.users)
      }

      if (opts.excludeUsers) {
        qb.whereNotIn('post.user_id', opts.excludeUsers)
      }

      if (opts.communities) {
        qb.join('post_community', 'post_community.post_id', '=', 'post.id')
        qb.whereIn('post_community.community_id', opts.communities)
        qb.groupBy(['post.id', 'post_community.post_id'])
      }

      if (opts.project) {
        qb.join('posts_projects', 'posts_projects.post_id', '=', 'post.id')
        qb.where('posts_projects.project_id', opts.project)
      } else {
        qb.where('post.visibility', '!=', Post.Visibility.DRAFT_PROJECT)
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['post.name', 'post.description']
        })
      }

      if (opts.follower) {
        qb.join('follower', 'follower.post_id', '=', 'post.id')
        qb.where('follower.user_id', opts.follower)
        qb.whereRaw('(post.user_id != ? or post.user_id is null)', opts.follower)
      }

      if (!opts.type || opts.type === 'all') {
        qb.where('post.type', '!=', 'welcome')
      } else if (opts.type !== 'all+welcome') {
        qb.where({type: opts.type})
      }

      if (opts.type === 'event' && opts.filter === 'future') {
        qb.whereRaw('(post.start_time > now())')
      }

      if (opts.start_time && opts.end_time) {
        qb.whereRaw('((post.created_at between ? and ?) or (post.updated_at between ? and ?))',
          [opts.start_time, opts.end_time, opts.start_time, opts.end_time])
      }

      if (opts.visibility) {
        qb.whereIn('visibility', opts.visibility)
      }

      if (opts.sort === 'suggested') {
        qb.join('user_post_relevance', 'user_post_relevance.post_id', '=', 'post.id')
        qb.where('user_post_relevance.user_id', opts.forUser)
        qb.orderBy('similarity', 'desc')
        qb.groupBy('similarity')
      } else if (opts.sort === 'fulfilled_at') {
        qb.orderByRaw('post.fulfilled_at desc, post.updated_at desc')
      } else if (Array.isArray(opts.sort)) {
        qb.orderBy(opts.sort[0], opts.sort[1])
      } else if (opts.sort) {
        qb.orderBy(opts.sort, 'desc')
      }
    })
  },

  forUsers: function (opts) {
    return User.query(function (qb) {
      qb.limit(opts.limit || 1000)
      qb.offset(opts.offset || 0)
      qb.where('users.active', '=', true)

      // this is not necessarily what any consumer desires, but
      // some ordering must be specified for pagination
      qb.orderBy('name', 'asc')

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('count(users.*) over () as total'))

      if (opts.communities && opts.project) {
        qb.leftJoin('users_community', 'users_community.user_id', '=', 'users.id')
        qb.leftJoin('projects_users', 'projects_users.user_id', '=', 'users.id')
        qb.leftJoin('projects', 'projects.user_id', '=', 'users.id')

        qb.where(function () {
          this.where(function () {
            this.whereIn('users_community.community_id', opts.communities)
            this.where('users_community.active', true)
          })
          .orWhere(function () {
            this.where('projects.id', opts.project)
            .orWhere('projects_users.project_id', opts.project)
          })
        })
      } else if (opts.communities) {
        qb.join('users_community', 'users_community.user_id', '=', 'users.id')
        qb.whereIn('users_community.community_id', opts.communities)
        qb.where('users_community.active', true)
      } else if (opts.project) {
        qb.join('projects_users', 'projects_users.user_id', '=', 'users.id')
        qb.leftJoin('projects', 'projects.user_id', '=', 'users.id')
        qb.where(function () {
          this.where('projects.id', opts.project)
          .orWhere('projects_users.project_id', opts.project)
        })
      }

      if (opts.autocomplete) {
        qb.whereRaw('users.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.term) {
        qb.leftJoin('users_skill', 'users_skill.user_id', '=', 'users.id')
        qb.leftJoin('users_org', 'users_org.user_id', '=', 'users.id')
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['users.name', 'users.bio', 'users_skill.skill_name', 'users_org.org_name']
        })
      }

      // prevent duplicates due to the joins
      qb.groupBy('users.id')

      if (opts.start_time && opts.end_time) {
        qb.whereRaw('users.created_at between ? and ?', [opts.start_time, opts.end_time])
      }

      if (opts.exclude) {
        qb.whereNotIn('id', opts.exclude)
      }
    })
  },

  forSkills: function (opts) {
    return Skill.query(qb => {
      listModelQuerySettings(qb, 'users_skill', 'skill_name', opts)
    })
  },

  forOrganizations: function (opts) {
    return Organization.query(qb => {
      listModelQuerySettings(qb, 'users_org', 'org_name', opts)
    })
  },

  addTermToQueryBuilder: function (term, qb, opts) {
    var query = _.chain(term.split(/\s*\s/)) // split on whitespace
    .map(word => word.replace(/[,;|:&()!\\]+/, ''))
    .reject(_.isEmpty)
    .map(word => word + ':*') // add prefix matching
    .reduce((result, word) => {
      // build the tsquery string using logical AND operands
      result += ' & ' + word
      return result
    }).value()

    var statement = format('(%s)',
      opts.columns
      .map(col => format("(to_tsvector('english', %s) @@ to_tsquery(?))", col))
      .join(' or '))

    var values = _.times(opts.columns.length, () => query)

    qb.where(function () {
      this.whereRaw(statement, values)
    })
  }

}

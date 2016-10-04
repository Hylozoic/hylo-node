import { get } from 'lodash'

module.exports = {
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
      qb.limit(opts.limit || 20)
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

      if (opts.tag) {
        qb.join('posts_tags', 'posts_tags.post_id', '=', 'post.id')
        qb.whereIn('posts_tags.tag_id', [opts.tag])
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['post.name', 'post.description']
        })
      }

      if (opts.type === Post.Type.THREAD || opts.follower) {
        qb.join('follower', 'follower.post_id', '=', 'post.id')
        if (opts.type === Post.Type.THREAD) {
          qb.where('follower.user_id', opts.follower)
        } else if (opts.follower) {
          qb.where('follower.user_id', opts.follower)
          qb.whereRaw('(post.user_id != ? or post.user_id is null)', opts.follower)
        }
      }

      if (!opts.type || opts.type === 'all') {
        qb.where(function () {
          this.where('post.type', '!=', 'welcome')
          .orWhere('post.type', null)
        }).andWhere('post.type', '!=', Post.Type.THREAD)
      } else if (opts.type !== 'all+welcome') {
        qb.where({type: opts.type})
      }

      if (opts.type === 'event' && opts.filter === 'future') {
        qb.whereRaw('(post.start_time > now())')
      }

      if (opts.type === 'project' && opts.filter === 'mine') {
        qb.leftJoin('follower', 'post.id', 'follower.post_id')
        qb.where(function () {
          this.where('post.user_id', opts.currentUserId)
          .orWhere('follower.user_id', opts.currentUserId)
        })
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
      } else if (opts.sort === 'post.updated_at' && get(opts.communities, 'length') === 1) {
        qb.orderByRaw('post_community.pinned desc, post.updated_at desc')
      } else if (opts.sort) {
        qb.orderBy(opts.sort, 'desc')
      }

      if (opts.omit) {
        qb.whereNotIn('post.id', opts.omit)
      }

      if (opts.communities) {
        qb.select('post_community.pinned')
        qb.join('post_community', 'post_community.post_id', '=', 'post.id')
        qb.whereIn('post_community.community_id', opts.communities)
        qb.groupBy(['post.id', 'post_community.post_id', 'post_community.pinned'])
      }

      if (!opts.includeChildren) {
        qb.where('parent_post_id', null)
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
      qb.select(bookshelf.knex.raw('users.*, count(users.*) over () as total'))

      if (opts.communities) {
        qb.join('users_community', 'users_community.user_id', 'users.id')
        qb.whereIn('users_community.community_id', opts.communities)
        qb.where('users_community.active', true)
      }

      if (opts.autocomplete) {
        qb.whereRaw('users.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.term) {
        qb.leftJoin('tags_users', 'tags_users.user_id', 'users.id')
        qb.leftJoin('tags', 'tags.id', 'tags_users.tag_id')
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['users.name', 'users.bio', 'tags.name']
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

  forTags: function (opts) {
    return Tag.query(q => {
      if (opts.communities) {
        q.join('communities_tags', 'communities_tags.tag_id', '=', 'tags.id')
        q.whereIn('communities_tags.community_id', opts.communities)
      }
      if (opts.autocomplete) {
        q.whereRaw('tags.name ilike ?', opts.autocomplete + '%')
      }

      q.groupBy('tags.id')
      q.limit(opts.limit)
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

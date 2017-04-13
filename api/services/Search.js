import { get } from 'lodash'
import { countTotal } from '../../lib/util/knex'

module.exports = {
  forCommunities: function (opts) {
    return Community.query(qb => {
      if (opts.communities) {
        qb.whereIn('communities.id', opts.communities)
      }

      if (opts.autocomplete) {
        qb.whereRaw('communities.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['communities.name']
        })
      }

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('communities.*, count(*) over () as total'))

      qb.limit(opts.limit)
      qb.offset(opts.offset)
      qb.groupBy('communities.id')
      qb.orderBy('communities.name', 'asc')
    })
  },

  forPosts: function (opts) {
    return Post.query(function (qb) {
      qb.limit(opts.limit || 20)
      qb.offset(opts.offset)
      qb.where({'posts.active': true})

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('posts.*, count(*) over () as total'))

      if (opts.users) {
        qb.whereIn('posts.user_id', opts.users)
      }

      if (opts.excludeUsers) {
        qb.whereNotIn('posts.user_id', opts.excludeUsers)
      }

      if (opts.tag) {
        qb.join('posts_tags', 'posts_tags.post_id', '=', 'posts.id')
        qb.whereIn('posts_tags.tag_id', [opts.tag])
      }

      if (opts.term) {
        Search.addTermToQueryBuilder(opts.term, qb, {
          columns: ['posts.name', 'posts.description']
        })
      }

      if (opts.type === Post.Type.THREAD || opts.follower) {
        qb.join('follows', 'follows.post_id', '=', 'posts.id')
        if (opts.type === Post.Type.THREAD) {
          qb.where('follows.user_id', opts.follower)
        } else if (opts.follower) {
          qb.where('follows.user_id', opts.follower)
          qb.whereRaw('(posts.user_id != ? or posts.user_id is null)', opts.follower)
        }
      }

      if (!opts.type || opts.type === 'all') {
        qb.where(function () {
          this.where('posts.type', 'not in', ['welcome', Post.Type.THREAD])
          .orWhere('posts.type', null)
        })
      } else if (opts.type !== 'all+welcome') {
        qb.where({type: opts.type})
      }

      if (opts.type === 'event' && opts.filter === 'future') {
        qb.whereRaw('(posts.starts_at > now())')
      }

      if (opts.type === 'project' && opts.filter === 'mine') {
        qb.leftJoin('follows', 'posts.id', 'follows.post_id')
        qb.where(function () {
          this.where('posts.user_id', opts.currentUserId)
          .orWhere('follows.user_id', opts.currentUserId)
        })
      }

      if (opts.start_time && opts.end_time) {
        qb.whereRaw('((posts.created_at between ? and ?) or (posts.updated_at between ? and ?))',
          [opts.start_time, opts.end_time, opts.start_time, opts.end_time])
      }

      if (opts.visibility) {
        qb.whereIn('visibility', opts.visibility)
      }

      if (opts.sort === 'suggested') {
        qb.join('user_post_relevance', 'user_post_relevance.post_id', '=', 'posts.id')
        qb.where('user_post_relevance.user_id', opts.forUser)
        qb.orderBy('similarity', 'desc')
        qb.groupBy('similarity')
      } else if (opts.sort === 'fulfilled_at') {
        qb.orderByRaw('posts.fulfilled_at desc, posts.updated_at desc')
      } else if (Array.isArray(opts.sort)) {
        qb.orderBy(opts.sort[0], opts.sort[1])
      } else if (opts.sort === 'posts.updated_at' && get(opts.communities, 'length') === 1) {
        qb.orderByRaw('communities_posts.pinned desc, posts.updated_at desc')
      } else if (opts.sort) {
        qb.orderBy(opts.sort, 'desc')
      }

      if (opts.omit) {
        qb.whereNotIn('posts.id', opts.omit)
      }

      if (opts.communities) {
        qb.select('communities_posts.pinned')
        qb.join('communities_posts', 'communities_posts.post_id', '=', 'posts.id')
        qb.whereIn('communities_posts.community_id', opts.communities)
        qb.groupBy(['posts.id', 'communities_posts.post_id', 'communities_posts.pinned'])
      }

      if (opts.parent_post_id) {
        qb.where('parent_post_id', opts.parent_post_id)
        qb.where('is_project_request', false)
      }

      if (!opts.parent_post_id && !opts.includeChildren) {
        qb.where('parent_post_id', null)
      }
    })
  },

  forUsers: function (opts) {
    return User.query(function (qb) {
      qb.limit(opts.limit || 1000)
      qb.offset(opts.offset || 0)
      qb.where('users.active', '=', true)

      qb.orderBy(opts.sort || 'name', 'asc')
      countTotal(qb, 'users')

      if (opts.communities) {
        qb.join('communities_users', 'communities_users.user_id', 'users.id')
        qb.whereIn('communities_users.community_id', opts.communities)
        qb.where('communities_users.active', true)
      }

      if (opts.autocomplete) {
        Search.addTermToQueryBuilder(opts.autocomplete, qb, {
          columns: ['users.name']
        })
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

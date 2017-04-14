import { countTotal } from '../../../lib/util/knex'
import addTermToQueryBuilder from './addTermToQueryBuilder'

export default function (opts) {
  const { communities } = opts
  return User.query(function (qb) {
    qb.limit(opts.limit || 1000)
    qb.offset(opts.offset || 0)
    qb.where('users.active', '=', true)

    if (opts.sort === 'joinDate') {
      if (!communities || communities.length !== 1) {
        throw new Error("When sorting by join date, you must specify exactly one community.")
      }
      // TODO
    } else {
      qb.orderBy(opts.sort || 'name', 'asc')
    }

    countTotal(qb, 'users')

    if (communities) {
      qb.join('communities_users', 'communities_users.user_id', 'users.id')
      qb.whereIn('communities_users.community_id', opts.communities)
      qb.where('communities_users.active', true)
    }

    if (opts.autocomplete) {
      addTermToQueryBuilder(opts.autocomplete, qb, {
        columns: ['users.name']
      })
    }

    if (opts.term) {
      qb.leftJoin('tags_users', 'tags_users.user_id', 'users.id')
      qb.leftJoin('tags', 'tags.id', 'tags_users.tag_id')
      addTermToQueryBuilder(opts.term, qb, {
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
}

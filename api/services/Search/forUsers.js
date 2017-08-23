import { countTotal } from '../../../lib/util/knex'
import addTermToQueryBuilder from './addTermToQueryBuilder'

export default function (opts) {
  const { communities, network } = opts
  return User.query(function (qb) {
    qb.limit(opts.limit || 1000)
    qb.offset(opts.offset || 0)
    qb.where('users.active', '=', true)

    if (opts.sort === 'join') {
      if (!communities || communities.length !== 1) {
        throw new Error('When sorting by join date, you must specify exactly one community.')
      }
      qb.orderBy('communities_users.created_at', 'desc')
      qb.groupBy(['users.id', 'communities_users.created_at'])
    } else {
      qb.orderBy(opts.sort || 'name', 'asc')

      // prevent duplicates due to the joins
      qb.groupBy('users.id')
    }

    countTotal(qb, 'users', opts.totalColumnName)

    if (communities) {
      qb.join('communities_users', 'communities_users.user_id', 'users.id')
      qb.whereIn('communities_users.community_id', opts.communities)
      qb.where('communities_users.active', true)
    }

    if (network) {
      qb.distinct()
      qb.where({'communities.network_id': network})
      qb.join('communities_users', 'users.id', 'communities_users.user_id')
      qb.join('communities', 'communities.id', 'communities_users.community_id')
    }

    if (opts.autocomplete) {
      addTermToQueryBuilder(opts.autocomplete, qb, {
        columns: ['users.name']
      })
    }

    if (opts.term) {
      qb.where('user_id', 'in', FullTextSearch.search({
        term: opts.term,
        type: 'person',
        subquery: true
      }))
    }

    if (opts.start_time && opts.end_time) {
      qb.whereRaw('users.created_at between ? and ?', [opts.start_time, opts.end_time])
    }

    if (opts.exclude) {
      qb.whereNotIn('id', opts.exclude)
    }
  })
}

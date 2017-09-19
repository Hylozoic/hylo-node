import { countTotal } from '../../../lib/util/knex'
import addTermToQueryBuilder from './addTermToQueryBuilder'
import { curry, pick } from 'lodash'

export default function (opts) {
  const { communities, network } = opts
  return User.query(function (qb) {
    qb.limit(opts.limit || 1000)
    qb.offset(opts.offset || 0)
    qb.where('users.active', '=', true)

    filterAndSortUsers(pick(opts, 'autocomplete', 'term', 'sort'), qb)

    if (opts.sort === 'join') {
      if (!communities || communities.length !== 1) {
        throw new Error('When sorting by join date, you must specify exactly one community.')
      }
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

    if (opts.start_time && opts.end_time) {
      qb.whereRaw('users.created_at between ? and ?', [opts.start_time, opts.end_time])
    }

    if (opts.exclude) {
      qb.whereNotIn('id', opts.exclude)
    }

    if (network || (communities && communities.length > 1)) {
      // prevent duplicates due to the joins
      if (opts.sort === 'join') {
        qb.groupBy(['users.id', 'communities_users.created_at'])
      } else {
        qb.groupBy('users.id')
      }
    }
  })
}

export const filterAndSortUsers = curry(({ autocomplete, term, sort }, q) => {
  if (autocomplete) {
    addTermToQueryBuilder(autocomplete, q, {
      columns: ['users.name']
    })
  }

  if (term) {
    q.where('users.id', 'in', FullTextSearch.search({
      term,
      type: 'person',
      subquery: true
    }))
  }

  if (sort && !['name', 'location', 'join'].includes(sort)) {
    throw new Error(`Cannot sort by "${sort}"`)
  }

  if (sort === 'join') {
    q.orderBy('communities_users.created_at', 'desc')
  } else {
    q.orderBy(sort || 'name', 'asc')
  }
})

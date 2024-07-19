const { GraphQLYogaError } = require('@graphql-yoga/node')
import { countTotal } from '../../../lib/util/knex'
import { filterAndSortUsers } from './util'

export default function (opts) {
  const { groups } = opts
  return User.query(function (qb) {
    qb.limit(opts.limit || 1000)
    qb.offset(opts.offset || 0)
    qb.where('users.active', '=', true)

    filterAndSortUsers({
      autocomplete: opts.autocomplete,
      boundingBox: opts.boundingBox,
      search: opts.term,
      sortBy: opts.sort
    }, qb)

    if (opts.sort === 'join') {
      if (!groups || groups.length !== 1) {
        throw new GraphQLYogaError('When sorting by join date, you must specify exactly one group.')
      }
    }

    countTotal(qb, 'users', opts.totalColumnName)

    // TODO perhaps the group-related code below can be refactored into
    // a more general-purpose form?

    if (groups) {
      qb.join('group_memberships', 'group_memberships.user_id', 'users.id')
      qb.join('groups', 'groups.id', 'group_memberships.group_id')
      qb.whereIn('groups.id', opts.groups)
      qb.where('group_memberships.active', true)
    }

    if (opts.start_time && opts.end_time) {
      qb.whereRaw('users.created_at between ? and ?', [opts.start_time, opts.end_time])
    }

    if (opts.exclude) {
      qb.whereNotIn('id', opts.exclude)
    }

    if (groups && groups.length > 1) {
      // prevent duplicates due to the joins
      if (opts.sort === 'join') {
        qb.groupBy(['users.id', 'group_memberships.created_at'])
      } else {
        qb.groupBy('users.id')
      }
    }
  })
}

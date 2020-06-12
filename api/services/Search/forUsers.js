import { countTotal } from '../../../lib/util/knex'
import { filterAndSortUsers } from './util'

export default function (opts) {
  const { communities, network } = opts
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
      if (!communities || communities.length !== 1) {
        throw new Error('When sorting by join date, you must specify exactly one community.')
      }
    }

    countTotal(qb, 'users', opts.totalColumnName)

    // TODO perhaps the group-related code below can be refactored into
    // a more general-purpose form?

    if (communities) {
      qb.join('group_memberships', 'group_memberships.user_id', 'users.id')
      qb.join('groups', 'groups.id', 'group_memberships.group_id')
      qb.where('groups.group_data_id', 'in', opts.communities)
      qb.where({
        'groups.group_data_type': Group.DataType.COMMUNITY,
        'group_memberships.active': true
      })
    }

    if (network) {
      qb.distinct()
      qb.join('group_memberships', 'group_memberships.user_id', 'users.id')
      qb.join('groups', 'groups.id', 'group_memberships.group_id')
      qb.join('communities', 'communities.id', 'groups.group_data_id')
      qb.where({
        'groups.group_data_type': Group.DataType.COMMUNITY,
        'group_memberships.active': true,
        'communities.network_id': network
      })
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
        qb.groupBy(['users.id', 'group_memberships.created_at'])
      } else {
        qb.groupBy('users.id')
      }
    }
  })
}

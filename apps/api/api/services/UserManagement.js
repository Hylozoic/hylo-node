const userFieldsToCopy = [
  'avatar_url',
  'banner_url',
  'bio',
  'email',
  'extra_info',
  'facebook_url',
  'first_name',
  'last_login_at',
  'last_name',
  'name',
  'intention',
  'linkedin_url',
  'twitter_name',
  'tagline',
  'work'
]

// knex is passed as an argument here because it can be a transaction object
// see http://knexjs.org/#Transactions
const generateMergeQueries = function (userId, duplicateUserId, knex) {
  var ps = [userId, duplicateUserId]
  var psp = [userId, duplicateUserId, userId]
  var updates = []
  var push = (q, values) => updates.push(knex.raw(q, values))

  // simple updates
  ;[
    // table name, user id column
    ['devices', 'user_id'],
    ['posts', 'user_id'],
    ['posts_about_users', 'user_id'],
    ['posts', 'deactivated_by_id'],
    ['activities', 'actor_id'],
    ['comments', 'user_id'],
    ['comments', 'deactivated_by_id'],
    ['follows', 'added_by_id'],
    ['thanks', 'user_id'],
    ['group_invites', 'invited_by_id'],
    ['group_invites', 'used_by_id'],
    ['user_external_data', 'user_id'],
    ['reactions', 'user_id']
  ].forEach(args => {
    var table = args[0]
    var userCol = args[1]
    push(`update ${table} set ${userCol} = ? where ${userCol} = ?`, ps)
  })

  // updates where we have to avoid duplicate records
  ;[
    // table name, user id column, column with unique value
    ['group_memberships', 'user_id', 'group_id'],
    ['contributions', 'user_id', 'post_id'],
    ['follows', 'user_id', 'post_id'],
    ['linked_account', 'user_id', 'provider_user_id'],
    ['tag_follows', 'user_id', 'tag_id'],
    ['groups_tags', 'user_id', 'tag_id'],
    ['thanks', 'thanked_by_id', 'comment_id'],
    ['posts_users', 'user_id', 'post_id']
  ].forEach(args => {
    var table = args[0]
    var userCol = args[1]
    var uniqueCol = args[2]
    push(`update ${table} set ${userCol} = ? ` +
      `where ${userCol} = ? and ${uniqueCol} not in ` +
      `(select ${uniqueCol} from ${table} where ${userCol} = ?)`, psp)
  })

  return {updates, deletes: generateRemoveQueries(duplicateUserId, knex)}
}

const generateRemoveQueries = function (userId, knex) {
  var removals = []
  var push = (q, values) => removals.push(knex.raw(q, values))

  // clear columns without deleting rows
  ;[
    ['comments', 'deactivated_by_id'],
    ['groups', 'created_by_id'],
    ['follows', 'added_by_id'],
    ['groups_tags', 'user_id']
  ].forEach(args => {
    var table = args[0]
    var userCol = args[1]
    push(`update ${table} set ${userCol} = null where ${userCol} = ?`, userId)
  })

  // cascading deletes
  push('delete from thanks where comment_id in ' +
    '(select id from comments where user_id = ?)', userId)
  push('delete from notifications where activity_id in ' +
    '(select id from activities where reader_id = ?)', userId)
  push('delete from notifications where activity_id in ' +
    '(select id from activities where actor_id = ?)', userId)

  // deletes
  ;[
    // table, user id column
    ['comments', 'user_id'],
    ['contributions', 'user_id'],
    ['devices', 'user_id'],
    ['follows', 'user_id'],
    ['group_invites', 'invited_by_id'],
    ['group_invites', 'used_by_id'],
    ['group_memberships', 'user_id'],
    ['linked_account', 'user_id'],
    ['posts_about_users', 'user_id'],
    ['posts_users', 'user_id'],
    ['tag_follows', 'user_id'],
    ['thanks', 'thanked_by_id'],
    ['user_connections', 'user_id'],
    ['user_external_data', 'user_id'],
    ['user_post_relevance', 'user_id'],
    ['users', 'id'],
    ['reactions', 'user_id']
  ].forEach(args => {
    var table = args[0]
    var userCol = args[1]
    push(`delete from ${table} where ${userCol} = ?`, userId)
  })

  return removals
}

module.exports = {
  // this does not delete posts!
  removeUser: userId =>
    bookshelf.knex.transaction(trx =>
      Promise.all(generateRemoveQueries(userId, trx))),

  mergeUsers: (userId, duplicateUserId) => {
    var queries

    return bookshelf.knex.transaction(trx => {
      queries = generateMergeQueries(userId, duplicateUserId, trx)

      return Promise.join(
        User.find(userId, {transacting: trx}),
        User.find(duplicateUserId, {transacting: trx})
      )
      .spread((user, dupe) => {
        userFieldsToCopy.forEach(f => user.get(f) || user.set(f, dupe.get(f)))

        return _.isEmpty(user.changed) ||
          user.save(user.changed, {patch: true, transacting: trx})
      })
      .then(() => Promise.all(queries.updates))
      .then(() => Promise.all(queries.deletes))
    })
    .then(() => queries.updates.concat(queries.deletes).map(q => q.toSQL()))
  }
}

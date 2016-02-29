var userFieldsToCopy = [
  'avatar_url',
  'banner_url',
  'bio',
  'email',
  'email_validated',
  'extra_info',
  'facebook_url',
  'first_name',
  'last_login',
  'last_name',
  'name',
  'intention',
  'linkedin_url',
  'twitter_name',
  'work'
]

// knex is passed as an argument here because it can be a transaction object
// see http://knexjs.org/#Transactions
var generateMergeQueries = function (userId, duplicateUserId, knex) {
  var ps = [userId, duplicateUserId]
  var psp = [userId, duplicateUserId, userId]
  var updates = []
  var push = (q, values) => updates.push(knex.raw(q, values))

  // simple updates
  ;[
    // table name, user id column
    ['post', 'user_id'],
    ['posts_about_users', 'user_id'],
    ['post', 'deactivated_by_id'],
    ['projects', 'user_id'],
    ['activity', 'actor_id'],
    ['comment', 'user_id'],
    ['comment', 'deactivated_by_id'],
    ['follower', 'added_by_id'],
    ['thank_you', 'user_id'],
    ['thank_you', 'thanked_by_id'],
    ['community_invite', 'invited_by_id'],
    ['community_invite', 'used_by_id'],
    ['user_external_data', 'user_id'],
    ['community', 'leader_id']
  ].forEach(args => {
    var table = args[0]
    var userCol = args[1]
    push(`update ${table} set ${userCol} = ? where ${userCol} = ?`, ps)
  })

  // updates where we have to avoid duplicate records
  ;[
    // table name, user id column, column with unique value
    ['users_community', 'user_id', 'community_id'],
    ['contributor', 'user_id', 'post_id'],
    ['follower', 'user_id', 'post_id'],
    ['linked_account', 'user_id', 'provider_user_id'],
    ['users_skill', 'user_id', 'skill_name'],
    ['users_org', 'user_id', 'org_name'],
    ['phones', 'user_id', 'value'],
    ['emails', 'user_id', 'value'],
    ['websites', 'user_id', 'value'],
    ['tours', 'user_id', 'type'],
    ['vote', 'user_id', 'post_id']
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

var generateRemoveQueries = function (userId, knex) {
  var removals = []
  var push = (q, values) => removals.push(knex.raw(q, values))

  // clear columns without deleting rows
  ;[
    ['comment', 'deactivated_by_id'],
    ['community', 'created_by_id'],
    ['follower', 'added_by_id']
  ].forEach(args => {
    var table = args[0]
    var userCol = args[1]
    push(`update ${table} set ${userCol} = null where ${userCol} = ?`, userId)
  })

  // cascading deletes
  push('delete from thank_you where comment_id in ' +
    '(select id from comment where user_id = ?)', userId)

  // deletes
  ;[
    // table, user id column
    ['users_community', 'user_id'],
    ['community_invite', 'invited_by_id'],
    ['community_invite', 'used_by_id'],
    ['contributor', 'user_id'],
    ['follower', 'user_id'],
    ['linked_account', 'user_id'],
    ['users_skill', 'user_id'],
    ['users_org', 'user_id'],
    ['phones', 'user_id'],
    ['emails', 'user_id'],
    ['websites', 'user_id'],
    ['user_post_relevance', 'user_id'],
    ['activity', 'reader_id'],
    ['activity', 'actor_id'],
    ['tours', 'user_id'],
    ['vote', 'user_id'],
    ['comment', 'user_id'],
    ['user_external_data', 'user_id'],
    ['users', 'id']
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

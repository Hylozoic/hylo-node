var format = require('util').format;

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
];

// knex is passed as an argument here because it can be a transaction object
// see http://knexjs.org/#Transactions
var generateQueries = function(primaryUserId, secondaryUserId, knex) {

  var ps = [primaryUserId, secondaryUserId],
      psp = [primaryUserId, secondaryUserId, primaryUserId],
      updates = [],
      deletes = [];

  // simple updates
  [
    // table name, user id column
    ['post',             'creator_id'],
    ['post',             'deactivated_by_id'],
    ['activity',         'actor_id'],
    ['comment',          'user_id'],
    ['comment',          'deactivated_by_id'],
    ['follower',         'added_by_id'],
    ['thank_you',        'user_id'],
    ['thank_you',        'thanked_by_id'],
    ['community_invite', 'invited_by_id'],
    ['community_invite', 'used_by_id'],
    ['notification',     'actor_id']
  ].forEach(function(args) {
    updates.push(knex.raw(format('update %s set %s = ? where %s = ?', args[0], args[1], args[1]), ps));
  });

  // updates where we have to avoid duplicate records
  [
    // table name, user id column, column with unique value
    ['users_community', 'users_id',    'community_id'],
    ['contributor',     'user_id',     'post_id'],
    ['follower',        'user_id',     'post_id'],
    ['linked_account',  'user_id',     'provider_user_id'],
    ['users_skill',     'user_id',     'skill_name'],
    ['users_org',       'user_id',     'org_name'],
    ['phones',          'user_id',     'value'],
    ['emails',          'user_id',     'value'],
    ['websites',        'user_id',     'value'],
    ['tours',           'user_id',     'type'],
    ['vote',            'user_id',     'post_id']
  ].forEach(function(args) {
    var table = args[0], userCol = args[1], uniqueCol = args[2];
    updates.push(knex.raw(format('update %s set %s = ? where %s = ? and %s not in (select %s from %s where %s = ?)',
      table, userCol, userCol, uniqueCol, uniqueCol, table, userCol), psp));
  });

  // cascading deletes
  deletes.push(knex.raw('delete from notification_status where notification_id in ' +
    '(select id from notification where vote_id in (select id from vote where user_id = ?))', secondaryUserId));
  deletes.push(knex.raw('delete from notification where vote_id in (select id from vote where user_id = ?)', secondaryUserId));

  // deletes
  [
    // table, user id column
    ['users_community',     'users_id'],
    ['contributor',         'user_id'],
    ['follower',            'user_id'],
    ['linked_account',      'user_id'],
    ['users_skill',         'user_id'],
    ['users_org',           'user_id'],
    ['phones',              'user_id'],
    ['emails',              'user_id'],
    ['websites',            'user_id'],
    ['users_security_role', 'users_id'],
    ['invite_request',      'user_id'],
    ['user_post_relevance', 'user_id'],
    ['notification_status', 'recipient_id'],
    ['activity',            'reader_id'],
    ['token_action',        'target_user_id'],
    ['tours',               'user_id'],
    ['vote',                'user_id'],
    ['users',               'id']
  ].forEach(function(args) {
    deletes.push(knex.raw(format('delete from %s where %s = ?', args[0], args[1]), [secondaryUserId]));
  });

  return {updates: updates, deletes: deletes};
};

module.exports = {

  generateQueries: generateQueries,

  perform: function(primaryUserId, secondaryUserId) {
    var queries;

    return bookshelf.knex.transaction(function(trx) {
      queries = generateQueries(primaryUserId, secondaryUserId, trx);

      return Promise.join(
        User.find(primaryUserId, {transacting: trx}),
        User.find(secondaryUserId, {transacting: trx})
      )
      .spread(function(primaryUser, secondaryUser) {
        userFieldsToCopy.forEach(function(attr) {
          if (!primaryUser.get(attr)) {
            primaryUser.set(attr, secondaryUser.get(attr));
          }
        });

        if (!_.isEmpty(primaryUser.changed)) {
          return primaryUser.save(primaryUser.changed, {patch: true, transacting: trx});
        }
      })
      .then(Promise.all.bind(Promise, queries.updates))
      .then(Promise.all.bind(Promise, queries.deletes));
    })
    .then(function() {
      return queries;
    });
  }

};
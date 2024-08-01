
exports.up = async function (knex) {
  knex.raw('TRUNCATE TABLE platform_agreements')

  await knex.schema.table('platform_agreements', table => {
    table.text('type')
  })

  await knex('platform_agreements').insert([
    { text: 'Inappropriate Content', type: 'public' },
    { text: 'Trolling', type: 'public' },
    { text: 'Sexual or Violent Content', type: 'public' },
    { text: 'Spam', type: 'public' },
    { text: 'Adverting', type: 'public' },
    { text: 'Promotion', type: 'public' },
    { text: 'Violence, Abuse, & Self-Harm', type: 'anywhere' },
    { text: 'Privacy & Consent violations', type: 'anywhere' },
    { text: 'Illegal Activities', type: 'anywhere' },
    { text: 'Platform Manipulation', type: 'anywhere' },
    { text: 'Lacking civic Integrity', type: 'anywhere' },
    { text: 'Misleading and Deceptive Identities (anon and clear parody is permitted)', type: 'anywhere' },
    { text: 'Account Compromise', type: 'anywhere' }
  ])
}

exports.down = async function (knex) {
  knex.raw('TRUNCATE TABLE platform_agreements')

  await knex.schema.table('platform_agreements', table => {
    table.dropColumn('type')
  })
}

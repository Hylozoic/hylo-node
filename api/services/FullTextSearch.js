const tableName = 'search_index'
const columnName = 'document'
const defaultLang = 'english'

const raw = str => bookshelf.knex.raw(str)

const dropView = () => raw(`drop materialized view ${tableName}`)

const refreshView = () => raw(`refresh materialized view ${tableName}`)

const createView = lang => {
  if (!lang) lang = defaultLang
  var wv = (column, weight) =>
    `setweight(to_tsvector('${lang}', ${column}), '${weight}')`

  return raw(`create materialized view ${tableName} as (
    select
      p.id as post_id,
      null::bigint as user_id,
      null::bigint as comment_id,
      ${wv('p.name', 'A')} ||
      ${wv("coalesce(p.description, '')", 'B')} ||
      ${wv('u.name', 'D')} as ${columnName}
    from post p
    join users u on u.id = p.user_id
    where p.active = true and u.active = true
  ) union (
    select
      null as post_id,
      u.id as user_id,
      null as comment_id,
      ${wv('u.name', 'A')} ||
      ${wv("coalesce(u.bio, '')", 'B')} ||
      ${wv("coalesce(u.intention, '')", 'B')} ||
      ${wv("coalesce(u.work, '')", 'B')} ||
      ${wv("coalesce(string_agg(distinct s.skill_name, ' '), '')", 'C')} ||
      ${wv("coalesce(string_agg(distinct o.org_name, ' '), '')", 'C')} ||
      ${wv("coalesce(u.extra_info, '')", 'D')} as ${columnName}
    from users u
    left join users_skill s on u.id = s.user_id
    left join users_org o on u.id = o.user_id
    where u.active = true
    group by u.id
  ) union (
    select
      null as post_id,
      null as user_id,
      c.id as comment_id,
      ${wv('c.text', 'B')} ||
      ${wv('u.name', 'D')} as ${columnName}
    from comment c
    join users u on u.id = c.user_id
    where c.active = true and u.active = true
  )`)
  .then(() => raw(`create index idx_fts_search on ${tableName}
    using gin(${columnName})`))
}

const search = (opts) => {
  var lang = opts.lang || defaultLang
  var term = opts.term.replace(/'/, '').split(' ').join(' & ')
  var tsquery = `to_tsquery('${lang}', '${term}')`
  var rank = `ts_rank(${columnName}, ${tsquery})`

  return bookshelf.knex
  .select(raw(`post_id, comment_id, user_id, ${rank} as rank, count(*) over () as total`))
  .from(tableName)
  .where(raw(`${columnName} @@ ${tsquery}`))
  .orderBy('rank', 'desc')
  .limit(opts.limit)
  .offset(opts.offset)
  .where(raw({
    person: 'user_id is not null',
    post: 'post_id is not null',
    comment: 'comment_id is not null'
  }[opts.type] || true))
}

const searchInCommunities = (communityIds, opts) => {
  var alias = 'search'
  var columns = [`${alias}.post_id`, 'comment_id', `${alias}.user_id`, 'rank']

  return bookshelf.knex
  .select(raw(columns.concat('count(*) over () as total').join(', ')))
  .from(search(_.omit(opts, 'limit', 'offset')).as(alias))
  .leftJoin('users_community', 'users_community.user_id', `${alias}.user_id`)
  .leftJoin('comment', 'comment.id', `${alias}.comment_id`)
  .leftJoin('post_community', function () {
    this.on('post_community.post_id', `${alias}.post_id`)
    .orOn('post_community.post_id', 'comment.post_id')
  })
  .where(function () {
    this.where('users_community.community_id', 'in', communityIds)
    .orWhere('post_community.community_id', 'in', communityIds)
  })
  .groupBy(columns.concat('total'))
  .orderBy('rank', 'desc')
  .limit(opts.limit)
  .offset(opts.offset)
}

module.exports = {
  createView,
  dropView,
  refreshView,
  search,
  searchInCommunities
}

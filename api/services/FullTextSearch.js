import { compact, omit } from 'lodash'

const tableName = 'search_index'
const columnName = 'document'
const defaultLang = 'english'

const raw = (str, knex = bookshelf.knex) => knex.raw(str)

const dropView = knex => raw(`drop materialized view ${tableName}`, knex)

const refreshView = () => raw(`refresh materialized view ${tableName}`)

const createView = (lang, knex) => {
  if (!lang) lang = defaultLang
  var wv = (column, weight) =>
    `setweight(to_tsvector('${lang}', ${column}), '${weight}')`

  return raw(`create materialized view ${tableName} as (
    select
      p.id as post_id,
      null::bigint as user_id,
      null::bigint as comment_id,
      ${wv('p.name', 'B')} ||
      ${wv("coalesce(p.description, '')", 'C')} ||
      ${wv('u.name', 'D')} as ${columnName}
    from posts p
    join users u on u.id = p.user_id
    where p.active = true and u.active = true
  ) union (
    select
      null as post_id,
      u.id as user_id,
      null as comment_id,
      ${wv('u.name', 'A')} ||
      ${wv("coalesce(string_agg(replace(s.name, '-', ' '), ' '), '')", 'C')} ||
      ${wv("coalesce(u.bio, '')", 'C')} as ${columnName}
    from users u
    left join skills_users su on u.id = su.user_id
    left join skills s on su.skill_id = s.id
    where u.active = true
    group by u.id
  ) union (
    select
      null as post_id,
      null as user_id,
      c.id as comment_id,
      ${wv('c.text', 'C')} ||
      ${wv('u.name', 'D')} as ${columnName}
    from comments c
    join users u on u.id = c.user_id
    where c.active = true and u.active = true
  )`, knex)
  .then(() => raw(`create index idx_fts_search on ${tableName}
    using gin(${columnName})`, knex))
}

const search = (opts) => {
  var term = compact(opts.term.replace(/'/, '').split(' '))
  .map(w => w + ':*')
  .join(' & ')

  var lang = opts.lang || defaultLang
  var tsquery = `to_tsquery('${lang}', '${term}')`
  var rank = `ts_rank_cd(${columnName}, ${tsquery})`
  var columns

  // set opts.subquery if you are using this search method within one of the
  // services/Search methods, e.g. forUsers, and want to use the full-text
  // search index
  if (opts.subquery) {
    columns = {
      person: 'user_id',
      post: 'post_id',
      comment: 'comment_id'
    }[opts.type]
  } else {
    columns = raw(`post_id, comment_id, user_id, ${rank} as rank, count(*) over () as total`)
  }

  var query = bookshelf.knex
  .select(columns)
  .from(tableName)
  .where(raw(`${columnName} @@ ${tsquery}`))
  .where(raw({
    person: 'user_id is not null',
    post: 'post_id is not null',
    comment: 'comment_id is not null'
  }[opts.type] || true))

  if (!opts.subquery) {
    query = query.orderBy('rank', 'desc')
  }

  return query
}

const searchInGroups = (groupIds, opts) => {
  const alias = 'search'
  const columns = [`${alias}.post_id`, `${alias}.comment_id`, `${alias}.user_id`, 'rank', 'total']
  return bookshelf.knex
  .select(columns)
  .from(search(omit(opts, 'limit', 'offset')).as(alias))
  .leftJoin('group_memberships', 'group_memberships.user_id', `${alias}.user_id`)
  .leftJoin('comments', 'comments.id', `${alias}.comment_id`)
  .leftJoin('groups_posts', function () {
    this.on('groups_posts.post_id', `${alias}.post_id`)
    .orOn('groups_posts.post_id', 'comments.post_id')
  })
  .where(function () {
    this.whereIn('group_memberships.group_id', groupIds)
    .orWhereIn('groups_posts.group_id', groupIds)
  })
  .groupBy(columns)
  .orderBy('rank', 'desc')
  .limit(opts.limit || 20)
  .offset(opts.offset || 0)
}

module.exports = {
  createView,
  dropView,
  refreshView,
  search,
  searchInGroups
}

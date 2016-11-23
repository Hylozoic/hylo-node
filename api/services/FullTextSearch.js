import { compact, omit } from 'lodash'

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
      ${wv("coalesce(string_agg(replace(t.name, '-', ' '), ' '), '')", 'C')} ||
      ${wv("coalesce(u.bio, '')", 'C')} as ${columnName}
    from users u
    left join tags_users tu on u.id = tu.user_id
    left join tags t on tu.tag_id = t.id
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
  )`)
  .then(() => raw(`create index idx_fts_search on ${tableName}
    using gin(${columnName})`))
}

const search = (opts) => {
  var lang = opts.lang || defaultLang
  var term = compact(opts.term.replace(/'/, '').split(' ')).join(' & ')
  var tsquery = `to_tsquery('${lang}', '${term}')`
  var rank = `ts_rank_cd(${columnName}, ${tsquery})`

  return bookshelf.knex
  .select(raw(`post_id, comment_id, user_id, ${rank} as rank, count(*) over () as total`))
  .from(tableName)
  .where(raw(`${columnName} @@ ${tsquery}`))
  .orderBy('rank', 'desc')
  .where(raw({
    person: 'user_id is not null',
    post: 'post_id is not null',
    comment: 'comment_id is not null'
  }[opts.type] || true))
}

const searchInCommunities = (communityIds, opts) => {
  const alias = 'search'
  const columns = [`${alias}.post_id`, 'comment_id', `${alias}.user_id`, 'rank', 'total']

  return bookshelf.knex
  .select(columns)
  .from(search(omit(opts, 'limit', 'offset')).as(alias))
  .leftJoin('communities_users', 'communities_users.user_id', `${alias}.user_id`)
  .leftJoin('comments', 'comments.id', `${alias}.comment_id`)
  .leftJoin('communities_posts', function () {
    this.on('communities_posts.post_id', `${alias}.post_id`)
    .orOn('communities_posts.post_id', 'comments.post_id')
  })
  .where(function () {
    this.where('communities_users.community_id', 'in', communityIds)
    .orWhere('communities_posts.community_id', 'in', communityIds)
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
  searchInCommunities
}

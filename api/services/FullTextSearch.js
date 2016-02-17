var defaultOpts = {
  tableName: 'search_index',
  columnName: 'document',
  lang: 'english'
}

const withDefaultOpts = fn => opts => fn(_.merge({}, defaultOpts, opts))
const raw = str => bookshelf.knex.raw(str)

const dropView = withDefaultOpts(opts =>
  raw(`drop materialized view ${opts.tableName}`))

const refreshView = withDefaultOpts(opts =>
  raw(`refresh materialized view ${opts.tableName}`))

const createView = withDefaultOpts(opts => {
  var wv = (column, weight) =>
    `setweight(to_tsvector('${opts.lang}', ${column}), '${weight}')`

  return raw(`create materialized view ${opts.tableName} as (
    select
      p.id as post_id,
      null::bigint as user_id,
      null::bigint as comment_id,
      ${wv('p.name', 'A')} ||
      ${wv('p.description', 'B')} ||
      ${wv('u.name', 'D')} as ${opts.columnName}
    from post p
    join users u on u.id = p.user_id
    where p.active = true and u.active = true
  ) union (
    select
      null as post_id,
      u.id as user_id,
      null as comment_id,
      ${wv('u.name', 'A')} ||
      ${wv("u.bio || ' ' || u.intention || ' ' || u.work", 'B')} ||
      ${wv("coalesce(string_agg(distinct s.skill_name, ' '))", 'C')} ||
      ${wv("coalesce(string_agg(distinct o.org_name, ' '))", 'C')} ||
      ${wv('u.extra_info', 'D')} as ${opts.columnName}
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
      ${wv('c.comment_text', 'A')} ||
      ${wv('u.name', 'D')} as ${opts.columnName}
    from comment c
    join users u on u.id = c.user_id
    where c.active = true and u.active = true
  )`)
  .then(() => raw(`create index idx_fts_search on ${opts.tableName}
    using gin(${opts.columnName})`))
})

const search = withDefaultOpts(opts => {
  var lang = opts.lang
  var term = opts.term.split(' ').join(' & ')
  var tsquery = `to_tsquery('${lang}', '${term}')`
  var rank = `ts_rank(${opts.columnName}, ${tsquery})`

  return bookshelf.knex
  .from(opts.tableName)
  .where(raw(`${opts.columnName} @@ ${tsquery}`))
  .orderBy(raw(rank), 'desc')
  .limit(opts.limit)
  .select(raw({
    person: 'user_id',
    post: 'post_id',
    comment: 'comment_id'
  }[opts.type] || `post_id, comment_id, user_id, ${rank}`))
  .where(raw({
    person: 'user_id is not null',
    post: 'post_id is not null',
    comment: 'comment_id is not null'
  }[opts.type] || true))
})

module.exports = {
  createView,
  dropView,
  refreshView,
  search
}

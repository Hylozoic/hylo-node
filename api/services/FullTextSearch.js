var defaultOpts = {
  tableName: 'search_index',
  lang: 'english'
}

const withDefaultOpts = fn => opts => fn(_.merge({}, defaultOpts, opts))
const rawQuery = query => bookshelf.knex.raw(query)

const dropView = withDefaultOpts(opts =>
  rawQuery(`drop materialized view ${opts.tableName}`))

const refreshView = withDefaultOpts(opts =>
  rawQuery(`refresh materialized view ${opts.tableName}`))

const createView = withDefaultOpts(opts => {
  var lang = opts.lang
  var wv = (column, weight) =>
    `setweight(to_tsvector('${lang}', ${column}), '${weight}')`

  return rawQuery(`
    create materialized view ${opts.tableName} as (
      select
        p.id as post_id,
        null::bigint as user_id,
        null::bigint as comment_id,
        ${wv('p.name', 'A')} ||
        ${wv('p.description', 'B')} ||
        ${wv('u.name', 'D')} as document
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
        ${wv('u.extra_info', 'D')} as document
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
        ${wv('u.name', 'D')} as document
      from comment c
      join users u on u.id = c.user_id
      where c.active = true and u.active = true
    )
  `)
})

module.exports = {
  createView,
  dropView,
  refreshView
}

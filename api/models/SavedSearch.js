import knexPostgis from 'knex-postgis'

module.exports = bookshelf.Model.extend({
  tableName: 'saved_searches',
  hasTimestamps: true,

  boundingBox: async function() {
    const st = knexPostgis(bookshelf.knex)
    const data = await bookshelf.knex('saved_searches').where({ id: this.id }).select(st.asGeoJSON('bounding_box', 4326))
    const coordinates = JSON.parse(data[0].bounding_box).coordinates[0]
    const boundingBox = [coordinates[0][0], coordinates[0][1], coordinates[2][0], coordinates[2][1]]
    return boundingBox
  },

  group: async function () {
    return this.get('context') === 'groups' ? await Group.find(this.get('group_id')) : null
  },

  topics: async function () {
    const searchId = this.id
    const query = `select t.* from saved_search_topics sst
    left join tags as t on sst.tag_id = t.id
    where sst.saved_search_id = ${searchId}`
    const result = await bookshelf.knex.raw(query)
    return result.rows || []
  },

  newPosts: async function() {
    const searchId = this.id
    const topics = await this.topics()
    const searchText = this.get('search_text')
    const contextQuery = this.getContextQuery()

    const query = `
    with posts_with_locations as (
      select p.id, p.description, p.name, p.type, p.is_public, loc.center as location, array_agg(t.tag_id)::integer[] as tag_ids from posts p
      left join locations loc on p.location_id = loc.id
      left join posts_tags t on p.id = t.post_id
      where loc.id is not null
      group by p.id, p.description, p.name, p.type, p.is_public, loc.center
    ),
    search as (
      select s.bounding_box, s.last_post_id, CONCAT('%',search_text,'%') as search_text, s.post_types, array_agg(sst.tag_id)::integer[] as tag_ids from saved_searches s
      left join saved_search_topics sst on s.id = sst.saved_search_id
      where s.id=${searchId}
      group by s.id
    )
    select p.id from posts_with_locations p
    where ST_Within(p.location, (select bounding_box from search limit 1))=true
    and p.id > (select last_post_id from search)
    ${searchText ? `and (p.name ilike (select search_text from search) or p.description ilike (select search_text from search))` : ''}
    ${topics.length > 0 ? `and p.tag_ids && (select tag_ids from search)` : ''}
    and CONCAT('{',p.type,'}')::varchar[] && (select post_types from search)
    ${contextQuery}
    order by p.id desc
    `
    const result = await bookshelf.knex.raw(query)
    const postIds = (result.rows || []).map(p => p.id)
    const posts = await Post.query().where('id', 'in', postIds)
    return posts
  },

  getContextQuery: function () {
    const context = this.get('context')
    const lastPostId = this.get('last_post_id')
    const userId = this.get('user_id')

    let query

    // TODO: fix up to use groups
    switch (context) {
      case 'all':
        query = `
          and p.id in (select p.id from posts p
          left join groups_posts gp on p.id = gp.post_id
          left join group_memberships gm on gm.group_id = gp.group_id
          where gm.user_id=${userId}
          and p.id > ${lastPostId})
        `
        break
      case 'public':
        query = `
          and p.is_public = true
        `
        break
      case 'groups':
        query = `
          and p.id in (select p.id from posts p
          left join groups_posts gp on p.id = gp.post_id
          where gp.group_id=${this.get('group_id')}
          and p.id > ${lastPostId})
        `
        break
    }

    return query
  },

  updateLastPost: async function(id, last_post_id) {
    await SavedSearch.query().where({ id }).update({ last_post_id })
    return id
  }
}, {
  create: async function (params) {
    const { boundingBox, groupSlug, context, name, postTypes, searchText, topicIds, userId } = params

    let group, group_id

    const validContexts = ['all', 'public', 'groups']
    if (!validContexts.includes(context)) throw new Error(`Invalid context: ${context}`)

    if (context === 'groups') {
      group = await Group.find(groupSlug)
      group_id = group.id
    }

    const st = knexPostgis(bookshelf.knex)
    const bounding_box = st.geomFromText('POLYGON((' + boundingBox[0].lng + ' ' + boundingBox[0].lat + ', ' + boundingBox[0].lng + ' ' + boundingBox[1].lat + ', ' + boundingBox[1].lng + ' ' + boundingBox[1].lat + ', ' + boundingBox[1].lng + ' ' + boundingBox[0].lat + ', ' + boundingBox[0].lng + ' ' + boundingBox[0].lat +  '))', 4326)
    const last_post_id = await Post.query(q => {
      q.select('id')
      q.orderBy('id', 'DESC')
    }).fetch().then(p => p.get('id'))

    const attributes = {
      user_id: userId,
      name,
      created_at: new Date(),
      group_id,
      context,
      is_active: true,
      search_text: searchText,
      post_types: postTypes,
      bounding_box,
      last_post_id
    }

    const search = await this.forge(attributes).save()

    topicIds.forEach(tag_id => SavedSearchTopic.create({ tag_id, saved_search_id: search.id }))

    return search
  },

  delete: async function(id) {
    await SavedSearch.query().where({ id }).update({ is_active: false })
    return id
  }
})

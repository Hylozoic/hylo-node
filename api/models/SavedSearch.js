import knexPostgis from 'knex-postgis'

module.exports = bookshelf.Model.extend({
  tableName: 'saved_searches',

  boundingBox: async function() {
    const st = knexPostgis(bookshelf.knex)
    const data = await bookshelf.knex('saved_searches').where({ id: this.id }).select(st.asGeoJSON('bounding_box', 4326))
    const coordinates = JSON.parse(data[0].bounding_box).coordinates[0]
    const boundingBox = [
      {lat: coordinates[0][1], lng: coordinates[0][0]},
      {lat: coordinates[2][1], lng: coordinates[2][0]}
    ]
    return boundingBox
  },

  community: async function () {
    return this.get('context') === 'community' ? await Community.find(this.get('context_id')) : null
  },

  network: async function () {
    return this.get('context') === 'network' ? await Network.find(this.get('context_id')) : null
  },

  topics: async function () {
    const searchId = this.id
    const query = `select t.* from saved_search_topics sst
    left join tags as t on sst.tag_id = t.id
    where sst.saved_search_id = ${searchId}`
    const result = await bookshelf.knex.raw(query)
    return result.rows
  }
}, {
  create: async function (params) {
    const { boundingBox, communitySlug, context, lastPostId, name, networkSlug, postTypes, searchText, topicIds, userId } = params

    let community, network, context_id

    const validContexts = ['all', 'public', 'network', 'community']
    if (!validContexts.includes(context)) throw new Error(`Invalid context: ${context}`)

    if (context === 'community') {
      community = await Community.find(communitySlug)
      context_id = community.id
    }

    if (context === 'network') {
      network = await Network.find(networkSlug)
      context_id = network.id
    }

    const st = knexPostgis(bookshelf.knex)
    const bounding_box = st.geomFromText('POLYGON((' + boundingBox[0].lng + ' ' + boundingBox[0].lat + ', ' + boundingBox[0].lng + ' ' + boundingBox[1].lat + ', ' + boundingBox[1].lng + ' ' + boundingBox[1].lat + ', ' + boundingBox[1].lng + ' ' + boundingBox[0].lat + ', ' + boundingBox[0].lng + ' ' + boundingBox[0].lat +  '))', 4326)

    const attributes = {
      user_id: userId,
      name,
      created_at: new Date(),
      context_id,
      context,
      active: true,
      search_text: searchText,
      post_types: postTypes,
      bounding_box,
      last_post_id: lastPostId,
    }

    const search = await this.forge(attributes).save()

    topicIds.forEach(tag_id => SavedSearchTopic.create({ tag_id, saved_search_id: search.id }))

    return search
  },
  
  delete: async function(id) {
    await SavedSearch.query().where({ id }).update({ active: false })
    return id
  }
})

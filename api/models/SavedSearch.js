import knexPostgis from 'knex-postgis';

module.exports = bookshelf.Model.extend({
  tableName: 'saved_searches',

  community: function () {
    return this.belongsTo(Community)
  },

  network: function () {
    return this.belongsTo(Network)
  }
}, {
  create: async function (params) {
    const { userId, name, communitySlug, networkSlug, isPublic, searchText, postTypes, topicIds } = params

    let community, network;
    if (communitySlug) community = await Community.find(communitySlug);
    if (networkSlug) network = await Network.find(networkSlug);

    const st = knexPostgis(bookshelf.knex);
    let { boundingBox } = params
    boundingBox = st.geomFromText('POLYGON((' + boundingBox[0].lng + ' ' + boundingBox[0].lat + ', ' + boundingBox[0].lng + ' ' + boundingBox[1].lat + ', ' + boundingBox[1].lng + ' ' + boundingBox[1].lat + ', ' + boundingBox[1].lng + ' ' + boundingBox[0].lat + ', ' + boundingBox[0].lng + ' ' + boundingBox[0].lat +  '))', 4326)

    const attributes = {
      user_id: userId,
      name,
      community_id: community ? community.id : undefined,
      network_id: network ? network.id : undefined,
      is_public: isPublic,
      active: true,
      search_text: searchText,
      post_types: postTypes,
      bounding_box: boundingBox,
    }

    const search = await this.forge(attributes).save()

    topicIds.forEach(tag_id => SavedSearchTopic.create({ tag_id, saved_search_id: search.id }))

    return search
  },
  
  delete: async function(id) {
    await SavedSearch.query().where({ id }).update({ active: false })
    return id;
  }
})

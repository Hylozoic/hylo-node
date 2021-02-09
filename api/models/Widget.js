module.exports = bookshelf.Model.extend({
  tableName: 'widgets',
  requireFetch: false, 
}, {

  Name: {
    text_block: 'Welcome message',
    announcements: 'Announcement',
    active_members: 'Recently active members',
    requests_offers: 'Open requests & offers',
    posts: 'Recent posts',
    community_topics: 'Community topics',
    events: 'Upcoming events',
    project_activity: 'Recent project activity',
    group_affiliations: 'Subgroups and affiliations',
    map: 'Community map'
  },

  fetchForCommunity: async function(community_id) {
    const query = `select gw.id, w.name, gw.settings, gw.is_visible, gw.order from group_widgets gw
    left join groups as g on g.id = gw.group_id
    left join widgets as w on w.id = gw.widget_id
    where g.group_data_id = ${community_id} and g.group_data_type = 1`
    const result = await bookshelf.knex.raw(query)
    return result.rows || []
  },

  fetchAll: async function () {
    let all = await Widget.fetchAll();
    return all
  }
})

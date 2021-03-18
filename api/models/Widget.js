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

  fetchAll: async function () {
    let all = await Widget.fetchAll();
    return all
  }
})

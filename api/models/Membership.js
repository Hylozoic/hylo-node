// this is a duplicate of CommunityUser because when CommunityUser gets set up
// to be the through-table for the User-Community M2M, it is no longer accessible
// by itself...
module.exports = {

  tableName: 'users_community',
  autoCreatedAt: false,
  autoUpdatedAt: false,
  autoPK: false,

  attributes: {
    role: 'integer',
    user: {
      model: 'user',
      columnName: 'users_id',
      primaryKey: true
    },
    community: {
      model: 'community',
      columnName: 'community_id'
    }
  }

}

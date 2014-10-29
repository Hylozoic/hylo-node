module.exports = {

  tableName: 'users_community',
  tables: ['communities', 'users'],
  junctionTable: true,

  attributes: {
    name: 'string',
    email: 'string',
    users: {
      columnName: 'users_id',
      type: 'integer',
      foreignKey: true,
      references: 'user',
      on: 'id',
      via: 'communities',
      groupBy: 'user'
    },
    communities: {
      columnName: 'community_id',
      type: 'integer',
      foreignKey: true,
      references: 'community',
      on: 'id',
      via: 'users',
      groupBy: 'community'
    }
  },

  autoCreatedAt: false,
  autoUpdatedAt: false

};


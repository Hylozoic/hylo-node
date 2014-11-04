module.exports = {
  attributes: {
    provider_key: 'string',
    provider_user_id: 'string',
    user: {
      model: 'user',
      columnName: 'user_id'
    }
  },

  tableName: 'linked_account',
  autoCreatedAt: false,
  autoUpdatedAt: false
}
module.exports = bookshelf.Model.extend(Object.assign({
    tableName: 'group_extensions',
    requireFetch: false,
    hasTimestamps: true,
  
    group () {
      return this.belongsTo(Group)
    },
  
    extension () {
      return this.belongsTo(Extension)
    },
    async type () {
      return (await this.extension().fetch()).get('type')
    }
  }), {
  
  })
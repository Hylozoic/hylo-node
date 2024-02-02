const { GraphQLYogaError } = require('@graphql-yoga/node')

module.exports = bookshelf.Model.extend({
  tableName: 'collections',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(User)
  },

  linkedPosts: function () {
    return this.hasMany(CollectionsPost, 'collection_id').orderBy('collections_posts.order', 'ASC')
  },

  posts: function () {
    return this.belongsToMany(Post).through(CollectionsPost).orderBy('collections_posts.order', 'ASC').withPivot(['order'])
  },

  user: function () {
    return this.belongsTo(User)
  }
}, {

  create: async function (attrs) {
    const { groupId, name, userId } = attrs

    const collection = await this.forge({
      group_id: groupId,
      name,
      user_id: userId
    }).save()

    return collection
  },

  find: function (id) {
    if (!id) return Promise.resolve(null)
    return Collection.where({ id, is_active: true }).fetch()
  },

  findValidCollectionForUser: function (userId, id) {
    // Only allow modifying a collection created by this user or a group Collection in a group moderated by this user
    const collection = Collection.query(q => {
      return q.where({ id: this.id, is_active: true })
        .andWhere(q => {
          q.where({ user_id: userId })
            .orWhereIn('group_id', Group.selectIdsForMember(userId, { 'group_memberships.role': GroupMembership.Role.MODERATOR }))
            // TODO RESP: need to check the right RESP here, I think there is a helper function/method for this
        })
    })

    if (!collection) {
      throw new GraphQLYogaError('Not a valid collection')
    }
    return collection
  },

  delete: async function (id) {
    const attributes = { updated_at: new Date(), is_active: false }
    await Collection.query().where({ id }).update(attributes)
    return id
  }

})

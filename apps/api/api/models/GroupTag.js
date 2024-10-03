/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'groups_tags',
  requireFetch: false,
  hasTimestamps: true,

  owner: function () {
    return this.belongsTo(User, 'user_id')
  },

  group: function () {
    return this.belongsTo(Group)
  },

  tag: function () {
    return this.belongsTo(Tag)
  },

  tagFollow: function (userId) {
    return TagFollow.query(q => {
      q.where({
        user_id: userId,
        group_id: this.get('group_id'),
        tag_id: this.get('tag_id')
      })
    })
  },

  isFollowed: function (userId) {
    return this.tagFollow(userId).count().then(count => Number(count) > 0)
  },

  lastReadPostId: function (userId) {
    return this.tagFollow(userId).query().select('last_read_post_id')
      .then(rows => rows.length > 0 ? rows[0].last_read_post_id : null)
  },

  newPostCount: function (userId) {
    return this.tagFollow(userId).query().select('new_post_count')
    .then(rows => rows.length > 0 ? rows[0].new_post_count : 0)
  },

  postCount: function () {
    return GroupTag.taggedPostCount(this.get('group_id'), this.get('tag_id'))
  },

  followerCount: function () {
    return Tag.followersCount(this.get('tag_id'), { groupId: this.get('group_id') })
  },

  consolidateFollowerCount: function () {
    return this.followerCount()
    .then(num_followers => {
      if (num_followers === this.get('num_followers')) return Promise.resolve()
      return this.save({num_followers})
    })
  }

}, {

  create (attrs, { transacting } = {}) {
    return this.forge(Object.assign({created_at: new Date(), updated_at: new Date()}, attrs))
    .save({}, {transacting})
  },

  taggedPostCount (groupId, tagId) {
    return bookshelf.knex('posts_tags')
    .join('posts', 'posts.id', 'posts_tags.post_id')
    .join('groups_posts', 'groups_posts.post_id', 'posts_tags.post_id')
    .where('posts.active', true)
    .where({group_id: groupId, tag_id: tagId})
    .count()
    .then(rows => Number(rows[0].count))
  },

  defaults (groupId, trx) {
    return GroupTag.where({group_id: groupId, is_default: true})
    .fetchAll({withRelated: 'tag', transacting: trx})
  },

  findByTagAndGroup (topicName, groupSlug) {
    return GroupTag.query(q => {
      q.join('groups', 'groups.id', 'groups_tags.group_id')
      q.where('groups.slug', groupSlug)
      q.join('tags', 'tags.id', 'groups_tags.tag_id')
      q.where('tags.name', topicName)
    }).fetch()
  }

})

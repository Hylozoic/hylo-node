/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'communities_tags',

  owner: function () {
    return this.belongsTo(User, 'user_id')
  },

  community: function () {
    return this.belongsTo(Community)
  },

  tag: function () {
    return this.belongsTo(Tag)
  },

  tagFollow: function (userId) {
    return TagFollow.query(q => {
      q.where({
        user_id: userId,
        community_id: this.get('community_id'),
        tag_id: this.get('tag_id')
      })
    })
  },

  isFollowed: function (userId) {
    return this.tagFollow(userId).count().then(count => Number(count) > 0)
  },

  newPostCount: function (userId) {
    return this.tagFollow(userId).query().select('new_post_count')
    .then(rows => rows.length > 0 ? rows[0].new_post_count : 0)
  },

  postCount: function () {
    return CommunityTag.taggedPostCount(this.get('community_id'), this.get('tag_id'))
  },

  followerCount: function () {
    return Tag.followersCount(this.get('tag_id'), this.get('community_id'))
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

  taggedPostCount (communityId, tagId) {
    return bookshelf.knex('posts_tags')
    .join('posts', 'posts.id', 'posts_tags.post_id')
    .join('communities_posts', 'communities_posts.post_id', 'posts_tags.post_id')
    .where('posts.active', true)
    .where({community_id: communityId, tag_id: tagId})
    .count()
    .then(rows => Number(rows[0].count))
  },

  defaults (communityId, trx) {
    return CommunityTag.where({community_id: communityId, is_default: true})
    .fetchAll({withRelated: 'tag', transacting: trx})
  },

  findByTagAndCommunity (topicName, communitySlug) {
    return CommunityTag.query(q => {
      q.join('communities', 'communities.id', 'communities_tags.community_id')
      q.where('communities.slug', communitySlug)
      q.join('tags', 'tags.id', 'communities_tags.tag_id')
      q.where('tags.name', topicName)
    }).fetch()
  }

})

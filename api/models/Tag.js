/* eslint-disable camelcase */

import { updateOrRemove } from '../../lib/util/knex'
import { includes, isUndefined } from 'lodash'
import {
  filter, omitBy, some, uniq
} from 'lodash/fp'
import { validateTopicName } from 'hylo-utils/validators'
import { myCommunityIds } from './util/queryFilters'

export const tagsInText = (text = '') => {
  const re = /(?:^| |>)#([A-Za-z][\w_-]+)/g
  var match
  var tags = []
  while ((match = re.exec(text)) != null) {
    tags.push(match[1])
  }
  return tags
}

const addToTaggable = (taggable, name, userId, opts) => {
  var association, getCommunities
  var isPost = taggable.tableName === 'posts'
  if (isPost) {
    // taggable is a post
    association = 'communities'
    getCommunities = post => post.relations.communities
  } else {
    // taggable is a comment
    association = 'post.communities'
    getCommunities = comment => comment.relations.post.relations.communities
  }
  const created_at = new Date()
  const findTag = () => Tag.find({ name }, opts)
  return taggable.load(association, opts).then(findTag)
  // create the tag -- if creation fails, find the existing one
  .then(tag => tag ||
    new Tag({name, created_at}).save({}, opts).catch(findTag))
  .tap(tag =>
    taggable.tags().attach(omitBy(isUndefined, {
      tag_id: tag.id,
      created_at
    }), opts)
    // userId here is the id of the user making the edit, which is not always
    // the same as the user who created the taggable. we add the tag only to
    // those communities of which the user making the edit is a member.
    .then(() => userId && Group.pluckIdsForMember(userId, Community))
    .then(communityIds => {
      if (!communityIds) return
      const communities = filter(c => includes(communityIds, c.id),
        getCommunities(taggable).models)
      return Promise.map(communities, com => Tag.addToCommunity({
        community_id: com.id,
        tag_id: tag.id,
        user_id: taggable.get('user_id'),
        isSubscribing: true
      }, opts))
    }))
}

const removeFromTaggable = (taggable, tag, opts) => {
  return taggable.tags().detach(tag.id, opts)
}

const updateForTaggable = ({ taggable, tagNames, userId, transacting }) => {
  return taggable.load('tags', {transacting})
  .then(() => {
    const toRemove = taggable.relations.tags.models
    return Promise.map(toRemove, tag => removeFromTaggable(taggable, tag, {transacting}))
    .then(() => Promise.map(uniq(tagNames), name => addToTaggable(taggable, name, userId, {transacting})))
  })
}

module.exports = bookshelf.Model.extend({
  tableName: 'tags',

  memberships: function () {
    return this.hasMany(CommunityTag)
  },

  communities: function () {
    return this.belongsToMany(Community).through(CommunityTag)
    .withPivot(['user_id', 'description'])
  },

  communityTemplates: function () {
    return this.belongsToMany(CommunityTemplate, 'blocked_users', 'tag_id', 'community_template_id')
  },

  communityTags: function () {
    return this.hasMany(CommunityTag)
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostTag).withPivot('selected')
  },

  comments: function () {
    return this.belongsToMany(Comment).through(CommentTag)
  },

  follows: function () {
    return this.hasMany(TagFollow)
  },

  followForUserAndCommunity: function (userId, communityId) {
    return this.hasOne(TagFollow).query({where: {
      user_id: userId,
      community_id: communityId
    }})
  }

}, {
  addToCommunity: ({ community_id, tag_id, user_id, description, is_default, isSubscribing }, opts) =>
    CommunityTag.where({community_id, tag_id}).fetch(opts)
    .tap(comTag => comTag ||
      CommunityTag.create({community_id, tag_id, user_id, description, is_default}, opts)
      .catch(() => {}))
      // the catch above is for the case where another user just created the
      // CommunityTag (race condition): the save fails, but we don't care about
      // the result
    .then(comTag => comTag && comTag.save({updated_at: new Date(), is_default}))
    .then(() => user_id && isSubscribing &&
      TagFollow.where({community_id, tag_id, user_id}).fetch(opts)
      .then(follow => follow ||
        TagFollow.create({community_id, tag_id, user_id}, opts))),

  isValidTag: function (text) {
    return !validateTopicName(text)
  },

  validate: function (text) {
    return validateTopicName(text)
  },

  tagsInText,

  find: function ({ id, name }, options) {
    if (id) {
      return Tag.where({ id }).fetch(options)
    }
    if (name) {
      return Tag.query(qb => qb.whereRaw('lower(name) = lower(?)', name))
        .fetch(options)
    }
    return Promise.resolve(null)
  },

  findOrCreate: function (name, options) {
    return Tag.find({ name }, options)
    .then(tag => {
      if (tag) return tag
      return new Tag({name}).save(null, options)
    })
  },

  updateForPost: function (post, tagNames, userId, trx) {
    return updateForTaggable({
      taggable: post,
      tagNames,
      userId,
      transacting: trx
    })
  },

  merge: (id1, id2) => {
    return bookshelf.transaction(trx => {
      const update = (table, uniqueCols) =>
        updateOrRemove(table, 'tag_id', id2, id1, uniqueCols, trx)

      return Promise.join(
        update('posts_tags', ['post_id']),
        update('communities_tags', ['community_id']),
        update('tag_follows', ['community_id', 'user_id'])
      )
      .then(() => trx('tags').where('id', id2).del())
    })
  },

  remove: id => {
    return bookshelf.transaction(trx => {
      const tables = ['tag_follows', 'communities_tags', 'posts_tags']
      return Promise.all(tables.map(t => trx(t).where('tag_id', id).del()))
      .then(() => trx('tags').where('id', id).del())
    })
  },

  taggedPostCount: (tagId, options = {}) => {
    const { userId, communitySlug, networkSlug } = options
    const q = PostTag.query()

    q.select(bookshelf.knex.raw('count(distinct posts_tags.post_id) AS count'))
    q.join('posts', 'posts.id', 'posts_tags.post_id')
    q.join('tags', 'tags.id', 'posts_tags.tag_id')
    q.join('communities_tags', 'communities_tags.tag_id', 'tags.id')
    q.join('communities_posts', 'communities_posts.post_id', 'posts.id')
    q.join('communities', 'communities.id', 'communities_posts.community_id')
    q.where('posts_tags.tag_id', tagId)
    q.where('posts.active', true)
    q.where('communities.active', true)
    if (userId) {
      q.where('communities.id', 'in', myCommunityIds(userId))
    }
    if (networkSlug) {
      q.join('networks', 'networks.id', 'communities.network_id')
      q.where('networks.slug', networkSlug)
    }
    if (communitySlug) {
      q.where('communities.slug', communitySlug)
    }
    q.groupBy('tags.id')

    return q.then(rows => {
      if (rows.length === 0) return 0

      return Number(rows[0].count)
    })
  },

  followersCount: (tagId, { userId, communityId, communitySlug, networkSlug }) => {
    const q = TagFollow.query()

    q.join('communities', 'communities.id', 'tag_follows.community_id')

    if (userId) {
      q.where('communities.id', 'in', myCommunityIds(userId))
    }

    if (communityId) {
      q.where('tag_follows.community_id', communityId)
    }

    if (communitySlug) {
      q.where('communities.slug', communitySlug)
    }

    if (networkSlug) {
      q.join('networks', 'networks.id', 'communities.network_id')
      q.where('networks.slug', networkSlug)
    }

    q.where({ tag_id: tagId })
    q.where('communities.active', true)
    q.count()

    return q.then(rows => Number(rows[0].count))
  },

  nonexistent: (names, communityIds) => {
    if (names.length === 0 || !communityIds || communityIds.length === 0) return Promise.resolve({})

    const isCommunity = id => row => Number(row.community_id) === Number(id)
    const sameTag = name => row => row.name.toLowerCase() === name.toLowerCase()

    return Tag.query().where('name', 'in', names)
    .join('communities_tags', 'communities_tags.tag_id', 'tags.id')
    .where('community_id', 'in', communityIds)
    .select(['tags.name', 'community_id'])
    .then(rows => {
      return names.reduce((m, n) => {
        const matching = filter(sameTag(n), rows)
        const missing = filter(id => !some(isCommunity(id), matching), communityIds)
        if (missing.length > 0) m[n] = missing
        return m
      }, {})
    })
  }
})

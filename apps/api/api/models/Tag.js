/* eslint-disable camelcase */

import { updateOrRemove } from '../../lib/util/knex'
import { includes, isUndefined } from 'lodash'
import {
  filter, omitBy, some, uniq
} from 'lodash/fp'
import { Validators } from 'hylo-shared'

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
  let association, getGroups
  let isPost = taggable.tableName === 'posts'
  if (isPost) {
    // taggable is a post
    association = 'groups'
    getGroups = post => post.relations.groups
  } else {
    // taggable is a comment
    association = 'post.groups'
    getGroups = comment => comment.relations.post.relations.groups
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
    .then(() => userId && Group.pluckIdsForMember(userId))
    .then(groupIds => {
      if (!groupIds) return
      const groups = filter(c => includes(groupIds, c.id),
        getGroups(taggable).models)
      return Promise.map(groups, com => Tag.addToGroup({
        group_id: com.id,
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
  requireFetch: false,
  hasTimestamps: true,

  memberships: function () {
    return this.hasMany(GroupTag)
  },

  groups: function () {
    return this.belongsToMany(Group).through(GroupTag)
    .withPivot(['user_id', 'description'])
  },

  groupTags: function () {
    return this.hasMany(GroupTag)
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostTag).withPivot('selected')
  },

  comments: function () {
    return this.belongsToMany(Comment).through(GroupTag)
  },

  follows: function () {
    return this.hasMany(TagFollow)
  },

  followForUserAndGroup: function (userId, groupId) {
    return this.hasOne(TagFollow).query({where: {
      user_id: userId,
      group_id: groupId
    }})
  }

}, {
  addToGroup: ({ group_id, tag_id, user_id, description, is_default, isSubscribing }, opts) =>
    GroupTag.where({group_id, tag_id}).fetch(opts)
    .tap(groupTag => groupTag ||
      GroupTag.create({group_id, tag_id, user_id, description, is_default}, opts)
      .catch(() => {}))
      // the catch above is for the case where another user just created the
      // GroupTag (race condition): the save fails, but we don't care about
      // the result
    .then(groupTag => groupTag && groupTag.save({updated_at: new Date(), is_default}))
    .then(() => user_id && isSubscribing &&
      TagFollow.where({group_id, tag_id, user_id}).fetch(opts)
      .then(follow => follow ||
        TagFollow.create({group_id, tag_id, user_id}, opts))),

  isValidTag: function (text) {
    return !Validators.validateTopicName(text)
  },

  validate: function (text) {
    return Validators.validateTopicName(text)
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
        update('groups_tags', ['group_id']),
        update('tag_follows', ['group_id', 'user_id'])
      )
      .then(() => trx('tags').where('id', id2).del())
    })
  },

  remove: id => {
    return bookshelf.transaction(trx => {
      const tables = ['tag_follows', 'groups_tags', 'posts_tags']
      return Promise.all(tables.map(t => trx(t).where('tag_id', id).del()))
      .then(() => trx('tags').where('id', id).del())
    })
  },

  taggedPostCount: (tagId, options = {}) => {
    const { userId, groupSlug } = options
    const q = PostTag.query()

    q.select(bookshelf.knex.raw('count(distinct posts_tags.post_id) AS count'))
    q.join('posts', 'posts.id', 'posts_tags.post_id')
    q.join('tags', 'tags.id', 'posts_tags.tag_id')
    q.join('groups_tags', 'groups_tags.tag_id', 'tags.id')
    q.join('groups_posts', 'groups_posts.post_id', 'posts.id')
    q.join('groups', 'groups.id', 'groups_posts.group_id')
    q.where('posts_tags.tag_id', tagId)
    q.where('posts.active', true)
    q.where('groups.active', true)
    if (userId) {
      q.whereIn('groups.id', Group.selectIdsForMember(userId))
    }

    if (groupSlug) {
      q.where('groups.slug', groupSlug)
    }
    q.groupBy('tags.id')

    return q.then(rows => {
      if (rows.length === 0) return 0

      return Number(rows[0].count)
    })
  },

  followersCount: (tagId, { userId, groupId, groupSlug }) => {
    const q = TagFollow.query()

    q.join('groups', 'groups.id', 'tag_follows.group_id')

    if (userId) {
      q.whereIn('groups.id', Group.selectIdsForMember(userId))
    }

    if (groupId) {
      q.where('tag_follows.group_id', groupId)
    }

    if (groupSlug) {
      q.where('groups.slug', groupSlug)
    }

    q.where({ tag_id: tagId })
    q.where('groups.active', true)
    q.count()

    return q.then(rows => Number(rows[0].count))
  },

  nonexistent: (names, groupIds) => {
    if (names.length === 0 || !groupIds || groupIds.length === 0) return Promise.resolve({})

    const isGroup = id => row => Number(row.group_id) === Number(id)
    const sameTag = name => row => row.name.toLowerCase() === name.toLowerCase()

    return Tag.query().whereIn('name', names)
    .join('groups_tags', 'groups_tags.tag_id', 'tags.id')
    .whereIn('group_id', groupIds)
    .select(['tags.name', 'group_id'])
    .then(rows => {
      return names.reduce((m, n) => {
        const matching = filter(sameTag(n), rows)
        const missing = filter(id => !some(isGroup(id), matching), groupIds)
        if (missing.length > 0) m[n] = missing
        return m
      }, {})
    })
  }
})

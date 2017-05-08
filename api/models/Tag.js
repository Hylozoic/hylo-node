/* eslint-disable camelcase */

import { updateOrRemove } from '../../lib/util/knex'
import { difference, flatten, includes, isEmpty, isUndefined, uniq } from 'lodash'
import {
  differenceBy, filter, find, get, map, omitBy, pick, some, uniqBy
} from 'lodash/fp'

export const tagsInText = (text = '') => {
  const re = /(?:^| |>)#([A-Za-z][\w_-]+)/g
  var match
  var tags = []
  while ((match = re.exec(text)) != null) {
    tags.push(match[1])
  }
  return tags
}

const addToCommunity = ({ community_id, tag_id, user_id, description, is_default }, opts) =>
  CommunityTag.where({community_id, tag_id}).fetch(opts)
  .then(comTag => comTag ||
    CommunityTag.create({community_id, tag_id, user_id, description, is_default}, opts)
    .catch(() => {}))
    // the catch above is for the case where another user just created the
    // CommunityTag (race condition): the save fails, but we don't care about
    // the result
  .then(() => user_id &&
    TagFollow.where({community_id, tag_id, user_id}).fetch(opts)
    .then(follow => follow ||
      TagFollow.create({community_id, tag_id, user_id}, opts)))

const addToTaggable = (taggable, name, selected, tagDescriptions, userId, opts) => {
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
  const findTag = () => Tag.find(name, opts)
  return taggable.load(association, opts).then(findTag)
  // create the tag -- if creation fails, find the existing one
  .then(tag => tag ||
    new Tag({name, created_at}).save({}, opts).catch(findTag))
  .tap(tag =>
    taggable.tags().attach(omitBy(isUndefined, {
      tag_id: tag.id,
      created_at,
      selected: isPost ? selected : undefined
    }), opts)
    // userId here is the id of the user making the edit, which is not always
    // the same as the user who created the taggable. we add the tag only to
    // those communities of which the user making the edit is a member.
    .then(() => userId && Membership.where({active: true, user_id: userId})
      .query().pluck('community_id'))
    .then(communityIds => {
      if (!communityIds) return
      const communities = filter(c => includes(communityIds, c.id),
        getCommunities(taggable).models)
      return Promise.map(communities, com => addToCommunity({
        community_id: com.id,
        tag_id: tag.id,
        user_id: taggable.get('user_id'),
        description: get('description', tagDescriptions[tag.get('name')]),
        is_default: get('is_default', tagDescriptions[tag.get('name')])
      }, opts))
    }))
}

const removeFromTaggable = (taggable, tag, opts) => {
  return taggable.tags().detach(tag.id, opts)
}

const updateForTaggable = ({ taggable, text, selectedTagName, tagDescriptions, userId, transacting }) => {
  const lowerName = t => t.name.toLowerCase()
  const tagDifference = differenceBy(t => pick(['name', 'selected'], t))

  return taggable.getTagsInComments({transacting})
  .then(childTags => {
    var newTags = tagsInText(text).map(name => ({name, selected: false}))
    newTags = newTags.concat(childTags.map(ct => ({name: ct.get('name'), selected: false})))
    if (selectedTagName) {
      const dupe = find(t => t.name === selectedTagName, newTags)
      if (dupe) {
        dupe.selected = true
      } else {
        newTags.push({name: selectedTagName, selected: true})
      }
    }
    return taggable.load('tags', {transacting})
    .then(() => {
      const oldTags = taggable.relations.tags.map(t => ({
        id: t.id,
        name: t.get('name'),
        selected: t.pivot.get('selected')
      }))
      const toAdd = uniqBy(lowerName, tagDifference(newTags, oldTags))
      const toRemove = tagDifference(oldTags, newTags)
      return Promise.all(flatten([
        toRemove.map(tag => removeFromTaggable(taggable, tag, {transacting})),
        toAdd.map(tag => addToTaggable(taggable, tag.name, tag.selected, tagDescriptions || {}, userId, {transacting}))
      ]))
    })
  })
}

const invalidCharacterRegex = /[^\w-]/
const sanitize = tag => tag.replace(/ /g, '-').replace(invalidCharacterRegex, '')

const createAsNeeded = (tagNames, { transacting } = {}) => {
  const lower = t => t.toLowerCase()
  const knex = transacting || bookshelf.knex
  const tagQuery = transacting ? Tag.query().transacting(transacting) : Tag.query()

  // sure wish knex handled this for me automatically
  const sqlize = arr => arr.map(x => `'${x}'`).join(', ')
  const nameMatch = arr => `lower(name) in (${sqlize(map(lower, arr))})`

  // find existing tags
  return tagQuery.whereRaw(nameMatch(tagNames)).select(['id', 'name'])
  .then(existing => {
    const toCreate = differenceBy(lower, tagNames, map('name', existing))
    const created_at = new Date()

    // create new tags as necessary
    return (isEmpty(toCreate)
      ? Promise.resolve([])
      : knex('tags')
        .insert(toCreate.map(name => ({name, created_at})))
        .then(() => tagQuery.whereRaw(nameMatch(toCreate)).select('id')))
    // return the ids of existing and created tags together
    .then(created => map('id', existing.concat(created)))
  })
}

module.exports = bookshelf.Model.extend({
  tableName: 'tags',

  users: function () {
    return this.belongsToMany(User).through(TagUser)
  },

  memberships: function () {
    return this.hasMany(CommunityTag)
  },

  communities: function () {
    return this.belongsToMany(Community).through(CommunityTag)
    .withPivot(['user_id', 'description'])
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostTag).withPivot('selected')
  },

  comments: function () {
    return this.belongsToMany(Comment).through(CommentTag)
  },

  follows: function () {
    return this.hasMany(TagFollow)
  }

}, {

  STARTER_NAMES: ['offer', 'request', 'intention'],

  isValidTag: function (text) {
    return !!text.match(/^[A-Za-z][\w-]+$/)
  },

  tagsInText,

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    if (isNaN(Number(id))) {
      return Tag.query(qb => qb.whereRaw('lower(name) = lower(?)', id))
      .fetch(options)
    }
    return Tag.where({id: id}).fetch(options)
  },

  findOrCreate: function (name, options) {
    return Tag.find(name, options)
    .then(tag => {
      if (tag) return tag
      return new Tag({name}).save(null, options)
    })
  },

  updateForPost: function (post, selectedTagName, tagDescriptions, userId, trx) {
    const text = post.get('name') + ' ' + post.get('description')

    const getSelectedTagName = () =>
      post.load('selectedTags')
      .then(() => {
        const selectedTag = post.relations.selectedTags.first()
        return selectedTag ? selectedTag.get('name') : null
      })

    return (selectedTagName ? Promise.resolve(selectedTagName) : getSelectedTagName())
    .then(selectedTagName => updateForTaggable({
      taggable: post,
      text,
      selectedTagName,
      tagDescriptions,
      userId,
      transacting: trx
    }))
  },

  updateForComment: function (comment, tagDescriptions, userId, trx) {
    return Post.find(comment.get('post_id'))
    .then(() => updateForTaggable({
      taggable: comment,
      text: comment.get('text'),
      tagDescriptions,
      userId,
      transacting: trx
    }))
    .then(() => Post.find(comment.get('post_id')))
    .then(post => post && Tag.updateForPost(post, null, null, null, trx))
  },

  addToUser: function (user, tagNames, { transacting } = {}) {
    return createAsNeeded(uniq(map(sanitize, tagNames)), {transacting})
    .then(ids => {
      const now = new Date()
      const pivot = id => ({tag_id: id, created_at: now})
      return user.tags().attach(ids.map(pivot), {transacting})
    })
  },

  // allTagNames is the exact list of tag names that the user should end up with
  // after this operation completes. Tags will be added and removed as necessary
  // for that to be the case.
  updateUser: function (user, allTagNames, opts = {}) {
    return user.load('tags')
    .then(() => {
      const oldTags = user.relations.tags.map(t => t.pick('id', 'name'))
      const newTags = map(name => ({name}), allTagNames)
      const lowerName = t => t.name.toLowerCase()
      const toRemove = differenceBy(lowerName, oldTags, newTags)
      const toAdd = differenceBy(lowerName, newTags, oldTags)

      return Promise.all([
        !isEmpty(toRemove) && user.tags().detach(map('id', toRemove), opts),
        !isEmpty(toAdd) && Tag.addToUser(user, map('name', toAdd), opts)
      ])
    })
  },

  starterTags: function (trx) {
    return Tag.where('name', 'in', Tag.STARTER_NAMES).fetchAll({transacting: trx})
  },

  createStarterTags: function (trx) {
    return Tag.starterTags(trx)
    .then(starterTags => {
      var undefinedTagNames = difference(
        Tag.STARTER_NAMES,
        starterTags.map(t => t ? t.get('name') : null)
      )
      return Promise.map(undefinedTagNames, tagName =>
        new Tag({name: tagName}).save({}, {transacting: trx}))
    })
  },

  merge: (id1, id2) => {
    return bookshelf.transaction(trx => {
      const update = (table, uniqueCols) =>
        updateOrRemove(table, 'tag_id', id2, id1, uniqueCols, trx)

      return Promise.join(
        update('posts_tags', ['post_id']),
        update('communities_tags', ['community_id']),
        update('tag_follows', ['community_id', 'user_id']),
        update('tags_users', ['user_id'])
      )
      .then(() => trx('tags').where('id', id2).del())
    })
  },

  remove: id => {
    return bookshelf.transaction(trx => {
      const tables = ['tags_users', 'tag_follows', 'communities_tags', 'posts_tags']
      return Promise.all(tables.map(t => trx(t).where('tag_id', id).del()))
      .then(() => trx('tags').where('id', id).del())
    })
  },

  taggedPostCount: tagId => {
    return bookshelf.knex('posts_tags')
    .join('posts', 'posts.id', 'posts_tags.post_id')
    .where('posts.active', true)
    .where({tag_id: tagId})
    .count()
    .then(rows => Number(rows[0].count))
  },

  followersCount: (tagId, communityId) => {
    const query = communityId ? {
      community_id: communityId,
      tag_id: tagId
    } : {tag_id: tagId}
    return bookshelf.knex('tag_follows')
    .where(query)
    .count()
    .then(rows => Number(rows[0].count))
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

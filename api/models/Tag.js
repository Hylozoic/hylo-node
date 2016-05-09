import { updateOrRemove } from '../../lib/util/knex'
import { differenceBy, includes, isEmpty, pick, some, uniqBy } from 'lodash'
import { map } from 'lodash/fp'

const tagsInText = (text = '') => {
  // TODO alphanumeric and underscore
  return (text.match(/#[A-Za-z][\w-]+/g) || []).map(str => str.substr(1))
}

const addToTaggable = (taggable, tagName, selected, trx) => {
  var association, communities
  var isPost = !taggable.post
  if (isPost) {
    // taggable is a post
    association = 'communities'
    communities = post => post.relations.communities.models
  } else {
    // taggable is a comment
    association = 'post.communities'
    communities = comment => comment.relations.post.relations.communities.models
  }
  return taggable.load(association, {transacting: trx})
  .then(() => Tag.find(tagName, {transacting: trx}))
  .then(tag => {
    if (tag) return tag
    return new Tag({
      name: tagName,
      created_at: new Date()
    }).save({}, {transacting: trx})
    .catch(() => Tag.find(tagName, {transacting: trx}))
  })
  .tap(tag => {
    var attachment = {tag_id: tag.id, created_at: new Date()}
    if (isPost) attachment.selected = selected
    return taggable.tags().attach(attachment, {transacting: trx})
  })
  .then(tag => Promise.map(communities(taggable), com =>
    addToCommunity(com, tag, taggable.get('user_id'), trx)))
}

const removeFromTaggable = (taggable, tag, trx) => {
  return taggable.tags().detach(tag.id, {transacting: trx})
}

const addToCommunity = (community, tag, user_id, trx) => {
  return CommunityTag.where({community_id: community.id, tag_id: tag.id}).fetch({transacting: trx})
  // the catch here is for the case where another user just created the CommunityTag
  // the save fails, but we don't care about the result
  .then(comTag => comTag ||
    new CommunityTag({
      community_id: community.id,
      tag_id: tag.id,
      user_id: user_id,
      created_at: new Date()
    }).save({}, {transacting: trx})
    .catch(() => {}))
}

const updateForTaggable = (taggable, text, tagParam, trx) => {
  const lowerName = t => t.name.toLowerCase()
  const tagDifference = (a, b) =>
    differenceBy(a, b, t => pick(t, 'name', 'selected'))

  var newTags = tagsInText(text).map(name => ({name, selected: false}))
  if (tagParam) newTags.push({name: tagParam, selected: true})
  return taggable.load('tags', {transacting: trx})
  .then(post => {
    const oldTags = taggable.relations.tags.map(t => ({
      id: t.id,
      name: t.get('name'),
      selected: t.pivot.get('selected')
    }))
    const toAdd = uniqBy(tagDifference(newTags, oldTags), lowerName)
    const toRemove = tagDifference(oldTags, newTags)
    return Promise.all(
      toRemove.map(tag => removeFromTaggable(taggable, tag, trx))
      .concat(toAdd.map(tag => addToTaggable(taggable, tag.name, tag.selected, trx))))
  })
}

const invalidCharacterRegex = /[^\w\-]/
const sanitize = tag => tag.replace(/ /g, '-').replace(invalidCharacterRegex, '')

const createAsNeeded = tagNames => {
  const lower = t => t.toLowerCase()

  // sure wish knex handled this for me automatically
  const sqlize = arr => arr.map(x => `'${x}'`).join(', ')
  const nameMatch = arr => `lower(name) in (${sqlize(map(lower, arr))})`

  // find existing tags
  return Tag.query().whereRaw(nameMatch(tagNames)).select(['id', 'name'])
  .then(existing => {
    const toCreate = differenceBy(tagNames, map('name', existing), lower)
    const created_at = new Date()

    // create new tags as necessary
    return (isEmpty(toCreate)
      ? Promise.resolve([])
      : bookshelf.knex('tags')
        .insert(toCreate.map(name => ({name, created_at})))
        .then(() => Tag.query().whereRaw(nameMatch(toCreate)).select('id')))
    // return the ids of existing and created tags together
    .then(created => map('id', existing.concat(created)))
  })
}

const incrementName = name => {
  const regex = /\d*$/
  const word = name.replace(regex, '')
  const number = Number(name.match(regex)[0] || 1) + 1
  return `${word}${number}`
}

module.exports = bookshelf.Model.extend({
  tableName: 'tags',

  users: function () {
    return this.belongsToMany(User).through(TagUser)
  },

  communities: function () {
    return this.belongsToMany(Community).through(CommunityTag).withPivot('user_id')
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

  saveWithValidName: function (opts) {
    let name = this.get('name')
    const word = name.match(/^(.+)(\d*)$/)[1]
    return Tag.query().where('name', 'ilike', `${word}%`)
    .transacting(opts.transacting)
    .pluck('name')
    .then(names => {
      const lowerNames = map(n => n.toLowerCase(), names)
      while (includes(lowerNames, name.toLowerCase())) {
        name = incrementName(name)
      }
      return this.save({name}, opts)
    })
  }
}, {

  DEFAULT_NAMES: ['offer', 'request', 'intention'],

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    if (isNaN(Number(id))) {
      return Tag.query(qb => qb.whereRaw('lower(name) = lower(?)', id))
      .fetch(options)
    }
    return Tag.where({id: id}).fetch(options)
  },

  updateForPost: function (post, tagParam, trx) {
    return updateForTaggable(post, post.get('name') + ' ' + post.get('description'), tagParam, trx)
  },

  updateForComment: function (comment, trx) {
    return updateForTaggable(comment, comment.get('text'), null, trx)
  },

  addToUser: function (user, values, reset) {
    return (reset
      ? bookshelf.knex('tags_users').where('user_id', user.id).del()
      : Promise.resolve()
    )
    .then(() => createAsNeeded(map(sanitize, values)))
    .then(ids => {
      const created_at = new Date()
      const pivot = id => ({tag_id: id, created_at})
      user.tags().attach(ids.map(pivot))
    })
  },

  updateUser: function (user, values) {
    const oldTags = user.relations.tags.map(t => t.pick('id', 'name'))
    const newTags = map(name => ({name}), values)
    const lowerName = t => t.name.toLowerCase()
    const toRemove = differenceBy(oldTags, newTags, lowerName)
    const toAdd = differenceBy(newTags, oldTags, lowerName)

    return Promise.all([
      some(toRemove) && user.tags().detach(map('id', toRemove)),
      some(toAdd) && Tag.addToUser(user, map('name', toAdd))
    ])
  },

  defaultTags: function (trx) {
    return Promise.map(Tag.DEFAULT_NAMES, name => Tag.find(name, {transacting: trx}))
  },

  createDefaultTags: function (trx) {
    return Tag.defaultTags(trx)
    .then(defaultTags => {
      var undefinedTagNames = _.difference(
        Tag.DEFAULT_NAMES,
        defaultTags.map(t => t ? t.get('name') : null)
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
  }
})

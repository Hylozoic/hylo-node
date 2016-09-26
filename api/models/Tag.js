import { updateOrRemove } from '../../lib/util/knex'
import { flatten, includes, isEmpty, uniq } from 'lodash'
import { differenceBy, filter, find, get, map, pick, some, uniqBy } from 'lodash/fp'

const tagsInText = (text = '') => {
  const re = /(?:^| |>)#([A-Za-z][\w-]+)/g
  var match
  var tags = []
  while ((match = re.exec(text)) != null) {
    tags.push(match[1])
  }
  return tags
}

const addToTaggable = (taggable, tagName, selected, tagDescriptions, transacting) => {
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
  return taggable.load(association, {transacting})
  .then(() => Tag.find(tagName, {transacting}))
  .then(tag => {
    if (tag) return tag
    return new Tag({
      name: tagName,
      created_at: new Date()
    }).save({}, {transacting})
    .catch(() => Tag.find(tagName, {transacting}))
  })
  .tap(tag => {
    var attachment = {tag_id: tag.id, created_at: new Date()}
    if (isPost) attachment.selected = selected
    return taggable.tags().attach(attachment, {transacting})
  })
  .then(tag => Promise.map(communities(taggable), com => {
    const { description, is_default } = get(tag.get('name'), tagDescriptions) || {}
    return addToCommunity(com.id, tag.id, taggable.get('user_id'), description, is_default, transacting)
  }))
}

const removeFromTaggable = (taggable, tag, transacting) => {
  return taggable.tags().detach(tag.id, {transacting})
}

const addToCommunity = (community_id, tag_id, user_id, description, is_default, transacting) => {
  const created_at = new Date()
  return CommunityTag.where({community_id, tag_id}).fetch({transacting})
  .then(comTag => {
    return comTag ||
    new CommunityTag({community_id, tag_id, user_id, description, is_default, created_at})
    .save({}, {transacting})
    .catch(() => {})
  })
    // this catch is for the case where another user just created the
    // CommunityTag (race condition): the save fails, but we don't care about
    // the result
  .then(() => TagFollow.where({community_id, tag_id, user_id}).fetch({transacting}))
  .then(follow => follow ||
    new TagFollow({community_id, tag_id, user_id, created_at}).save({}, {transacting}))
}

const updateForTaggable = (taggable, text, tagParam, tagDescriptions, trx) => {
  const lowerName = t => t.name.toLowerCase()
  const tagDifference = differenceBy(t => pick(['name', 'selected'], t))

  var newTags = tagsInText(text).map(name => ({name, selected: false}))
  if (tagParam) {
    const dupe = find(t => t.name === tagParam, newTags)
    if (dupe) {
      dupe.selected = true
    } else {
      newTags.push({name: tagParam, selected: true})
    }
  }
  return taggable.load('tags', {transacting: trx})
  .then(() => {
    const oldTags = taggable.relations.tags.map(t => ({
      id: t.id,
      name: t.get('name'),
      selected: t.pivot.get('selected')
    }))
    const toAdd = uniqBy(lowerName, tagDifference(newTags, oldTags))
    const toRemove = tagDifference(oldTags, newTags)
    return Promise.all(flatten([
      toRemove.map(tag => removeFromTaggable(taggable, tag, trx)),
      toAdd.map(tag => addToTaggable(taggable, tag.name, tag.selected, tagDescriptions, trx))
    ]))
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

  STARTER_NAMES: ['offer', 'request', 'intention'],

  isValidTag: function (text) {
    return !!text.match(/^[A-Za-z][\w\-]+$/)
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

  updateForPost: function (post, tagParam, tagDescriptions, trx) {
    return updateForTaggable(post, post.get('name') + ' ' + post.get('description'), tagParam, tagDescriptions, trx)
  },

  updateForComment: function (comment, tagDescriptions, trx) {
    return updateForTaggable(comment, comment.get('text'), null, tagDescriptions, trx)
  },

  addToUser: function (user, values, reset) {
    return (reset
      ? bookshelf.knex('tags_users').where('user_id', user.id).del()
      : Promise.resolve()
    )
    .then(() => createAsNeeded(uniq(map(sanitize, values))))
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
      !isEmpty(toRemove) && user.tags().detach(map('id', toRemove)),
      !isEmpty(toAdd) && Tag.addToUser(user, map('name', toAdd))
    ])
  },

  starterTags: function (trx) {
    return Tag.where('name', 'in', Tag.STARTER_NAMES).fetchAll()
  },

  createStarterTags: function (trx) {
    return Tag.starterTags(trx)
    .then(starterTags => {
      var undefinedTagNames = _.difference(
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

  nonexistent: (names, communityIds) => {
    if (names.length === 0 || communityIds.length === 0) return Promise.resolve({})

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

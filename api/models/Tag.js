import { updateOrRemove } from '../../lib/util/knex'

const tagsInText = (text = '') => {
  // TODO alphanumeric and underscore
  return (text.match(/#\w+/g) || []).map(str => str.substr(1))
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
    if (tag) {
      return tag
    } else {
      return new Tag({
        name: tagName,
        created_at: new Date()
      }).save({}, {transacting: trx})
      .catch(() => Tag.find(tagName, {transacting: trx}))
    }
  })
  .tap(tag => {
    var attachment = {tag_id: tag.id}
    if (isPost) {
      attachment.selected = selected
    }
    return taggable.tags().attach(attachment, {transacting: trx})
  })
  .then(tag => Promise.map(communities(taggable), com => addToCommunity(com, tag, taggable.get('user_id'), trx)))
}

const removeFromTaggable = (taggable, tag, trx) => {
  return taggable.tags().detach(tag.id, {transacting: trx})
}

const addToCommunity = (community, tag, user_id, trx) => {
  return CommunityTag.where({community_id: community.id, tag_id: tag.id}).fetch({transacting: trx})
  // the catch here is for the case where another user just created the CommunityTag
  // the save fails, but we don't care about the result
  .then(comTag => comTag ||
    new CommunityTag({community_id: community.id, tag_id: tag.id, user_id: user_id}).save({}, {transacting: trx})
    .catch(() => {}))
}

const updateForTaggable = (taggable, text, tagParam, trx) => {
  var differenceOfTags = (a, b) =>
    _.differenceBy(a, b, t => _.pick(t, 'name', 'selected'))

  var newTags = tagsInText(text).map(tagName => ({name: tagName, selected: false}))
  if (tagParam) {
    newTags.push({name: tagParam, selected: true})
  }
  return taggable.load('tags', {transacting: trx})
  .then(post => {
    // making oldTags the same structure as newTags, for easier taking of difference
    var oldTags = taggable.relations.tags.models.map(t =>
      _.merge(t.pick('id', 'name'),
        {selected: t.pivot.get('selected')}))

    var toAdd = _.uniqBy(differenceOfTags(newTags, oldTags), 'name')
    var toRemove = differenceOfTags(oldTags, newTags)

    return Promise.all(
      toRemove.map(tag => removeFromTaggable(taggable, tag, trx))
      .concat(toAdd.map(tag => addToTaggable(taggable, tag.name, tag.selected, trx))))
  })
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

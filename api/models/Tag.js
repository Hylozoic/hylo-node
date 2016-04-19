var tagsInText = (text = '') => {
  // TODO alphanumeric and underscore
  return (text.match(/#\w+/g) || []).map(str => str.substr(1))
}

var addToTaggable = (taggable, tagName, selected, trx) => {
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
  .then(() => Tag.find(tagName))
  .then(tag => {
    if (tag) {
      return tag
    } else {
      return new Tag({name: tagName}).save({}, {transacting: trx})
      .catch(() => Tag.find(tagName))
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

var removeFromTaggable = (taggable, tag, trx) => {
  return taggable.tags().detach(tag.id, {transacting: trx})
}

var addToCommunity = (community, tag, user_id, trx) => {
  return CommunityTag.where({community_id: community.id, tag_id: tag.id}).fetch()
  // the catch here is for the case where another user just created the CommunityTag
  // the save fails, but we don't care about the result
  .then(comTag => comTag ||
    new CommunityTag({community_id: community.id, tag_id: tag.id, user_id: user_id}).save({}, {transacting: trx})
    .catch(() => {}))
}

var updateForTaggable = (taggable, text, tagParam, trx) => {
  var differenceOfTags = (a, b) =>
    _.differenceBy(a, b, t => _.pick(t, 'name', 'selected'))

  var newTags = tagsInText(text).map(tagName => ({name: tagName, selected: false}))
  if (tagParam) {
    newTags.push({name: tagParam, selected: true})
  }
  return taggable.load('tags')
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
  }

}, {

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    if (isNaN(Number(id))) {
      return Tag.query(qb => qb.whereRaw('LOWER(name) = ?', id.toLowerCase()))
      .fetch(options)
    }
    return Tag.where({id: id}).fetch(options)
  },

  updateForPost: function (post, tagParam, trx) {
    return updateForTaggable(post, post.get('name') + ' ' + post.get('description'), tagParam, trx)
  },

  updateForComment: function (comment, trx) {
    return updateForTaggable(comment, comment.get('text'), null, trx)
  }
})

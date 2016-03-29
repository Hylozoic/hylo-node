var tagsInText = (text = '') => {
  // TODO alphanumeric and underscore
  return (text.match(/#\w+/g) || []).map(str => str.substr(1, str.length))
}

var addToPost = (post, tagName, selected, trx) => {
  return post.load('communities')
  .then(() => Tag.find(tagName))
  .then(tag => {
    if (tag) {
      return tag
    } else {
      return new Tag({name: tagName}).save({}, {transacting: trx})
    }
  })
  .tap(tag => post.tags().attach({tag_id: tag.id, selected: selected}, {transacting: trx}))
  .then(tag => Promise.map(post.relations.communities.models, com => addToCommunity(com, tag, post.user_id, trx)))
}

var removeFromPost = (post, tag, trx) => {
  return post.tags().detach(tag.id, {transacting: trx})
}

var addToCommunity = (community, tag, user_id, trx) => {
  return CommunityTag.where({community_id: community.id, tag_id: tag.id}).fetch()
  .then(comTag => {
    if (!comTag) {
      return new CommunityTag({community_id: community.id, tag_id: tag.id, owner_id: user_id}).save()
    }
  })
}

module.exports = bookshelf.Model.extend({

  tableName: 'tags',

  users: function () {
    return this.belongsToMany(User).through(TagUser)
  },

  communities: function () {
    return this.belongsToMany(Community).through(CommunityTag).withPivot('owner_id')
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
      return Tag.where({name: id}).fetch(options)
    }
    return Tag.where({id: id}).fetch(options)
  },

  updateForPost: function (post, tagParam, trx) {
    var newTags = tagsInText(post.get('description')).map(tagName => ({name: tagName, selected: false}))
    if (tagParam) {
      newTags.push({name: tagParam, selected: true})
    }
    return post.load('tags')
    .then(post => {
      // newTags and oldTags (and thus toAdd and toRemove) are not symmetrical.
      // newTags and toAdd are JS objects, oldTags and toRemove are bookshelf models
      var oldTags = post.relations.tags.models
      var toAdd = _.differenceBy(newTags, oldTags, 'id')
      var toRemove = _.differenceBy(oldTags, newTags, 'id')
      return Promise.all(
        toAdd.map(tag => addToPost(post, tag.name, tag.selected, trx))
        .concat(toRemove.map(tag => removeFromPost(post, tag, trx))))
    })
  }
})

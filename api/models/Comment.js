module.exports = bookshelf.Model.extend({
  tableName: 'comment',

  user: function () {
    return this.belongsTo(User)
  },

  post: function () {
    return this.belongsTo(Post)
  },

  text: function () {
    return this.get('text')
  },

  mentions: function () {
    return RichText.getUserMentions(this.text())
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  community: function () {
    return this.relations.post.relations.communities.first()
  },

  tags: function () {
    return this.belongsToMany(Tag).through(CommentTag)
  },

  createActivities: function (trx) {
    var self = this
    return self.load(['post', 'post.followers'])
    .then(() => {
      const followers = self.relations.post.relations.followers.map(follower => ({
        reader_id: follower.id,
        comment_id: self.id,
        post_id: self.relations.post.id,
        actor_id: self.get('user_id'),
        reason: 'newComment'
      }))
      const mentioned = RichText.getUserMentions(self.get('text')).map(mentionedId => ({
        reader_id: mentionedId,
        comment_id: self.id,
        post_id: self.relations.post.id,
        actor_id: self.get('user_id'),
        reason: 'commentMention'
      }))
      return Activity.saveReasons(Activity.mergeReasons(followers.concat(mentioned), trx))
    })
  }
}, {

  find: function (id, options) {
    return Comment.where({id: id}).fetch(options)
  },

  createdInTimeRange: function (collection, startTime, endTime) {
    if (endTime === undefined) {
      endTime = startTime
      startTime = collection
      collection = Comment
    }

    return collection.query(function (qb) {
      qb.whereRaw('comment.created_at between ? and ?', [startTime, endTime])
      qb.where('comment.active', true)
    })
  }
})

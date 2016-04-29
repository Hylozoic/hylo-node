const userColumns = q => q.column('id', 'name', 'avatar_url')

const updateRecentComments = postId =>
  Queue.classMethod('Post', 'setRecentComments', {postId})

var createComment = function (commenterId, text, post) {
  text = RichText.sanitize(text)
  var attrs = {
    text: text,
    created_at: new Date(),
    post_id: post.id,
    user_id: commenterId,
    active: true
  }

  return post.load('followers')
  .then(() => {
    const mentioned = RichText.getUserMentions(text)
    const existingFollowers = post.relations.followers.pluck('id')
    const newFollowers = _.difference(_.uniq(mentioned.concat(commenterId)), existingFollowers)

    return bookshelf.transaction(function (trx) {
      return new Comment(attrs).save(null, {transacting: trx})
      .tap(comment => Tag.updateForComment(comment, trx))
      .tap(() => post.updateCommentCount(trx))
    })
    .tap(comment => comment.createActivities())
    .tap(comment => post.addFollowers(newFollowers, commenterId))
    .tap(comment => Queue.classMethod('Comment', 'sendNotifications', {commentId: comment.id}))
    .tap(() => updateRecentComments(post.id))
  })
}

module.exports = {
  findForPost: function (req, res) {
    Comment.query(function (qb) {
      qb.where({post_id: res.locals.post.id, active: true})
      qb.orderBy('id', 'asc')
    }).fetchAll({withRelated: [
      {user: userColumns},
      'thanks',
      {'thanks.thankedBy': userColumns}
    ]})
    .then(cs => cs.map(c => CommentPresenter.present(c, req.session.userId)))
    .then(res.ok, res.serverError)
  },

  create: function (req, res) {
    return createComment(req.session.userId, req.param('text'), res.locals.post)
    .then(comment => comment.load({user: userColumns}))
    .then(c => CommentPresenter.present(c, req.session.userId))
    .then(res.ok, res.serverError)
  },

  createFromEmail: function (req, res) {
    try {
      var replyData = Email.decodePostReplyAddress(req.param('To'))
    } catch (e) {
      return res.serverError(new Error('Invalid reply address: ' + req.param('To')))
    }

    return Post.find(replyData.postId)
    .then(post => {
      if (!post) return
      Analytics.track({
        userId: replyData.userId,
        event: 'Post: Comment: Add by Email',
        properties: {
          post_id: post.id
        }
      })
      return createComment(replyData.userId, req.param('stripped-text'), post)
    })
    .then(() => res.ok({}), res.serverError)
  },

  thank: function (req, res) {
    Comment.find(req.param('commentId'), {withRelated: [
      {thanks: q => q.where('thanked_by_id', req.session.userId)}
    ]})
    .then(comment => {
      const thank = comment.relations.thanks.first()
      return thank
        ? thank.destroy()
        : Thank.create(comment, req.session.userId)
    })
    .then(() => res.ok({}), res.serverError)
  },

  destroy: function (req, res) {
    Comment.find(req.param('commentId'))
    .then(comment =>
      bookshelf.transaction(trx => Promise.join(
        Activity.where('comment_id', comment.id).destroy({transacting: trx}),
        Post.query().where('id', comment.get('post_id')).decrement('num_comments', 1).transacting(trx),
        comment.save({
          deactivated_by_id: req.session.userId,
          deactivated_on: new Date(),
          active: false,
          recent: false
        }, {patch: true}).tap(c => updateRecentComments(c.get('post_id')))
    )))
    .then(() => res.ok({}), res.serverError)
  }
}

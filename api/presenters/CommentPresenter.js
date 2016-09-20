module.exports = {
  present: (comment, userId) => {
    const attrs = _.pick(comment.toJSON(), 'id', 'text', 'created_at', 'user')
    const thanks = (comment.relations.thanks || []).map(t => t.relations.thankedBy)
    return _.extend(attrs, {thanks})
  }
}

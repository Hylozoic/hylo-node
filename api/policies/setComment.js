module.exports = function checkAndSetPost (req, res, next) {
  var commentId = req.param('commentId')

  if (!commentId) return next()

  var fail = function (log, responseType) {
    sails.log.debug(`policy: checkAndSetPost: ${log}`)
    res[responseType || 'forbidden']()
  }

  return Comment.find(commentId)
  .then(comment => {
    if (!comment) return fail(`comment ${commentId} not found`, 'notFound')

    res.locals.comment = comment

    return next()
  })
  .catch(err => fail(err.message, 'serverError'))
}

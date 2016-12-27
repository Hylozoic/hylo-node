const removeComments = (postId, trx) =>
  trx('comments').where('post_id', postId).pluck('id')
  .then(ids => {
    if (ids.length === 0) return

    const remove = (table, column = 'comment_id') =>
      trx(table).where(column, 'in', ids).del()

    return Promise.all([
      remove('thanks'),
      remove('comments_Tags')
    ])
    .then(() => remove('comments', 'id'))
  })

export const removePost = postId => {
  return bookshelf.transaction(trx => {
    const remove = table =>
      trx(table).where('post_id', postId).del()

    const unset = (table, col = 'post_id') =>
      trx(table).where(col, postId).update({[col]: null})

    return Promise.all([
      removeComments(postId, trx),
      remove('follows'),
      remove('user_post_relevance'),
      remove('posts_tags'),
      remove('posts_users'),
      remove('communities_posts'),
      unset('posts', 'parent_post_id')
    ])
    .then(() => trx('posts').where('id', postId).del())
  })
}

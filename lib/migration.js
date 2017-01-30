import { reduce } from 'lodash'

export const convertPostsForTagToChildren = (tagId, parentPostId, trxOpt) => {
  return Post.query(qb => {
    qb.join('posts_tags', 'posts_tags.post_id', '=', 'posts.id')
    qb.where('posts_tags.tag_id', '=', tagId)
    qb.where(function () {
      this.where('type', '!=', 'project')
      .orWhere('type', null)
    })
  })
  .fetchAll()
  .then(({models}) => reduce(models, (promise, post) => promise
    .then(() => post.save('parent_post_id', parentPostId, trxOpt)),
    Promise.resolve())
  )
}

const findOfficialProjectTags = (projects) => {
  return reduce(
    projects,
    (promise, project) => promise
      .then(() => PostTag.query(qb => {
          qb.where('post_id', project.id)
          qb.where('selected', true) // 'selected' would get set based on the tag set in the suggestedTagEditor for projects
        })
        .fetch()
        .then(postTag => bookshelf.transaction(trx => {
          console.log(`attempting to migrate tag for project '${project.get('name')}'`)
          if (!postTag) {
            console.log(`tag for project '${project.get('name')}' has already been migrated`)
            return Promise.resolve()
          }
          const trxOpt = {transacting: trx}, tagId = postTag.get('tag_id')
          return convertPostsForTagToChildren(tagId, project.id, trxOpt)
            .then(() => PostTag.query(qb => qb.where('tag_id', tagId)).destroy(trxOpt))
            .then(() => TagUser.query(qb => qb.where('tag_id', tagId)).destroy(trxOpt))
            .then(() => TagFollow.query(qb => qb.where('tag_id', tagId)).destroy(trxOpt))
            .then(() => CommentTag.query(qb => qb.where('tag_id', tagId)).destroy(trxOpt))
            .then(() => CommunityTag.query(qb => qb.where('tag_id', tagId)).destroy(trxOpt))
            .then(() => Tag.query(qb => qb.where('id', tagId)).destroy(trxOpt))
            .then(() => {
              console.log(`tag for project '${project.get('name')}' has successfully been migrated`)
              return Promise.resolve()
            })
        }))
      ),
  Promise.resolve())
}

export const convertProjectPostsToChildren = () => {
  return Post.query(qb => {
    qb.where('type', '=', 'project')
  })
  .fetchAll()
  .then(({models}) => findOfficialProjectTags(models))
}

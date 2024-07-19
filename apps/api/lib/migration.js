import { reduce } from 'lodash'

export const convertChildrenToProjectRequests = (parentPostId, trx) => {
  return Post.query().where('parent_post_id', parentPostId)
       .update({is_project_request: true}).transacting(trx)
}

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
    .then(() => post.save('parent_post_id', parentPostId, trxOpt))
    .then(() => PostMembership.query(qb => qb.where('post_id', post.id)).destroy(trxOpt)), // it will rely on the parent posts community membership
    Promise.resolve())
  )
}

const findOfficialProjectTags = (projects) =>
  reduce(
    projects,
    (promise, project) =>
      promise.then(() =>
        PostTag.where({post_id: project.id, selected: true}).fetch())
        // 'selected' would get set based on the tag set in the suggestedTagEditor for projects
      .then(postTag => bookshelf.transaction(trx => {
        console.log(`attempting to migrate tag for project '${project.get('name')}'`)
        if (!postTag) {
          console.log(`tag for project '${project.get('name')}' has already been migrated`)
          return Promise.resolve()
        }
        const trxOpt = {transacting: trx}
        const tagId = postTag.get('tag_id')
        return convertChildrenToProjectRequests(project.id, trx)
        .then(() => convertPostsForTagToChildren(tagId, project.id, trxOpt))
        .then(() => Promise.map(
          [PostTag, TagFollow, CommentTag, CommunityTag],
          model => model.query().where('tag_id', tagId).del().transacting(trx)
        ))
        .then(() => Tag.query(qb => qb.where('id', tagId)).destroy(trxOpt))
        .then(() => {
          console.log(`tag for project '${project.get('name')}' has successfully been migrated`)
          return Promise.resolve()
        })
      })),
    Promise.resolve()
  )

export const convertProjectPostsToChildren = () => {
  return Post.where('type', 'project').fetchAll()
  .then(({ models }) => findOfficialProjectTags(models))
}

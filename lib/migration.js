import { markdown } from '../api/services/RichText'
import { negate, reduce, startCase } from 'lodash'
import { flow, filter, map } from 'lodash/fp'

const mergeText = (intention, details) => {
  var text = ''
  if (intention) text += `<p>Core Intention: ${intention}<p>`
  if (details) text += markdown(details)
  return text
}

export const tagFromName = (project, attr = 'title') =>
  flow(
    startCase,
    s => s.split(' '),
    filter(w => w.length > 1),
    map(w => w.replace(/[^\w\-]/, '')),
    a => a.slice(0, 4),
    a => a.join('')
  )(project.get(attr))

const isCreatorRequest = project => post =>
  post.get('type') === 'request' && post.get('user_id') === project.get('user_id')

const creatorRequests = project =>
  project.relations.posts.filter(isCreatorRequest(project))

const otherPosts = project =>
  project.relations.posts.filter(negate(isCreatorRequest(project)))

const postAttachment = post => ({
  post_id: post.id,
  created_at: new Date()
})

const followAttachment = membership => ({
  user_id: membership.get('user_id'),
  role: membership.get('role')
})

export const convertProjectToPost = projectId => {
  return Project.find(projectId, {withRelated: [
    'posts', 'memberships', 'media'
  ]})
  .then(project => bookshelf.transaction(trx => {
    if (project.get('visibility') === Project.Visibility.DRAFT_PROJECT) {
      console.log(`project ${project.id} is a draft; ignoring.`)
      return
    }

    const now = new Date()
    const tag = new Tag({name: tagFromName(project), created_at: now})
    if (!tag.get('name')) tag.set('name', tagFromName(project, 'intention'))
    const trxOpt = {transacting: trx}
    const attrs = {
      user_id: project.get('user_id'),
      type: 'project',
      name: project.get('title'),
      description: mergeText(project.get('intention'), project.get('details')),
      visibility: project.get('visibility'),
      created_at: project.get('created_at'),
      updated_at: project.get('updated_at')
    }

    return Post.create(attrs, trxOpt)
    .tap(post => tag.saveWithValidName(trxOpt).then(tag =>
      post.tags().attach({tag_id: tag.id, selected: true, created_at: now}, trxOpt)))
    .then(post => post.load('selectedTags', trxOpt))
    .tap(post => Promise.all([
      // set up the creator's requests as direct children of the project
      Post.query().where('id', 'in', creatorRequests(project).map(p => p.id))
      .update({parent_post_id: post.id}).transacting(trx),

      // set up all other posts as connected via the project's hashtag
      post.relations.selectedTags.first().posts()
      .attach(otherPosts(project).map(postAttachment), trxOpt),

      // set up project contributors as post followers
      post.followers().attach(project.relations.memberships.map(followAttachment), trxOpt),

      // set up community relation
      post.communities().attach(project.get('community_id'), trxOpt),

      // set up media
      Media.query().where('id', 'in', project.relations.media.map(m => m.id))
      .update({post_id: post.id}).transacting(trx),

      // set up post id for project invitations
      ProjectInvitation.query().where('project_id', project.id)
      .update({post_id: post.id}).transacting(trx)
    ]))
  }))
  .then(post => post.id)
}

export const convertAllProjectsToPosts = () => {
  return Project.query()
  .where('migrated', false)
  .where('title', '!=', '')
  .where('published_at', 'is not', null)
  .pluck('id')
  .then(ids => reduce(ids, (promise, id) => promise
    .then(() => convertProjectToPost(id))
    .then(() => Project.query().where('id', id).update({migrated: true})),
    Promise.resolve()))
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

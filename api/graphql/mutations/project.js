import { createPost } from './post'

export function createProject (userId, data) {
  const projectData = Object.assign({}, data, {type: Post.Type.PROJECT})
  console.log('createProject projectData', projectData)
  return createPost(userId, projectData)
}

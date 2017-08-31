export function upload (args) {
  const { type, id, userId, url, stream } = args
  return validate(args)
  .then(() => {
    // if url is present, construct a request stream
    return 'todo'
  })
}

function validate ({ type }) {
  // file data or url must be present
  // type & id must be present
  // type must be valid
  if (!uploadTypes.includes(type)) return Promise.reject(new Error('Invalid type'))

  // current user must have permission to change type and id
}

const uploadTypes = [
  'user-avatar',
  'user-banner',
  'community-avatar',
  'community-banner',
  'network-avatar',
  'network-banner',
  'post',
  'comment'
]

// use UploadController for the first six but use the existing post & comment
// creation endpoints for the last two? that would require supporting multipart
// uploads in GraphQL
// https://medium.com/@danielbuechele/file-uploads-with-graphql-and-apollo-5502bbf3941e
//
// and then in that case, why not do the whole thing in graphql?

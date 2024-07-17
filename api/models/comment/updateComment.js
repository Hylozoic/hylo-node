const { GraphQLYogaError } = require('@graphql-yoga/node')
import { difference, uniq, isEqual } from 'lodash'
import { updateMedia } from './util'

export default async function updateComment (commenterId, id, params) {
  if (!id) throw new GraphQLYogaError('updateComment called with no ID')

  const comment = await Comment.find(id, { withRelated: ['post', 'media'] })

  if (!comment) throw new GraphQLYogaError('cannot find comment with ID', id)

  let { text, attachments } = params

  const attrs = { text }
  const post = comment.relations.post
  const mentioned = RichText.getUserMentions(text)
  const existingFollowers = await post.followers().fetch().then(f => f.pluck('id'))
  const newFollowers = difference(uniq(mentioned.concat(commenterId)), existingFollowers)

  if (!isEqual(comment.text(), params.text)) {
    attrs.edited_at = new Date()
  }

  return bookshelf.transaction(trx =>
    comment.save(attrs, {transacting: trx})
      .then(() => updateMedia(comment, attachments, trx))
  )
  .then(() => post.addFollowers(newFollowers))
  .then(() => comment)
}

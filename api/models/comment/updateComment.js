import { difference, uniq } from 'lodash'
import { sanitize } from 'hylo-utils/text'
import { updateMedia } from './util'

export default async function updateComment (commenterId, id, params) {
  if (!id) throw new Error('updateComment called with no ID')

  const comment = await Comment.find(id, {withRelated: 'post'})

  if (!comment) throw new Error('cannot find comment with ID', id)

  let { text, attachments } = params  

  text = sanitize(text)

  const attrs = { text }
  const post = comment.relations.post
  const mentioned = RichText.getUserMentions(text)
  const existingFollowers = await post.followers().fetch().then(f => f.pluck('id'))
  const newFollowers = difference(uniq(mentioned.concat(commenterId)), existingFollowers)

  return bookshelf.transaction(trx =>
    comment.save(attrs, {transacting: trx})
    .tap(updateMedia(comment, attachments, trx)))
  .tap(comment => post.addFollowers(newFollowers))
}

import { sanitize } from 'hylo-utils/text'
import { createMedia } from './createComment'
import { difference, uniq } from 'lodash'

export default async function updateComment (commenterId, id, params) {
  if (!id) throw new Error('updateComment called with no ID')

  let { text, imageUrl } = params
  text = sanitize(text)

  var attrs = {
    text: text
  }
  const comment = await Comment.find(id, {withRelated: 'post'})
  if (!comment) throw new Error('cannot find comment with ID', id)
  const post = comment.relations.post

  const mentioned = RichText.getUserMentions(text)

  const existingFollowers = await post.followers().fetch().then(f => f.pluck('id'))

  const newFollowers = difference(uniq(mentioned.concat(commenterId)), existingFollowers)

  return bookshelf.transaction(trx =>
    comment.save(attrs, {transacting: trx})
    .tap(createMedia(imageUrl, trx)))
  .tap(comment => post.addFollowers(newFollowers))
}

import { difference, uniq } from 'lodash'
import HyloShared from 'hylo-shared'
import { updateMedia } from './util'

export default async function updateComment (commenterId, id, params) {
  if (!id) throw new Error('updateComment called with no ID')

  const comment = await Comment.find(id, { withRelated: ['post', 'media'] })

  if (!comment) throw new Error('cannot find comment with ID', id)

  let { text, attachments } = params

  text = HyloShared.text.sanitize(text)

  const attrs = { text }
  const post = comment.relations.post
  const mentioned = RichText.getUserMentions(text)
  const existingFollowers = await post.followers().fetch().then(f => f.pluck('id'))
  const newFollowers = difference(uniq(mentioned.concat(commenterId)), existingFollowers)

  return bookshelf.transaction(trx =>
    comment.save(attrs, {transacting: trx})
      .then(() => updateMedia(comment, attachments, trx))
  )
  .then(() => post.addFollowers(newFollowers))
  .then(() => comment)
}

import { includes, merge, omit, some } from 'lodash'
import { filter, map } from 'lodash/fp'

export default function updateChildren (post, children, trx) {
  const isNew = child => child.id.startsWith('new')
  const created = filter(c => isNew(c) && !!c.name, children)
  const updated = filter(c => !isNew(c) && !!c.name, children)
  return post.load('children', {transacting: trx})
  .then(() => {
    const existingIds = map('id', post.relations.children.models)
    const removed = filter(id => !includes(map('id', updated), id), existingIds)
    return Promise.all([
      // mark removed posts as inactive
      some(removed) && Post.query().where('id', 'in', removed)
        .update('active', false).transacting(trx),

      // update name and description for updated requests
      Promise.map(updated, child =>
        Post.query().where('id', child.id)
        .update(omit(child, 'id')).transacting(trx)),

      // create new requests
      some(created) && Tag.find({ name: 'request' })
      .then(tag => {
        const attachment = {tag_id: tag.id, selected: true}
        return Promise.map(created, child => {
          const attrs = merge(omit(child, 'id'), {
            parent_post_id: post.id,
            user_id: post.get('user_id'),
            is_project_request: true
          })
          return Post.create(attrs, {transacting: trx})
          .then(post => post.tags().attach(attachment, {transacting: trx}))
        })
      })
    ])
  })
}

import { pick } from 'lodash'

module.exports = {
  present: (comment) => {
    const attrs = pick(comment.toJSON(), 'id', 'text', 'created_at', 'user')
    const thanks = (comment.relations.thanks || []).map(t => t.relations.thankedBy)
    const image = comment.relations.media.first()
    if (image) {
      attrs.image = pick(image.toJSON(), 'url', 'thumbnail_url')
    }
    return Object.assign(attrs, {thanks})
  }
}

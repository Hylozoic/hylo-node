import { get } from 'lodash/fp'
import { getLinkPreview } from 'link-preview-js'

const LinkPreview = bookshelf.Model.extend({
  tableName: 'link_previews',
  requireFetch: false,
  hasTimestamps: true
}, {
  queue: async url => {
    try {
      const { id } = await LinkPreview.forge({ url, created_at: new Date() }).save()

      return Queue.classMethod('LinkPreview', 'populate', { id }, 0)
    } catch (err) {
      if (err.message && !err.message.includes('duplicate key value')) {
        throw err
      }
    }
  },

  populate: async ({ id }) => {
    const preview = await LinkPreview.find(id)
    const doneAttrs = () => ({ updated_at: new Date(), done: true })

    try {
      const linkPreviewData = await getLinkPreview(preview.get('url'), { followRedirects: 'follow' })
      const attrs = doneAttrs()

      attrs.title = linkPreviewData?.title
      attrs.description = linkPreviewData?.description

      const imageURL = get('images[0]', linkPreviewData) || get('favicons[0]', linkPreviewData)

      if (imageURL) {
        attrs.image_url = imageURL
      }

      return preview.save(attrs)
    } catch (err) {
      return preview.save(doneAttrs())
    }
  },

  find: (idOrUrl, opts) => {
    const attr = isNaN(Number(idOrUrl)) ? 'url' : 'id'
    return LinkPreview.where(attr, idOrUrl).fetch(opts)
  }
})

module.exports = LinkPreview

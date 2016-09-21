import request from 'request'
import cheerio from 'cheerio'
import { merge } from 'lodash'
import getImageSize from '../services/GetImageSize'

const httpget = url => new Promise((resolve, reject) =>
  request.get(url, {gzip: true}, (err, res, body) =>
    err ? reject(err) : resolve([res, body])))

const parse = body => {
  const $ = cheerio.load(body)
  const metaContent = name => $(`meta[property="${name}"]`).attr('content')
  return {
    title: metaContent('og:title') || $('title').text(),
    description: metaContent('og:description'),
    image_url: metaContent('og:image')
  }
}

const LinkPreview = bookshelf.Model.extend({
  tableName: 'link_previews'

}, {
  parse,

  queue: url => {
    return LinkPreview.forge({url, created_at: new Date()}).save()
    .then(({ id }) => Queue.classMethod('LinkPreview', 'populate', {id}, 0))
    .catch(err => {
      if (err.message && !err.message.includes('duplicate key value')) {
        throw err
      }
    })
  },

  populate: ({ id }) => {
    const doneAttrs = () => ({updated_at: new Date(), done: true})
    return LinkPreview.find(id).then(preview =>
      httpget(preview.get('url'))
      .catch(err => preview.save(doneAttrs()) && null) // eslint-disable-line handle-callback-err
      .then(resp => {
        if (!resp) return
        const body = resp[1]
        const attrs = merge(parse(body), doneAttrs())

        return (attrs.image_url
          ? getImageSize(attrs.image_url).catch(err => null) // eslint-disable-line handle-callback-err
          : Promise.resolve())
        .then(size => {
          if (!size) return
          attrs.image_width = size.width
          attrs.image_height = size.height
        })
        .then(() => preview.save(attrs, {patch: true}))
      }))
  },

  find: (idOrUrl, opts) => {
    const attr = isNaN(Number(idOrUrl)) ? 'url' : 'id'
    return LinkPreview.where(attr, idOrUrl).fetch(opts)
  }
})

module.exports = LinkPreview

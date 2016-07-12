import request from 'request'
import cheerio from 'cheerio'
import { merge } from 'lodash'

const httpget = url => new Promise((resolve, reject) =>
  request.get(url, (err, res, body) =>
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
    return LinkPreview.find(id).then(preview => {
      return httpget(preview.get('url'))
      .then(([ res, body ]) => {
        const attrs = merge(parse(body), {updated_at: new Date(), done: true})
        return preview.save(attrs, {patch: true})
      })
    })
  },

  find: (idOrUrl, opts) =>
    isNaN(Number(idOrUrl))
      ? LinkPreview.where('url', idOrUrl).fetch(opts)
      : LinkPreview.where('id', idOrUrl).fetch(opts)

})

module.exports = LinkPreview

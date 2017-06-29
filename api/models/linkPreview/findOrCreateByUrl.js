export default function findOrCreateByUrl (url) {
  return LinkPreview.find(url).then(preview => {
    if (!preview) return LinkPreview.queue(url)
    if (!preview.get('done')) return
    return preview.pick(
      'id',
      'url',
      'image_url',
      'title',
      'description',
      'image_width',
      'image_height'
    )
  })
}

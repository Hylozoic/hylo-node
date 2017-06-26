export default function (url) {
  return LinkPreview.find(url).then(preview => {
    if (!preview) {
      return LinkPreview.queue(url)
      .then(() => {
        return {status: 'queued'}
      })
    }

    if (!preview.get('done')) {
      return {status: 'loading'}
    }

    return preview.pick(
      'id', 'url', 'image_url', 'title', 'description', 'image_width', 'image_height'
    )
  })
}

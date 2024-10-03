export function updateMedia (comment, attachments, transacting) {
  if (!attachments || attachments.length === 0) return

  var media = comment.relations.media

  return media.invokeThen('destroy', { transacting })
  .then(() => Promise.map(attachments, (attachment, i) =>
    Media.createForSubject({
      subjectType: 'comment',
      subjectId: comment.id,
      type: attachment.type,
      url: attachment.url,
      position: i
    }, transacting)))
}


const delimiter = /-{3,}.Only.text.above.the.dashed.line.will.be.included.-{3,}(\.| )?/

export const repairedText = comment => {
  var text = comment.get('text')
  text = text.replace(delimiter, '')
  text = text.replace(/<p>\s*<\/p>\n/g, '')
  text = text.replace(/<p>\s?<br\/?>/g, '<p>')
  return text
}

export const repairText = comment =>
  comment.save({text: repairedText(comment)}, {patch: true})


export function updateMedia (comment, attachments, transacting) {
  if (!attachments) return

  var media = comment.relations.media

  return Promise.map(media, m => m.destroy({transacting}))
  .then(() => Promise.map(attachments, (attachment, i) =>
    Media.createForSubject({
      subjectType: 'comment',
      subjectId: comment.id,
      type: attachment.type,
      url: attachment.url,
      position: i
    }, transacting)))
}

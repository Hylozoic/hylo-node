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

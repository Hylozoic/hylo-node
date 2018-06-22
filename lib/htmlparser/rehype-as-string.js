'use strict'
import toString from 'hast-util-to-string'

export default function asString () {
  return transformer

  function transformer (tree) {
    return {type: 'text', value: toString(tree)}
  }
}

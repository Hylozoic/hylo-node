'use strict'
import h from 'hastscript'
import is from 'hast-util-is-element'
import has from 'hast-util-has-property'
import { matches } from 'hast-util-select'
import toString from 'hast-util-to-string'
import visit from 'unist-util-visit'
import inspect from 'unist-util-inspect'

import { MENTION_ENTITY_TYPE, TOPIC_ENTITY_TYPE } from 'hylo-utils/constants'
import { get } from 'lodash/fp'

const ENTITY_TYPE_ATTRIBUTE_NAME = 'data-entity-type'

export default function mapEntities () {
  return transformer

  function transformer (tree) {
    visit(tree, visitor)
  }

  function visitor (node, index, parent) {
    if (is(node, 'a')) { // is anchor 'a' tag
      if (matches(`[${ENTITY_TYPE_ATTRIBUTE_NAME}=${MENTION_ENTITY_TYPE}]`, node)) { // Mentions
        node.children = [mention(node)]
      } else if (matches(`[${ENTITY_TYPE_ATTRIBUTE_NAME}=${TOPIC_ENTITY_TYPE}]`, node)) { // Topics
        node.children = [topic(node)]
      } else { // Plain link
        node.children = [link(node)]
      }
      return visit.SKIP
    }

    if (is(node, 'p')) {
      node.children.push(h('span', ['\n']))
    }

    if (is(node, 'br')) {
      parent.children[index] = h('span', ['\n'])
    }

    return true
  }

  function mention (node) {
    if (has(node, 'dataUserId')) {
      const textContent = toString(node)
      const userId = get('properties.dataUserId', node)
      return h('span', `[${textContent}:${userId}]`)
    } else {
      return h('span', `${toString(node)}`)
    }
  }

  function topic (node) {
    return h('span', `${toString(node)}`)
  }

  function link (node) {
    return h('span', `${get('properties.href', node) || toString(node)}`)
  }
}

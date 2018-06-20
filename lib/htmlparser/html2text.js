/**
 * Converts HYLO formatted html into text
 */
import rehype from 'rehype'
import mapEntities from './rehype-map-entities'
import stringify from './rehype-as-string'
import { isEmpty, trim } from 'lodash/fp'

export default async function html2text (html) {
  if (isEmpty(trim(html))) return ''

  return rehype()
    .use(mapEntities)
    .use(stringify)
    .process(html)
    .then(String)
}

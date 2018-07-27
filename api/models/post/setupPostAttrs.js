import { merge, pick } from 'lodash'
import { getOr } from 'lodash/fp'
import { sanitize } from 'hylo-utils/text'

export default function setupPostAttrs (userId, params) {
  console.log('params', params)
  const attrs = merge({
    name: sanitize(params.name),
    description: sanitize(params.description),
    user_id: userId,
    visibility: params.public ? Post.Visibility.PUBLIC_READABLE : Post.Visibility.DEFAULT,
    link_preview_id: params.link_preview_id || getOr(null, 'id', params.linkPreview),
    parent_post_id: params.parent_post_id,
    updated_at: new Date(),
    announcement: params.announcement
  }, pick(params, 'type', 'starts_at', 'ends_at', 'location', 'created_from'))
  console.log('params', attrs)
  return Promise.resolve(attrs)
}

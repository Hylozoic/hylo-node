import { merge, pick } from 'lodash'
import { sanitize } from 'hylo-utils/text'

export default function setupNetworkAttrs (userId, params) {
  const attrWhitelist = [
    'name',
    'slug',
    'description',
    'avatar_url',
    'banner_url',
    'updated_at'
  ]
  const setupAttrs = {
    name: sanitize(params.name),
    description: sanitize(params.description),
    user_id: userId,
    updated_at: new Date()
  }
  const rawAttrs = merge(params, setupAttrs)
  const attrs = pick(rawAttrs, attrWhitelist)
  return Promise.resolve(attrs)
}

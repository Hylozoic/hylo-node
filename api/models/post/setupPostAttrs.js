import { merge, pick } from 'lodash'
import { getOr } from 'lodash/fp'

export default function setupPostAttrs (userId, params) {
  const attrs = merge({
    accept_contributions: params.acceptContributions,
    announcement: params.announcement,
    donations_link: params.donationsLink,
    end_time: params.endTime ? new Date(Number(params.endTime)) : null,
    is_public: params.isPublic,
    link_preview_id: params.link_preview_id || getOr(null, 'id', params.linkPreview),
    parent_post_id: params.parent_post_id,
    project_management_link: params.projectManagementLink,
    start_time: params.startTime ? new Date(Number(params.startTime)) : null,
    updated_at: new Date(),
    user_id: userId
  }, pick(params,
    'created_from',
    'description',
    'link_preview_featured',
    'location_id',
    'location',
    'name',
    'timezone',
    'type'
  ))

  return Promise.resolve(attrs)
}

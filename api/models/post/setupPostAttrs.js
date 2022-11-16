import { merge, pick } from 'lodash'
import { getOr } from 'lodash/fp'

export default function setupPostAttrs (userId, params) {
  const attrs = merge({
    user_id: userId,
    link_preview_id: params.link_preview_id || getOr(null, 'id', params.linkPreview),
    parent_post_id: params.parent_post_id,
    updated_at: new Date(),
    announcement: params.announcement,
    accept_contributions: params.acceptContributions,
    donations_link: params.donationsLink,
    project_management_link: params.projectManagementLink,
    start_time: params.startTime ? new Date(Number(params.startTime)) : null,
    end_time: params.endTime ? new Date(Number(params.endTime)) : null,
    is_public: params.isPublic
  }, pick(params,
    'name',
    'description',
    'type',
    'starts_at',
    'ends_at',
    'link_preview_featured',
    'location_id',
    'location',
    'created_from'
  ))

  return Promise.resolve(attrs)
}

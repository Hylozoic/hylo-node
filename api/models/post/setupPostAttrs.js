import { merge, pick } from 'lodash'
import { getOr } from 'lodash/fp'

export default function setupPostAttrs (userId, params, create = false) {
  console.log('entering setupPostAttrs')
  const attrs = merge({
    accept_contributions: params.acceptContributions,
    anonymous_voting: params.isAnonymousVote,
    announcement: params.announcement,
    donations_link: params.donationsLink,
    end_time: params.endTime ? new Date(Number(params.endTime)) : null,
    is_public: params.isPublic,
    link_preview_id: params.link_preview_id || getOr(null, 'id', params.linkPreview),
    parent_post_id: params.parent_post_id,
    project_management_link: params.projectManagementLink,
    voting_method: params.votingMethod,
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
    'quorum',
    'timezone',
    'type'
  ))

  let proposalStatus = params.startTime && new Date(Number(params.startTime)) < new Date() ? Post.Proposal_Status.VOTING : Post.Proposal_Status.DISCUSSION
  if (params.endTime && new Date(Number(params.endTime)) < new Date()) proposalStatus = Post.Proposal_Status.COMPLETED
  const proposalAttrs = {
    proposal_status: params.startTime ? proposalStatus : Post.Proposal_Status.CASUAL
  }
  console.log('exiting setupPostAttrs')
  return Promise.resolve({ ...attrs, ...proposalAttrs })
}

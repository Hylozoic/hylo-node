import { cloneDeep, compact, flatten, merge, pick, values } from 'lodash'
import { filter, flow, map, uniqBy } from 'lodash/fp'

const commaSeparate = (items, max) => {
  const length = items.length
  switch (length) {
    case 0: return ''
    case 1: return items[0]
    case 2: return `${items[0]} and ${items[1]}`
    default:
      return `${items[0]}, ${items[1]}, and ${length - 2} other${length > 3 ? 's' : ''}`
  }
}

const generateSubjectLine = (user, data) => {
  const names = flow(
    map(p => [p.user].concat(map('user', p.comments))),
    flatten,
    compact,
    uniqBy('id'),
    filter(u => u.id !== user.id),
    map('name')
  )(getPosts(data))
  return `${data.community_name}: New activity from ${commaSeparate(names, 2)}`
}

const getPosts = data =>
  flatten(values(pick(data, 'requests', 'offers', 'conversations')))

const personalizeData = (user, data, opts = {}) => {
  const clonedData = cloneDeep(data)
  getPosts(clonedData).forEach(post => {
    post.reply_url = Email.postReplyAddress(post.id, user.id)
  })
  return Promise.props(merge(clonedData, {
    subject: generateSubjectLine(user, data) + (opts.subjectSuffix || ''),
    recipient: {
      avatar_url: user.get('avatar_url'),
      name: user.get('name')
    },
    email_settings_url: Frontend.Route.userSettings() + '?expand=account',
    tracking_pixel_url: Analytics.pixelUrl('Digest', {userId: user.id, community: data.community_name}),
    form_action_url: Frontend.Route.emailPostForm(),
    form_token: Email.postCreationToken(data.community_id, user.id)
  }))
}

export default personalizeData

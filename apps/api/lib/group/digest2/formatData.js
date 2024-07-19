/* eslint-disable camelcase */
import {
  curry, every, filter, find, isEmpty, map, pickBy, sortBy
} from 'lodash/fp'
import { TextHelpers } from 'hylo-shared'

const isChat = post => post.get('type') === 'chat'
const isRequest = post => post.get('type') === 'request'
const isOffer = post => post.get('type') === 'offer'
const isResource = post => post.get('type') === 'resource'
const isEvent = post => post.get('type') === 'event'
const isProject = post => post.get('type') === 'project'
const isProposal = post => post.get('type') === 'proposal'
const isDiscussion = post => post.get('type') === 'discussion'

export const presentAuthor = obj =>
  obj.relations.user.pick('id', 'name', 'avatar_url')

const presentPost = curry((slug, post) => {
  const { tags, linkPreview } = post.relations

  return pickBy(x => x, {
    id: post.id,
    title: post.summary(),
    details: RichText.qualifyLinks(post.details(), slug),
    user: presentAuthor(post),
    url: Frontend.Route.post(post, slug),
    location: isEvent(post) && post.get('location'),
    when: isEvent(post) && TextHelpers.formatDatePair(post.get('start_time'), post.get('end_time'), false, post.get('timezone')),
    comments: [],
    link_preview: linkPreview && linkPreview.id &&
      linkPreview.pick('title', 'description', 'url', 'image_url'),
    topic_name: post.get('type') === 'chat' ? tags?.first()?.get('name') : ''
  })
})

const presentComment = curry((slug, comment) => ({
  id: comment.id,
  text: RichText.qualifyLinks(comment.text(), slug),
  user: presentAuthor(comment)
}))

const formatData = curry((group, data) => {
  const slug = group.get('slug')
  const requests = map(presentPost(slug), filter(isRequest, data.posts))
  const offers = map(presentPost(slug), filter(isOffer, data.posts))
  const resources = map(presentPost(slug), filter(isResource, data.posts))
  const events = map(presentPost(slug), filter(isEvent, data.posts))
  const projects = map(presentPost(slug), filter(isProject, data.posts))
  const proposals = map(presentPost(slug), filter(isProposal, data.posts))
  const discussions = map(presentPost(slug), filter(isDiscussion, data.posts))
  const chats = map(presentPost(slug), filter(isChat, data.posts))
  const postsWithNewComments = []
  const topicsWithChats = chats.reduce((topics, chat) => {
    if (chat.topic_name) {
      if (topics[chat.topic_name]) {
        topics[chat.topic_name].num_new_chats++
      } else {
        topics[chat.topic_name] = {
          name: chat.topic_name,
          num_new_chats: 1,
          url: Frontend.Route.topic(slug, chat.topic_name)
        }
      }
    }
    return topics
  }, [])

  const findFormattedPost = id => find(p => p.id === id,
    requests.concat(offers).concat(discussions).concat(projects).concat(proposals).concat(events).concat(resources).concat(chats).concat(postsWithNewComments))

  data.comments.forEach(comment => {
    let post = findFormattedPost(comment.get('post_id'))
    if (!post) {
      post = presentPost(slug, comment.relations.post)
      postsWithNewComments.push(post)
    }
    post.comments.push(presentComment(slug, comment))
  })

  postsWithNewComments.forEach(post => {
    post.comment_count = post.comments.length
  })

  const ret = {
    requests: sortBy(p => -p.id, requests),
    offers: sortBy(p => -p.id, offers),
    resources: sortBy(p => -p.id, resources),
    discussions: sortBy(p => -p.id, discussions),
    events: sortBy(p => -p.id, events),
    projects: sortBy(p => -p.id, projects),
    proposals: sortBy(p => -p.id, proposals),
    postsWithNewComments: sortBy(p => -p.id, postsWithNewComments),
    topicsWithChats: Object.values(topicsWithChats)
  }

  if (every(isEmpty, [requests, offers, resources, discussions, events, projects, proposals, topicsWithChats, postsWithNewComments])) {
    // this is used in the email templates to change the subject
    // XXX: but if there is no activity, why send the email at all?
    //   Only makes sense if we are sending one a day with the form asking people what they need, which we could bring back
    ret.no_new_activity = true
  }

  return ret
})

export default formatData

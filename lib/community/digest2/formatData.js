/* eslint-disable camelcase */
import {
  curry, every, filter, find, isEmpty, map, pickBy, sortBy
} from 'lodash/fp'

import moment from 'moment'

const isTagged = name => post => {
  const tag = post.relations.selectedTags.first()
  return tag && tag.get('name') === name
}
const isRequest = isTagged('request')
const isOffer = isTagged('offer')
const isResource = isTagged('resource')
const isEvent = post => post.get('type') === 'event'
const isProject = post => post.get('type') === 'project'
const isOtherTag = post => !isRequest(post) && !isOffer(post) && !isEvent(post) && !isProject(post) && !isResource

const presentAuthor = obj =>
  obj.relations.user.pick('id', 'name', 'avatar_url')

const humanDate = (date) => {
  if (!date) return null
  return moment(date).format('ha - MMMM D, YYYY')
}

const presentPost = curry((slug, post) => {
  const { children, linkPreview } = post.relations
  return pickBy(x => x, {
    id: post.id,
    title: post.get('name'),
    details: RichText.qualifyLinks(post.get('description'), null, null, slug),
    user: presentAuthor(post),
    url: Frontend.Route.post(post, slug),
    location: isEvent(post) && post.get('location'),
    requests: children && children.map(p => p.get('name')),
    when: isEvent(post) && humanDate(post.get('starts_at')),
    comments: [],
    link_preview: linkPreview && linkPreview.id &&
      linkPreview.pick('title', 'description', 'url', 'image_url')
  })
})

const presentComment = curry((slug, comment) => ({
  id: comment.id,
  text: RichText.qualifyLinks(comment.get('text'), null, null, slug),
  user: presentAuthor(comment)
}))

const formatData = curry((community, data) => {
  const slug = community.get('slug')
  const requests = map(presentPost(slug), filter(isRequest, data.posts))
  const offers = map(presentPost(slug), filter(isOffer, data.posts))
  const resources = map(presentPost(slug), filter(isResource, data.posts))
  const events = map(presentPost(slug), filter(isEvent, data.posts))
  const projects = map(presentPost(slug), filter(isProject, data.posts))
  const conversations = map(presentPost(slug), filter(isOtherTag, data.posts))
  const postsWithNewComments = []

  const findFormattedPost = id => find(p => p.id === id,
    requests.concat(offers).concat(conversations).concat(projects).concat(events).concat(resources).concat(postsWithNewComments))

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
    conversations: sortBy(p => -p.id, conversations),
    events: sortBy(p => -p.id, events),
    projects: sortBy(p => -p.id, projects),
    postsWithNewComments: sortBy(p => -p.id, postsWithNewComments)
  }

  if (every(isEmpty, [requests, offers, resources, conversations, events, projects])) {
    // this is used in the email templates
    ret.no_new_activity = true
  }

  return ret
})

export default formatData

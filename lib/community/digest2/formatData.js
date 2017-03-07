/* eslint-disable camelcase */
import {
  curry, every, filter, flow, isEmpty, map, pickBy, sortBy, reduce, values
} from 'lodash/fp'

const isTagged = name => post => {
  const tag = post.relations.selectedTags.first()
  return tag && tag.get('name') === name
}
const isRequest = isTagged('request')
const isOffer = isTagged('offer')
const isOtherTag = post => !isRequest(post) && !isOffer(post)

const presentAuthor = obj =>
  obj.relations.user.pick('id', 'name', 'avatar_url')

const presentPost = curry((slug, post) => pickBy(x => x, {
  id: post.id,
  title: post.get('name'),
  details: RichText.qualifyLinks(post.get('description'), null, null, slug),
  user: presentAuthor(post),
  url: Frontend.Route.post(post)
}))

const presentComment = curry((slug, comment) => ({
  id: comment.id,
  text: RichText.qualifyLinks(comment.get('text'), null, null, slug),
  user: presentAuthor(comment),
  post: presentPost(slug, comment.relations.post)
}))

const formatData = curry((community, data) => {
  const slug = community.get('slug')
  const requests = map(presentPost(slug), filter(isRequest, data.posts))
  const offers = map(presentPost(slug), filter(isOffer, data.posts))
  const conversations = map(presentPost(slug), filter(isOtherTag, data.posts))
  const new_comments = flow(
    map(presentComment(slug)),
    reduce((acc, c) => {
      if (acc[c.post.id]) {
        acc[c.post.id].no_comments += 1
      } else {
        acc[c.post.id] = {
          title: c.post.title,
          no_comments: 1
        }
      }
      return acc
    }, {}),
    values
  )(data.comments)

  const ret = {
    requests: sortBy(p => -p.id, requests),
    offers: sortBy(p => -p.id, offers),
    conversations: sortBy(p => -p.id, conversations),
    new_comments
  }

  if (every(isEmpty, [requests, offers, conversations, new_comments])) {
    ret.no_new_activity = true
  }

  return ret
})

export default formatData

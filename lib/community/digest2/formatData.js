import { filter, find, map, pickBy, sortBy } from 'lodash/fp'

const isTagged = name => post => {
  const tag = post.relations.selectedTags.first()
  return tag && tag.get('name') === name
}
const isRequest = isTagged('request')
const isOffer = isTagged('offer')
const isOtherTag = post => !isRequest(post) && !isOffer(post)

const presentAuthor = obj =>
  obj.relations.user.pick('id', 'name', 'avatar_url')

const presentPost = post => pickBy(x => x, {
  id: post.id,
  title: post.get('name'),
  details: RichText.qualifyLinks(post.get('description')),
  user: presentAuthor(post),
  url: Frontend.Route.post(post),
  comments: []
})

const presentComment = comment => ({
  id: comment.id,
  text: RichText.qualifyLinks(comment.get('text')),
  user: presentAuthor(comment)
})

const formatData = data => {
  const requests = map(presentPost, filter(isRequest, data.posts))
  const offers = map(presentPost, filter(isOffer, data.posts))
  const conversations = map(presentPost, filter(isOtherTag, data.posts))
  const findFormattedPost = id => find(p => p.id === id,
    requests.concat(offers).concat(conversations))

  data.comments.forEach(comment => {
    let post = findFormattedPost(comment.get('post_id'))
    if (!post) {
      post = presentPost(comment.relations.post)
      conversations.push(post)
    }
    post.comments.push(presentComment(comment))
  })

  return {
    requests: sortBy(p => -p.id, requests),
    offers: sortBy(p => -p.id, offers),
    conversations: sortBy(p => -p.id, conversations)
  }
}

export default formatData

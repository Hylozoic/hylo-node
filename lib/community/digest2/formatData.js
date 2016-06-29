import { curry, filter, find, map, pickBy, sortBy } from 'lodash/fp'

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
  url: Frontend.Route.post(post),
  comments: []
}))

const presentComment = curry((slug, comment) => ({
  id: comment.id,
  text: RichText.qualifyLinks(comment.get('text'), null, null, slug),
  user: presentAuthor(comment)
}))

const formatData = curry((community, data) => {
  const slug = community.get('slug')
  const requests = map(presentPost(slug), filter(isRequest, data.posts))
  const offers = map(presentPost(slug), filter(isOffer, data.posts))
  const conversations = map(presentPost(slug), filter(isOtherTag, data.posts))
  const findFormattedPost = id => find(p => p.id === id,
    requests.concat(offers).concat(conversations))

  data.comments.forEach(comment => {
    let post = findFormattedPost(comment.get('post_id'))
    if (!post) {
      post = presentPost(slug, comment.relations.post)
      conversations.push(post)
    }
    post.comments.push(presentComment(slug, comment))
  })

  return {
    requests: sortBy(p => -p.id, requests),
    offers: sortBy(p => -p.id, offers),
    conversations: sortBy(p => -p.id, conversations)
  }
})

export default formatData

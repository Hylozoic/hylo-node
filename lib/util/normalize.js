import { map, uniqBy } from 'lodash/fp'

const uniqize = buckets =>
  Object.keys(buckets).forEach(key => {
    buckets[key] = uniqBy('id', buckets[key])
  })

const convertItem = (bucket, obj, attr) => {
  bucket.push(obj[attr])
  obj[attr + '_id'] = obj[attr].id
  delete obj[attr]
}

const pluralize = name =>
  name.endsWith('y') ? name.replace(/y$/, 'ies') : name + 's'

const convertList = (bucket, obj, attr) => {
  const plural = pluralize(attr)
  bucket.push.apply(bucket, obj[plural])
  obj[attr + '_ids'] = map('id', obj[plural])
  delete obj[plural]
}

export const normalizePost = (post, buckets, final) => {
  const { communities, people } = buckets
  convertList(communities, post, 'community')
  convertList(people, post, 'voter')
  convertList(people, post, 'follower')
  convertItem(people, post, 'user')
  ;(post.comments || []).forEach(comment => {
    normalizeComment(comment, buckets)
  })
  if (final) uniqize(buckets)
}

export const normalizeComment = (comment, buckets, final) => {
  const { people } = buckets
  convertItem(people, comment, 'user')
  convertList(people, comment, 'thank')
  if (final) uniqize(buckets)
}

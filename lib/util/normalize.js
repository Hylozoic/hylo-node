import { map, uniqBy } from 'lodash/fp'

export const uniqize = buckets =>
  Object.keys(buckets).forEach(key => {
    buckets[key] = uniqBy('id', buckets[key])
  })

const convertItem = (bucket, obj, attr) => {
  if (!obj[attr]) return
  bucket.push(obj[attr])
  obj[attr + '_id'] = obj[attr].id
  delete obj[attr]
}

const pluralize = name =>
  name.endsWith('y') ? name.replace(/y$/, 'ies') : name + 's'

const convertList = (bucket, obj, attr) => {
  const plural = pluralize(attr)
  if (!obj[plural]) return
  bucket.push.apply(bucket, obj[plural])
  obj[attr + '_ids'] = map('id', obj[plural])
  delete obj[plural]
}

export const normalizePost = (post, buckets, final) => {
  if (!post) return
  const { communities, people } = buckets
  convertList(communities, post, 'community')
  convertList(people, post, 'voter')
  convertList(people, post, 'follower')
  convertItem(people, post, 'user')
  if (post.comments) {
    post.comments.forEach(c => normalizeComment(c, buckets))
  }
  if (final) uniqize(buckets)
}

export const normalizeComment = (comment, buckets, final) => {
  const { people } = buckets
  convertItem(people, comment, 'user')
  convertList(people, comment, 'thank')
  if (comment.post) convertItem(people, comment.post, 'user')
  if (final) uniqize(buckets)
}

export const normalizeMemberships = (memberships, buckets, final) => {
  if (!memberships) return
  const { communities } = buckets
  memberships.forEach(m => convertItem(communities, m, 'community'))
  if (final) uniqize(buckets)
}

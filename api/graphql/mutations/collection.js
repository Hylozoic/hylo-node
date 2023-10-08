import { isEmpty, mapKeys, pick, snakeCase } from 'lodash'
const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function addPostToCollection (userId, collectionId, postId) {
  await Collection.findValidCollectionForUser(userId, collectionId)

  // TODO: Validate that the post can be added to the collection
  const post = await Post.find(postId)

  if (!post) {
    throw new GraphQLYogaError('Not a valid post')
  }

  const order = await CollectionsPost.query(q => {
    q.select(bookshelf.knex.raw('max("order") as max_order'))
    q.where({ collection_id: collectionId })
  })
    .fetch()
    .then(result => result.get('max_order'))

  await new CollectionsPost({ user_id: userId, collection_id: collectionId, post_id: post.id, order: order ? order + 1 : 0 }).save()

  return { success: true }
}

export function createCollection (userId, data) {
  const whitelist = mapKeys(pick(data, ['name', 'groupId']), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)
  return Collection.create({ userId, ...data })
}

export async function removePostFromCollection (userId, collectionId, postId) {
  await Collection.findValidCollectionForUser(userId, collectionId)

  const linkedPost = await CollectionsPost.query(q => q.where({ collection_id: collectionId, post_id: postId })).fetch()

  if (!linkedPost) {
    throw new GraphQLYogaError('Not a valid post')
  }

  await linkedPost.destroy()

  return { success: true }
}

export async function reorderPostInCollection (userId, collectionId, postId, newOrderIndex) {
  const collection = await Collection.findValidCollectionForUser(userId, collectionId)
  const linkedPost = await CollectionsPost.query(q => q.where({ collection_id: collectionId, post_id: postId })).fetch()

  if (!linkedPost) {
    throw new GraphQLYogaError('Not a valid post')
  }

  const oldOrder = linkedPost.get('order')

  console.log("reorder", postId, linkedPost.get('name'), oldOrder, " new order = ", newOrderIndex)
  await bookshelf.transaction(async transacting => {
    if (oldOrder > newOrderIndex) {
      console.log("old greater than new")
      await CollectionsPost.query()
        .select("max('order') as max_order")
        .where({ collection_id: collectionId })
        .andWhere('order', '>=', newOrderIndex)
        .andWhere('order', '<', oldOrder)
        .update({ order: bookshelf.knex.raw('?? + 1', ['order']) })
        .transacting(transacting)
    } else if (oldOrder < newOrderIndex) {
      console.log("old less than new")
      await CollectionsPost.query()
        .select("max('order') as max_order")
        .where({ collection_id: collectionId })
        .andWhere('order', '<=', newOrderIndex)
        .andWhere('order', '>', oldOrder)
        .update({ order: bookshelf.knex.raw('?? - 1', ['order']) })
        .transacting(transacting)
    }

    await linkedPost.save({ order: newOrderIndex }, { transacting })
  })

  return { success: true }
}

import DataLoader from 'dataloader'
import { forIn } from 'lodash'
import uniqueQueryId from './uniqueQueryId'

// Given a mapping of table names to Bookshelf model classes, prepare a
// DataLoader for each model and a general-purpose DataLoader for other queries.
export default function initDataLoaders (spec) {
  const loaders = {}

  forIn(spec, ({ model }, typename) => {
    loaders[typename] = new DataLoader(ids => {
      return model.where('id', 'in', ids).fetchAll()
      .then(objects =>
        // ensure that the order of objects matches the order of ids
        ids.map(id => objects.find(x => x.id === id)))
    })
  })

  if (loaders.queries) {
    throw new Error("Can't have a model DataLoader named 'queries'")
  }

  // general-purpose query cache, for relational SQL queries that aren't just
  // fetching objects by ID.
  loaders.queries = new DataLoader(
    queries => Promise.map(queries, ({ query, method }) => {
      return method ? query[method]() : query.fetch()
    }),
    {cacheKeyFn: uniqueQueryId}
  )

  return loaders
}

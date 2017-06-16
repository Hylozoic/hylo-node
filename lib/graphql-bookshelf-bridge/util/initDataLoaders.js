import DataLoader from 'dataloader'
import { forIn } from 'lodash'
import uniqueQueryId from './uniqueQueryId'

// Given a mapping of table names to Bookshelf model classes, prepare a
// DataLoader for each model and a general-purpose DataLoader for other queries.
export default function initDataLoaders (spec) {
  const loaders = {}

  forIn(spec, ({ model }, typename) => {
    loaders[typename] = makeModelLoader(model)
  })

  if (loaders.relations) {
    throw new Error("Can't have a model DataLoader named 'relations'")
  }

  // general-purpose query cache, for relational SQL queries that aren't just
  // fetching objects by ID.
  loaders.relations = new DataLoader(
    queries => Promise.map(queries, ({ relation, method }) => {
      return method ? relation[method]() : relation.fetch()
    }),
    {cacheKeyFn: uniqueQueryId}
  )

  return loaders
}

export function makeModelLoader (model) {
  return new DataLoader(ids =>
    model.where('id', 'in', ids).fetchAll().then(preserveOrdering(ids)))
}

const preserveOrdering = ids => objects =>
  ids.map(id => objects.find(x => String(x.id) === String(id)))

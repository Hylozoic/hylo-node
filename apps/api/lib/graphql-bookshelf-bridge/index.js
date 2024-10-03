import Fetcher from './fetcher'
import makeResolvers from './makeResolvers'

export default function (models) {
  const fetcher = new Fetcher(models)
  const resolvers = makeResolvers(models, fetcher)

  return {
    resolvers,
    fetchOne: fetcher.fetchOne.bind(fetcher),
    fetchMany: fetcher.fetchMany.bind(fetcher)
  }
}

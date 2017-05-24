import { createResolverForModel } from './makeResolvers'

describe('createResolverForModel', () => {
  const model = {
    relations: [
      {
        wheels: {
          querySet: true,
          typename: 'Wheel',
          filter: (relation, { type }) =>
            relation.query(q => q.where({type}))
        }
      }
    ]
  }

  const mockQuery = {
    where: spy(() => {})
  }

  const mockRelation = {
    query: fn => fn(mockQuery)
  }

  let fetcher, fetchRelationCalls

  beforeEach(() => {
    fetchRelationCalls = []
    fetcher = {
      fetchRelation: spy(function () {
        fetchRelationCalls.push(Array.prototype.slice.call(arguments))
        return Promise.resolve()
      })
    }
  })

  it('sets up relation filtering', () => {
    const resolver = createResolverForModel(model, fetcher)
    const instance = {
      wheels: spy(() => 'mock wheels relation')
    }
    return resolver.wheels(instance, {type: 'front'})
    .then(() => {
      expect(fetcher.fetchRelation).to.have.been.called()
      const call = fetchRelationCalls[0]
      expect(call[0]).to.equal('mock wheels relation')
      expect(call[1]).to.equal('Wheel')
      expect(call[2].querySet).to.exist

      call[2].filter(mockRelation)
      expect(mockQuery.where).to.have.been.called.with({type: 'front'})
    })
  })
})

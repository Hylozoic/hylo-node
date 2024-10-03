/* eslint-disable no-unused-expressions */
import { createResolverForModel, resolveAttribute } from './makeResolvers'

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

  it('throws an error if a relation cannot be found', () => {
    const mockModel = {
      forge () {
        return {
          tableName: 'mockModel'
        }
      }
    }

    const badSpec = {
      model: mockModel,
      relations: ['feet']
    }

    expect(() => {
      createResolverForModel(badSpec, fetcher)
    }).to.throw(/Couldn't find relation "feet"/)
  })
})

describe('resolveAttribute', () => {
  let data

  beforeEach(() => {
    data = {
      very_special_attribute: 'hello',
      very_special_method: () => 'hello again',
      auto_refueling: false,
      get: function (key) {
        return {
          foo: 'foo!'
        }[key]
      }
    }
  })

  it('camel-cases the attribute name', () => {
    const result = {}
    resolveAttribute(result, 'very_special_attribute')
    expect(result.verySpecialAttribute(data)).to.equal('hello')
  })

  it('executes the attribute if it is a function', () => {
    const result = {}
    resolveAttribute(result, 'very_special_method')
    expect(result.verySpecialMethod(data)).to.equal('hello again')
  })

  it('returns a falsey value correctly', () => {
    const result = {}
    resolveAttribute(result, 'auto_refueling')
    expect(result.autoRefueling(data)).to.equal(false)
  })

  it('tries to find the attribute in a Bookshelf model', () => {
    const result = {}
    resolveAttribute(result, 'foo')
    expect(result.foo(data)).to.equal('foo!')
  })
})

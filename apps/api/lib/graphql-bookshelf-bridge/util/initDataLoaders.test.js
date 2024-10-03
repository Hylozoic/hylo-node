import { makeModelLoader } from './initDataLoaders'

const makeMockModel = () => ({
  collection: () => ({
    tableName: () => 'mock_models'
  }),
  where: spy(function () {
    return {
      fetchAll: () => Promise.resolve(this.mockData)
    }
  })
})

describe('makeModelLoader', () => {
  var loader, model

  beforeEach(() => {
    model = makeMockModel()
    loader = makeModelLoader(model)
  })

  it('works with database tables with integer ids', () => {
    model.mockData = [{id: 1}, {id: 2}, {id: 3}]

    return loader.loadMany(['3', '1', '2']).then(results => {
      expect(results).to.deep.equal([{id: 3}, {id: 1}, {id: 2}])
    })
  })

  it('works with database tables with bigint ids', () => {
    model.mockData = [{id: '1'}, {id: '2'}, {id: '3'}]

    return loader.loadMany(['3', '1', '2']).then(results => {
      expect(results).to.deep.equal([{id: '3'}, {id: '1'}, {id: '2'}])
    })
  })

  it('uses the correct table name', () => {
    model.mockData = []
    return loader.loadMany(['1']).then(() => {
      expect(model.where).to.have.been.called.with('mock_models.id', 'in', ['1'])
    })
  })
})

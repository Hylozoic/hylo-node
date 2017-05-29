import Fetcher from './fetcher'
import { mapValues } from 'lodash'
import Bookshelf from 'bookshelf'
import Knex from 'knex'
import knexfile from '../../knexfile'
import Promise from 'bluebird'

const setupLoaders = models => {
  const makeLoader = () => {
    return {
      load: spy(id => Promise.resolve({id})),
      loadMany: spy(ids => Promise.resolve(ids.map(id => ({id})))),
      prime: spy(obj => Promise.resolve(obj))
    }
  }

  const loaders = mapValues(models, makeLoader)
  const queryLog = []
  loaders.relations = {
    log: queryLog,
    load: spy(arg => {
      queryLog.push(arg)
      return Promise.resolve(arg.relation.model.collection())
    })
  }

  return loaders
}

describe('Fetcher', () => {
  var Bike, Wheel, mockModels, fetcher

  before(() => {
    global.oldBookshelf = global.bookshelf
    global.bookshelf = Bookshelf(Knex(knexfile[process.env.NODE_ENV]))

    Bike = bookshelf.Model.extend({
      tableName: 'bikes',

      wheels () {
        return this.hasMany(Wheel)
      }
    })

    Wheel = bookshelf.Model.extend({
      tableName: 'wheels'
    })

    mockModels = {
      Bike: {
        model: Bike,
        relations: ['wheels']
      },
      Wheel: {
        model: Wheel
      }
    }

    fetcher = new Fetcher(mockModels, {setupLoaders})
  })

  after(() => {
    global.bookshelf = global.oldBookshelf
  })

  describe('fetchOne', () => {
    it('short-circuits if id is falsy', () => {
      return fetcher.fetchOne('Bike', null)
      .then(result => expect(result).to.be.null)
    })
  })

  describe('relations', () => {
    describe('sortBy', () => {
      it('works as expected', () => {
        const bike = new Bike({id: 1})
        return fetcher.fetchRelation(bike.wheels(), 'Wheel', {
          sortBy: 'wheelName'
        })
        .then(result => {
          const { relation } = fetcher.loaders.relations.log[0]
          const { sql } = relation.query().toSQL()

          // note that there is nothing in this expected query that checks the
          // results against the id of the bike. this is a limitation of the way
          // Bookshelf handles relation queries; the `.query()` method does not
          // contain the clauses that filter down to only those rows matching
          // the other side of the relation.
          //
          // for our purposes here, this is fine; we're only checking that the
          // total column and order-by clause are present.
          expect(sql).to.equal('select wheels.*, count(*) over () as __total from "wheels" order by "wheel_name" asc')
        })
      })
    })
  })
})

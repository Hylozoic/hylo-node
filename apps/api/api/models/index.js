import { readdirSync } from 'fs'
import { basename, extname } from 'path'
import Bookshelf from 'bookshelf'
import Knex from 'knex'
import knexfile from '../../knexfile'
import Promise from 'bluebird'

export const init = () => {
  // TODO: yes lets do this, i already made good progress on this
  // this could be removed, if desired, if all uses of bluebird's API were
  // removed from the models
  global.Promise = Promise

  global.bookshelf = Bookshelf(Knex(knexfile[process.env.NODE_ENV]))

  return readdirSync(__dirname)
  .map(filename => {
    if (extname(filename) !== '.js') return
    var name = basename(filename, '.js')
    if (!name.match(/^[A-Z]/)) return
    const model = require('./' + name)
    global[name] = model
    return [name, model]
  })
  .filter(x => !!x)
  .reduce((props, [ name, model ]) => {
    props[name] = model
    return props
  }, {})
}

export default {init}

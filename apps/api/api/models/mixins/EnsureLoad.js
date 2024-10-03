/*

When working with multiple records and their relations, we avoid the N+1 problem
by using the `withRelated` option to `fetch`. But when working with a single
record, we may have to call `load` for its relations. We don't want to have all
of our model code be concerned about whether the relations it needs have been
loaded yet, or to assume either that they have or haven't been. That couples
model code to specific contexts.

The `ensureLoad` function below is designed to be used to avoid this coupling.

Mix this file's default export into a model, and use the `ensureLoad` function,
like this:

  import EnsureLoad from './mixins/EnsureLoad'
  module.exports = bookshelf.Model.extend(Object.assign({
    // your model code...

    doSomething () {
      return this.ensureLoad(['person', 'places']).then(() => {
        this.relations.person.sayHello()
        this.relations.places.each(p => p.visit())
      })
    }
  }, EnsureLoad))

TODO: support multi-level loading, e.g. this.ensureLoad('person.jobs')

*/

import { castArray } from 'lodash'

export default {
  ensureLoad (relations) {
    const relationsToLoad = castArray(relations).filter(relation => {
      const { relatedData: { type, foreignKey } } = this[relation]()

      // if there is no id value for a belongsTo, skip
      if (type === 'belongsTo' && !this.get(foreignKey)) return false

      // otherwise, skip if data has already been loaded
      return !this.relations[relation]
    })

    return this.load(relationsToLoad)
  }
}

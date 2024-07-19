import { times } from 'lodash'
const rootPath = require('root-path')
require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
import updateChildren from './updateChildren'

describe('updateChildren', () => {
  var post, children

  before(() => {
    post = factories.post()
    children = times(3, () => factories.post())
    return post.save()
    .then(() => Promise.all(children.map(c =>
      c.save({parent_post_id: post.id}))))
  })

  it('creates, updates, and removes child posts', () => {
    const childrenParam = [
      { // ignore
        id: 'new-foo',
        name: ''
      },
      { // create
        id: 'new-bar',
        name: 'Yay!'
      },
      { // update
        id: children[0].id,
        name: 'Another!'
      },
      { // remove
        id: children[1].id,
        name: ''
      }
      // remove children[2] by omission
    ]

    return bookshelf.transaction(trx => updateChildren(post, childrenParam, trx))
    .then(() => { return post.load(['children']);})
    .then(() => {
      const updated = post.relations.children
      expect(updated.length).to.equal(2)
      expect(updated.find(c => c.id !== children[0].id).get('name')).to.equal('Yay!')
      expect(updated.find(c => c.id === children[0].id).get('name')).to.equal('Another!')
    })
  })
})

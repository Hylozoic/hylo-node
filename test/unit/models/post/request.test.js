import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('post/request', () => {
  before(() => setup.clearDb().then(() => Tag.forge({name: 'request'}).save()))

  describe('fulfillRequest', () => {
    let post, contributor1, contributor2

    before(() => {
      post = factories.post()
      contributor1 = factories.user({id: 1}).save()
      contributor2 = factories.user({id: 2}).save()
      return post.save()
    })

    it('should create contribution records when contributorIds are provider', () => {
      // post.fulfillRequest({contributorIds: [contributor1.id, contributor2.id]})
      //   .then((post) => {
      //     console.log('!!! test')
      //     expect(post.contributions.length).to.be.length(2)
      //     expect(post.contributions.map(c => c.id)).to.contain([contributor2.id, contributor2.id])
      //   })
    })
  })

  describe('fulfillRequest', () => {
    let post, contributor1, contributor2

    before(() => {
      post = factories.post()
      contributor1 = factories.user({id: 1}).save()
      contributor2 = factories.user({id: 2}).save()
      return post.save()
    })

    it('should remove all contribution, activity and related notification records when a request is unfulfilled', () => {
    })
  })
})

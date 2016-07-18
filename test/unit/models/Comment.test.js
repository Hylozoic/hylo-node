const root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))

const user = factories.mock.model({name: 'Bob Anatharamchar'})
const user2 = factories.mock.model({name: 'Mina Shah'})

describe('Comment', () => {
  describe('cleanEmailText', () => {
    it("cuts off at the sender's name", () => {
      const text = "Wow!\rThat's great!\rBob A"
      expect(Comment.cleanEmailText(user, text)).to.equal("Wow!\nThat's great!")
    })

    it('strips text after a divider', () => {
      const text = 'Amazing!\r*****\rJoe'
      expect(Comment.cleanEmailText(user, text)).to.equal('Amazing!')
    })

    it('removes a common signature pattern with two dashes', () => {
      const text = "Let's do it.\r\r-- \Mina"
      expect(Comment.cleanEmailText(user2, text)).to.equal("Let's do it.")
    })
  })
})

const root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))

const user = factories.mock.model({name: 'Bob Anatharamchar'})
const user2 = factories.mock.model({name: 'Mina Shah'})

describe('Comment', () => {
  describe('cleanEmailText', () => {
    it('wraps content in <p> tags and handles weird newlines', () => {
      const text = 'Ok then\r\nAll right\r\rSo it shall be'
      expect(Comment.cleanEmailText(user, text)).to.equal('<p>Ok then<br>All right</p>\n<p>So it shall be</p>\n')
    })

    it("cuts off at the sender's name", () => {
      const text = "Wow!\rThat's great!\rBob A"
      expect(Comment.cleanEmailText(user, text)).to.equal('<p>Wow!<br>That&#39;s great!</p>\n')
    })

    it("cuts off at the sender's name preceded by dashes", () => {
      const text = "Wow!\rThat's great!\r--Bob A"
      expect(Comment.cleanEmailText(user, text)).to.equal('<p>Wow!<br>That&#39;s great!</p>\n')
    })

    it('removes a common signature pattern with two dashes', () => {
      const text = "Let's do it.\r\r-- \rMina"
      expect(Comment.cleanEmailText(user2, text)).to.equal('<p>Let&#39;s do it.</p>\n')
    })

    it('removes our inserted divider', () => {
      const text = 'Meow!\n-------- Only text above the dashed line will be included --------\nwhatever'
      expect(Comment.cleanEmailText(user2, text)).to.equal('<p>Meow!</p>\n')
    })

    it('removes even a mangled divider', () => {
      const text = 'yoyo\nMeow!-----+Only+text+above+the+dashed+line+will+be+included lol\nok'
      expect(Comment.cleanEmailText(user2, text)).to.equal('<p>yoyo<br>Meow!</p>\n')
    })
  })
})

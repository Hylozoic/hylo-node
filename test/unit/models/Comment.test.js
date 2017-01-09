/* globals LastRead */
import { times } from 'lodash'
import setup from '../../setup'
import factories from '../../setup/factories'
import { mockify, unspyify } from '../../setup/helpers'

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

  describe('sendMessageDigest', () => {
    var u1, u2, post, comments, log, now

    beforeEach(() => {
      now = new Date()
      log = []
      comments = []
      mockify(Email, 'sendMessageDigest', args => log.push(args))

      u1 = factories.user({settings: {dm_notifications: 'both'}})
      u2 = factories.user({settings: {dm_notifications: 'both'}})
      post = factories.post({type: Post.Type.THREAD, updated_at: now})

      return Promise.join(u1.save(), u2.save(), post.save())
      .then(() => Promise.join(
        Follow.create(u1.id, post.id),
        Follow.create(u2.id, post.id)
      ))
      .then(() => {
        ;[u1.id, u2.id].forEach(userId =>
          times(2, i => comments.push(factories.comment({
            post_id: post.id,
            user_id: userId,
            created_at: new Date(now - (5 - i) * 60000)
          }))))
        return Promise.map(comments, c => c.save())
      })
    })

    afterEach(() => {
      unspyify(Email, 'sendMessageDigest')
      return setup.clearDb()
    })

    it('sends a digest of recent messages', () => {
      return Comment.sendMessageDigests()
      .then(count => {
        expect(count).to.equal(2)
        expect(Email.sendMessageDigest).to.have.been.called.exactly(2)

        const send1 = log.find(l => l.email === u1.get('email'))
        expect(send1.data.messages)
        .to.deep.equal([comments[2].get('text'), comments[3].get('text')])

        const send2 = log.find(l => l.email === u2.get('email'))
        expect(send2.data.messages)
        .to.deep.equal([comments[0].get('text'), comments[1].get('text')])
      })
    })

    it('respects last_read_at', () => {
      return Promise.join(
        LastRead.findOrCreate(u1.id, post.id, {date: new Date(now - 4.5 * 60000)}),
        LastRead.findOrCreate(u2.id, post.id)
      )
      .then(() => Comment.sendMessageDigests())
      .then(count => {
        expect(count).to.equal(1)
        expect(Email.sendMessageDigest).to.have.been.called.exactly(1)

        expect(log[0].email).to.equal(u1.get('email'))
        expect(log[0].data.messages)
        .to.deep.equal([comments[3].get('text')])
      })
    })

    it('respects dm_notifications setting', () => {
      return u1.save({settings: {dm_notifications: 'push'}})
      .then(() => Comment.sendMessageDigests())
      .then(count => {
        expect(count).to.equal(1)
        expect(Email.sendMessageDigest).to.have.been.called.exactly(1)

        expect(log[0].email).to.equal(u2.get('email'))
        expect(log[0].data.messages)
        .to.deep.equal([comments[0].get('text'), comments[1].get('text')])
      })
    })
  })
})

/* globals RedisClient */
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

  describe('sendDigests', () => {
    let u1, u2, post, comments, log, now, group

    beforeEach(async () => {
      now = new Date()
      log = []
      comments = []

      u1 = factories.user({avatar_url: 'foo.png', settings: {dm_notifications: 'both'}})
      u2 = factories.user({avatar_url: 'bar.png', settings: {dm_notifications: 'both'}})
      group = factories.group({ name: 'group', slug: 'slug' })
      post = factories.post({ type: Post.Type.THREAD, updated_at: now })

      await Promise.join(group.save(), u1.save(), u2.save())
      await post.save({ user_id: u1.id })
      await post.addFollowers([u1.id, u2.id])
      await group.posts().attach(post)
      ;[u1.id, u2.id].forEach(userId =>
        times(2, i => comments.push(factories.comment({
          post_id: post.id,
          user_id: userId,
          created_at: new Date(now - (5 - i) * 60000)
        }))))
      await Promise.all(comments.map(c => c.save()))
      await (await RedisClient.create()).del(Comment.sendDigests.REDIS_TIMESTAMP_KEY)
    })

    afterEach(() => setup.clearDb())

    describe('with a message thread', () => {
      beforeEach(() =>
        mockify(Email, 'sendMessageDigest', args => log.push(args)))

      afterEach(() => unspyify(Email, 'sendMessageDigest'))

      it('sends a digest of recent messages', () => {
        return Comment.sendDigests()
        .then(count => {
          expect(count).to.equal(2)
          expect(Email.sendMessageDigest).to.have.been.called.exactly(2)

          const send1 = log.find(l => l.email === u1.get('email'))
          expect(send1.data.messages)
          .to.deep.equal([
            {
              id: comments[2].id,
              text: comments[2].get('text'),
              name: u2.get('name'),
              avatar_url: u2.get('avatar_url')
            }, {
              id: comments[3].id,
              text: comments[3].get('text'),
              name: u2.get('name'),
              avatar_url: u2.get('avatar_url')
            }])

          const send2 = log.find(l => l.email === u2.get('email'))
          expect(send2.data.messages)
          .to.deep.equal([
            {
              id: comments[0].id,
              text: comments[0].get('text'),
              name: u1.get('name'),
              avatar_url: u1.get('avatar_url')
            }, {
              id: comments[1].id,
              text: comments[1].get('text'),
              name: u1.get('name'),
              avatar_url: u1.get('avatar_url')
            }])
        })
      })

      it('respects last_read_at', async () => {
        const pu1 = await PostUser.find(post.id, u1.id)
        await pu1.save({ last_read_at: new Date(now - 4.5 * 60000) })

        const pu2 = await PostUser.find(post.id, u2.id)
        await pu2.save({ last_read_at: now })

        return Comment.sendDigests()
        .then(count => {
          expect(count).to.equal(1)
          expect(Email.sendMessageDigest).to.have.been.called.exactly(1)

          expect(log[0].email).to.equal(u1.get('email'))
          expect(log[0].data.messages)
          .to.deep.equal([{
            id: comments[3].id,
            text: comments[3].get('text'),
            name: u2.get('name'),
            avatar_url: u2.get('avatar_url')
          }])
        })
      })

      it('respects dm_notifications setting', () => {
        return u1.save({settings: {dm_notifications: 'push'}})
        .then(() => Comment.sendDigests())
        .then(count => {
          expect(count).to.equal(1)
          expect(Email.sendMessageDigest).to.have.been.called.exactly(1)

          expect(log[0].email).to.equal(u2.get('email'))
          expect(log[0].data.messages)
          .to.deep.equal([{
            id: comments[0].id,
            name: u1.get('name'),
            avatar_url: u1.get('avatar_url'),
            text: comments[0].get('text')
          }, {
            id: comments[1].id,
            name: u1.get('name'),
            avatar_url: u1.get('avatar_url'),
            text: comments[1].get('text')
          }])
        })
      })
    })

    describe('with post comments', () => {
      beforeEach(() => {
        mockify(Email, 'sendCommentDigest', args => log.push(args))
        return Promise.all([
          post.save({type: null}, {patch: true}),
          u1.addSetting({comment_notifications: 'email'}, true),
          u2.addSetting({comment_notifications: 'email'}, true)
        ])
      })

      afterEach(() => unspyify(Email, 'sendCommentDigest'))

      it('changes the subject if the digest contains a mention', () => {
        const text = `hello <a class="mention" data-id="${u2.get('id')}" data-label="buddy">buddy</a>!`
        return comments[1].save({text}, {patch: true})
        .then(() => Comment.sendDigests())
        .then(count => {
          expect(count).to.equal(2)
          expect(Email.sendCommentDigest).to.have.been.called.exactly(2)

          const send1 = log.find(l => l.email === u1.get('email'))
          expect(send1.data.subject_prefix).to.match(/New comments/)

          const send2 = log.find(l => l.email === u2.get('email'))
          expect(send2.data.subject_prefix).to.match(/You were mentioned/)
        })
      })
    })
  })
})

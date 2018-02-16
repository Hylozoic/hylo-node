import {
  pushMessageToSockets
} from '../../../../api/models/comment/createComment'
import {
  createThread
} from '../../../../api/models/post/findOrCreateThread'
import setup from '../../../setup'
import factories from '../../../setup/factories'

describe('comment/createComment', () => {
  before(() => setup.clearDb())

  describe('pushMessageToSockets', () => {
    var user, user2, thread

    before(async () => {
      user = await factories.user().save()
      user2 = await factories.user().save()
      thread = await createThread(user.id, [user2.id])
    })

    it('sends newThread event if first message', () => {
      const message = new Comment({
        text: 'hi',
        post_id: thread.id,
        user_id: user.id
      })
      return pushMessageToSockets(message, thread)
      .then(promises => {
        expect(promises.length).to.equal(1)
        const { room, messageType, payload } = promises[0]
        expect(room).to.equal(`users/${user2.id}`)
        expect(messageType).to.equal('newThread')
        expect(payload.id).to.equal(thread.id)
      })
    })

    it('sends messageAdded event if not first message', () => {
      const message = new Comment({
        text: 'hi',
        post_id: thread.id,
        user_id: user.id
      })
      thread.set({num_comments: 2})
      return pushMessageToSockets(message, thread)
      .then(promises => {
        expect(promises.length).to.equal(1)
        const { room, messageType, payload } = promises[0]
        expect(room).to.equal(`users/${user2.id}`)
        expect(messageType).to.equal('messageAdded')
        expect(payload.messageThread).to.equal(thread.id)
        expect(payload.text).to.equal('hi')
      })
    })
  })
})

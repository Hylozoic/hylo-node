import { notifyAboutMessage } from '../../../../api/models/comment/notifications'
import factories from '../../../setup/factories'
import { compact } from 'lodash'

describe('notifyAboutMessage', () => {
  let comment, device

  before(async () => {
    const u1 = await factories.user().save() // should receive
    const u2 = await factories.user().save() // recently read
    const u3 = await factories.user().save() // notifications disabled
    const u4 = await factories.user().save() // commenter

    const post = await factories.post({type: Post.Type.THREAD}).save()
    await post.addFollowers([u1.id, u2.id, u3.id, u4.id])
    comment = await factories.comment({
      user_id: u4.id, post_id: post.id
    }).save()

    await u1.addSetting({dm_notifications: 'push'}, true)
    device = await u1.devices().create({
      enabled: true,
      version: 1
    })
    await post.markAsRead(u2.id)
  })

  it('sends push notifications', async () => {
    const results = await notifyAboutMessage({commentId: comment.id})
    expect(compact(results).length).to.equal(1)
    const sent = results.find(x => x && x[0])[0]
    expect(sent.get('device_id')).to.equal(device.id)
    expect(sent.get('alert')).to.contain(comment.get('text'))
  })
})

import { updateMembership } from './membership'
import factories from '../../../test/setup/factories'
var assert = require('assert');

describe('membership.test', function() {

  it('handles some values specially', async function() {
    const user = await factories.user().save()
    const group = await factories.group().save()
    await group.addMembers([user])
    const date = new Date()

    await updateMembership(user.id, {
      groupId: group.id,
      data: {
        newPostCount: 7,
        lastViewedAt: date,
        settings: {
          sendPushNotifications: true
        }
      }
    })

    const membership = await GroupMembership.forPair(user, group).fetch()
    expect(membership.get('new_post_count')).to.equal(7)
    expect(membership.getSetting('sendPushNotifications')).to.equal(true)
    expect(membership.getSetting('lastReadAt')).to.equal(date.toISOString())
  })

})

import { updateMembership } from './membership'
import factories from '../../../test/setup/factories'

it('handles some values specially', async () => {
  const user = await factories.user().save()
  const community = await factories.community().save()
  await community.addGroupMembers([user])
  const date = new Date()

  await updateMembership(user.id, {
    communityId: community.id,
    data: {
      newPostCount: 7,
      lastViewedAt: date,
      settings: {
        sendPushNotifications: true
      }
    }
  })

  const membership = await GroupMembership.forPair(user, community).fetch()
  expect(membership.get('new_post_count')).to.equal(7)
  expect(membership.getSetting('sendPushNotifications')).to.equal(true)
  expect(membership.getSetting('lastReadAt')).to.equal(date.toISOString())
})

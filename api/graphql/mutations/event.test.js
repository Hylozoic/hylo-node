import { respondToEvent } from './event'
import factories from '../../../test/setup/factories'

describe('respondToEvent', () => {
  var user, event
  before(async () => {
    user = await factories.user().save()
    event = await factories.post({type: 'event'}).save()
  })

  it('creates an eventInvitation if none exists', async () => {
    await respondToEvent(user.id, event.id, EventInvitation.RESPONSE.YES)

    const eventInvitation = await EventInvitation.find({
      userId: user.id,
      eventId: event.id
    })
    expect(eventInvitation).to.exist
    expect(eventInvitation.get('response')).to.equal(EventInvitation.RESPONSE.YES)
  })

  it('updates an existing eventInvitation', async () => {
    await respondToEvent(user.id, event.id, EventInvitation.RESPONSE.NO)

    const eventInvitation = await EventInvitation.find({
      userId: user.id,
      eventId: event.id
    })
    expect(eventInvitation).to.exist
    expect(eventInvitation.get('response')).to.equal(EventInvitation.RESPONSE.NO)
  })
})

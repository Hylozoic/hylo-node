import mockRequire from 'mock-require'

describe('OneSignal.notify', () => {
  let notify, options

  const oldFixture = {
    'json': {
      'app_id': 'fake_app_id',
      'contents': {
        'en': 'hello'
      },
      'data': {
        'path': '/p/1'
      },
      'include_ios_tokens': [
        'foo'
      ],
      'ios_badgeCount': 7,
      'ios_badgeType': 'SetTo'
    },
    'method': 'POST',
    'url': 'https://onesignal.com/api/v1/notifications'
  }

  const newFixture = {
    'json': {
      'app_id': 'fake_app_id',
      'contents': {
        'en': 'hello'
      },
      'data': {
        'path': '/p/1'
      },
      'include_player_ids': [
        'foo'
      ],
      'ios_badgeCount': 7,
      'ios_badgeType': 'SetTo'
    },
    'method': 'POST',
    'url': 'https://onesignal.com/api/v1/notifications'
  }

  beforeEach(() => {
    options = null
    mockRequire('request', spy(opts => { options = opts }))
    notify = mockRequire.reRequire('../../../api/services/OneSignal').notify
  })

  it('handles legacy platform value "ios_macos"', () => {
    notify({
      platform: 'ios_macos',
      deviceToken: 'foo',
      alert: 'hello',
      path: '/p/1',
      badgeNo: 7,
      appId: 'fake_app_id'
    })
    expect(options).to.deep.equal(oldFixture)
  })

  it('handles new platform value "ios"', () => {
    notify({
      platform: 'ios',
      deviceToken: 'foo',
      alert: 'hello',
      path: '/p/1',
      badgeNo: 7,
      appId: 'fake_app_id'
    })
    expect(options).to.deep.equal(oldFixture)
  })

  it('handles player ids', () => {
    notify({
      platform: 'ios',
      playerId: 'foo',
      alert: 'hello',
      path: '/p/1',
      badgeNo: 7,
      appId: 'fake_app_id'
    })
    expect(options).to.deep.equal(newFixture)
  })
})

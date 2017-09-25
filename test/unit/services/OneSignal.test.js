import mockRequire from 'mock-require'

describe('OneSignal.notify', () => {
  let notify, options

  const fixture = {
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

  beforeEach(() => {
    options = null
    mockRequire('request', spy(opts => { options = opts }))
    notify = mockRequire.reRequire('../../../api/services/OneSignal').notify
  })

  it('handles legacy platform value "ios_macos"', () => {
    notify('ios_macos', 'foo', 'hello', '/p/1', 7, 'fake_app_id')
    expect(options).to.deep.equal(fixture)
  })

  it('handles new platform value "ios"', () => {
    notify('ios', 'foo', 'hello', '/p/1', 7, 'fake_app_id')
    expect(options).to.deep.equal(fixture)
  })
})

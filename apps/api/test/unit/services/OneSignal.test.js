import mockRequire from 'mock-require'

describe('OneSignal.notify', () => {
  let notify, options

  const oldFixture = {
    json: {
      app_id: 'fake_app_id',
      contents: {en: 'hello'},
      data: {path: '/post/1'},
      include_ios_tokens: ['foo'],
      ios_badgeCount: 7,
      ios_badgeType: 'SetTo'
    },
    method: 'POST',
    url: 'https://onesignal.com/api/v1/notifications'
  }

  const newFixture = {
    json: {
      app_id: 'fake_app_id',
      contents: {en: 'hello'},
      data: {path: '/post/1'},
      include_player_ids: ['foo'],
      ios_badgeCount: 7,
      ios_badgeType: 'SetTo'
    },
    method: 'POST',
    url: 'https://onesignal.com/api/v1/notifications'
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
      path: '/post/1',
      badgeNo: 7,
      appId: 'fake_app_id'
    })
    expect(options).to.deep.equal(oldFixture)
  })

  it('handles platform value "ios" with player id', () => {
    notify({
      platform: 'ios',
      playerId: 'foo',
      alert: 'hello',
      path: '/post/1',
      badgeNo: 7,
      appId: 'fake_app_id'
    })
    expect(options).to.deep.equal(newFixture)
  })

  it('handles platform value "android" with device token', () => {
    notify({
      platform: 'android',
      deviceToken: 'foo',
      alert: 'hello',
      path: '/post/1',
      badgeNo: 7,
      appId: 'fake_app_id'
    })
    expect(options).to.deep.equal({
      json: {
        app_id: 'fake_app_id',
        contents: {en: 'hello'},
        data: {alert: 'hello', path: '/post/1'},
        include_android_reg_ids: ['foo']
      },
      method: 'POST',
      url: 'https://onesignal.com/api/v1/notifications'
    })
  })

  it('handles platform value "android" with player id', () => {
    notify({
      platform: 'android',
      playerId: 'foo',
      alert: 'hello',
      path: '/post/1',
      badgeNo: 7,
      appId: 'fake_app_id'
    })
    expect(options).to.deep.equal({
      json: {
        app_id: 'fake_app_id',
        contents: {en: 'hello'},
        data: {alert: 'hello', path: '/post/1'},
        include_player_ids: ['foo']
      },
      method: 'POST',
      url: 'https://onesignal.com/api/v1/notifications'
    })
  })

  it('rejects a call with both device token and player id', () => {
    return notify({
      platform: 'android',
      deviceToken: 'foo',
      playerId: 'foo'
    })
    .then(() => expect.fail('should throw'))
    .catch(err => expect(err.message).to.match(/Can't pass both/))
  })
})

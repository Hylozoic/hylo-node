require(require('root-path')('test/setup'))

describe('Email', function () {
  describe('reply address', () => {
    // this expects dev environment variables:
    // MAILGUN_EMAIL_SALT=FFFFAAAA123456789
    // MAILGUN_DOMAIN=mg.hylo.com
    // PLAY_APP_SECRET=quxgrault12345678
    const postId = '7823'
    const userId = '5942'
    const email = 'reply-8c26a271fe72895d4e3c20a6893d9c0ee9c9041235c9ce207c0a627196396807@mg.hylo.com'

    describe('.postReplyAddress', () => {
      it('encrypts the post and user ids', () => {
        expect(Email.postReplyAddress(postId, userId)).to.equal(email)
      })
    })

    describe('.decodePostReplyAddress', () => {
      it('works with human-readable formats', () => {
        var address = `"${email}" <${email}>`

        expect(Email.decodePostReplyAddress(address)).to.deep.equal({postId, userId})
      })
    })
  })
})

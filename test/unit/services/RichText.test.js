require('../../setup')
const Frontend = require('../../../api/services/Frontend')
const prefix = Frontend.Route.prefix

describe('RichText', function () {
  describe('.qualifyLinks', function () {
    it('turns data-user-id links into fully-qualified links', function () {
      var text = '<p>#hashtag, #anotherhashtag, https://www.metafilter.com/wooooo</p>' +
        '<p>a paragraph, and of course <a href="/u/5942" data-user-id="5942">@Minda Myers</a>&#xA0;' +
        '<a href="/u/8781" data-user-id="8781">@Ray Hylo</a>&#xA0;#boom.</p><p>danke</p>'

      var expected = '<p>#hashtag, #anotherhashtag, https://www.metafilter.com/wooooo</p>' +
      `<p>a paragraph, and of course <a href="${prefix}/u/5942" data-user-id="5942">@Minda Myers</a>&#xA0;` +
      `<a href="${prefix}/u/8781" data-user-id="8781">@Ray Hylo</a>&#xA0;#boom.</p><p>danke</p>`

      expect(RichText.qualifyLinks(text)).to.equal(expected)
    })

    it('links hashtags inside anchor tags', () => {
      const text = '<p><a>#hashtag</a></p>'
      const communityUrl = `${prefix}/c/foo/tag/hashtag`
      const nonCommunityUrl = `${prefix}/tag/hashtag`
      const expected = url => `<p><a href="${url}">#hashtag</a></p>`

      expect(RichText.qualifyLinks(text, null, null, 'foo')).to.equal(expected(communityUrl))
      expect(RichText.qualifyLinks(text)).to.equal(expected(nonCommunityUrl))
    })
  })
})

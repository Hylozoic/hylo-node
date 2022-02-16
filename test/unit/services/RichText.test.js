require('../../setup')
const Frontend = require('../../../api/services/Frontend')
const prefix = Frontend.Route.prefix

describe('RichText', function () {
  describe('.qualifyLinks', function () {
    it('turns data-user-id links into fully-qualified links', function () {
      var text = '<p>#hashtag, #anotherhashtag, https://www.metafilter.com/wooooo</p>' +
        '<p>a paragraph, and of course <a href="/members/5942" data-user-id="5942">@Minda Myers</a>&nbsp;' +
        '<a href="/members/8781" data-user-id="8781">@Ray Hylo</a>&nbsp;#boom.</p><p>danke</p>'

      var expected = '<p>#hashtag, #anotherhashtag, https://www.metafilter.com/wooooo</p>' +
      `<p>a paragraph, and of course <a href="${prefix}/members/5942" data-user-id="5942">@Minda Myers</a>&nbsp;` +
      `<a href="${prefix}/members/8781" data-user-id="8781">@Ray Hylo</a>&nbsp;#boom.</p><p>danke</p>`

      expect(RichText.qualifyLinks(text)).to.equal(expected)
    })

    it('links hashtags inside anchor tags', () => {
      const text = '<p><a>#hashtag</a></p>'
      const groupUrl = `${prefix}/groups/foo/topics/hashtag`
      const nonGroupUrl = `${prefix}/topics/hashtag`
      const expected = url => `<p><a href="${url}">#hashtag</a></p>`

      expect(RichText.qualifyLinks(text, null, null, 'foo')).to.equal(expected(groupUrl))
      expect(RichText.qualifyLinks(text)).to.equal(expected(nonGroupUrl))
    })
  })
})

import '../../setup'
import Frontend from '../../../api/services/Frontend'

const prefix = Frontend.Route.prefix

describe('RichText', function () {
  describe('.qualifyLinks', function () {
    it('turns data-user-id links into fully-qualified links', function () {
      let text = '<p>#hashtag, #anotherhashtag, https://www.metafilter.com/wooooo</p>' +
        '<p>a paragraph, and of course <a href="/members/5942" data-user-id="5942">@Minda Myers</a>&nbsp;' +
        '<a href="/members/8781" data-user-id="8781">@Ray Hylo</a>&nbsp;#boom.</p><p>danke</p>'

      let expected = `<p><a href="${prefix}/all/topics/hashtag" class="hashtag" data-search="#hashtag">#hashtag</a>, ` +
        `<a href="${prefix}/all/topics/anotherhashtag" class="hashtag" data-search="#anotherhashtag">#anotherhashtag</a>, ` +
        `<a href="https://www.metafilter.com/wooooo" class="linkified" target="_blank">https://www.metafilter.com/wooooo</a></p>` +
        `<p>a paragraph, and of course <a href="${prefix}/all/members/5942" data-user-id="5942">@Minda Myers</a>&nbsp;` +
        `<a href="${prefix}/all/members/8781" data-user-id="8781">@Ray Hylo</a>&nbsp;` +
        `<a href="${prefix}/all/topics/boom" class="hashtag" data-search="#boom">#boom</a>.</p><p>danke</p>`

      expect(RichText.qualifyLinks(text)).to.equal(expected)
    })

    it('links hashtags inside anchor tags', () => {
      const text = '<p><a>#hashtag</a></p>'
      const groupUrl = `${prefix}/groups/foo/topics/hashtag`
      const nonGroupUrl = `${prefix}/all/topics/hashtag`
      const expected = url => `<p><a href="${url}" data-search="#hashtag" class="hashtag">#hashtag</a></p>`

      expect(RichText.qualifyLinks(text, null, null, 'foo')).to.equal(expected(groupUrl))
      expect(RichText.qualifyLinks(text)).to.equal(expected(nonGroupUrl))
    })
  })

  describe('getUserMentions', () => {
    it('gets all the mentions', () => {
      const text = `<p><a href="${prefix}/all/topics/hashtag" class="hashtag" data-search="#hashtag">#hashtag</a>, ` +
        `<a href="${prefix}/all/topics/anotherhashtag" class="hashtag" data-search="#anotherhashtag">#anotherhashtag</a>, ` +
        `<a href="https://www.metafilter.com/wooooo" class="linkified" target="_blank">https://www.metafilter.com/wooooo</a></p>` +
        `<p>a paragraph, and of course <a href="${prefix}/all/members/5942" data-user-id="5942">@Minda Myers</a>&nbsp;` +
        `<a href="${prefix}/all/members/8781" data-user-id="8781">@Ray Hylo</a>&nbsp;` +
        `<a href="${prefix}/all/topics/boom" class="hashtag" data-search="#boom">#boom</a>.</p><p>danke</p>`

      expect(RichText.getUserMentions(text)).to.have.members(['5942', '8781'])
    })
  })
})

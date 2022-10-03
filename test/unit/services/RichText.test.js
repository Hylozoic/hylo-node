import '../../setup'
import Frontend from '../../../api/services/Frontend'
import * as RichText from '../../../api/services/RichText'

const prefix = Frontend.Route.prefix

describe('RichText', function () {
  describe('processHTML', () => {
    it('converts Hylo.com URLs to relative hrefs', () => {
      const processResult = RichText.processHTML(
        '<a href="https://www.hylo.com/groups/exit-to-community" target="_blank">https://www.hylo.com/groups/exit-to-community</a>',
      )
      expect(processResult).to.equal(
        '<a href="/groups/exit-to-community" target="_self">https://www.hylo.com/groups/exit-to-community</a>'
      )
    })
  })
  
  describe('sanitizeHTML', () => {
    it('returns empty string if called without text', () => {
      expect(RichText.sanitizeHTML()).to.equal('')
    })
  
    it('allows whitelist to be undefined', () => {
      expect(RichText.sanitizeHTML('foo')).to.equal('foo')
    })
  
    it('strips leading whitespace in paragraphs', () => {
      expect(RichText.sanitizeHTML('<p>&nbsp;</p>')).to.equal('<p></p>')
    })
  
    it('removes tags not on a whitelist', () => {
      const expected = 'Wombats are great.<div>They poop square.</div>'
      const unsafe = 'Wombats are great.<em>So great.</em><div>They poop square.</div>'
      const actual = RichText.sanitizeHTML(unsafe, { allowedTags: ['div'] })
      expect(actual).to.equal(expected)
    })
  
    it('removes attributes not on a whitelist', () => {
      const expected = '<p id="wombat-data">Wombats are great.</p>'
      const unsafe = '<p id="wombat-data" class="main-wombat">Wombats are great.</p>'
      const actual = RichText.sanitizeHTML(unsafe, { allowTags: ['p'], allowedAttributes: { p: ['id'] } })
      expect(actual).to.equal(expected)
    })
  })

  describe('.qualifyLinks', function () {
    it('turns relative links into fully-qualified links', function () {
      let text = '<p>a paragraph, and of course <a href="/all/members/5942" data-user-id="5942">@Minda Myers</a>&nbsp;' +
        '<a href="/all/members/8781" data-user-id="8781">@Ray Hylo</a>' +
        '<a href="/all/topics/boom" class="hashtag" data-search="#boom">#boom</a>.</p><p>danke</p>'
      let expected = `<p>a paragraph, and of course <a href="${prefix}/all/members/5942" data-user-id="5942">@Minda Myers</a>&nbsp;` +
        `<a href="${prefix}/all/members/8781" data-user-id="8781">@Ray Hylo</a>&nbsp;` +
        `<a href="${prefix}/all/topics/boom" class="hashtag" data-search="#boom">#boom</a>.</p><p>danke</p>`

      expect(RichText.qualifyLinks(text)).to.equal(expected)
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

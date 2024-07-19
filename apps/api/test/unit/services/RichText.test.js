import '../../setup'
import Frontend from '../../../api/services/Frontend'
import * as RichText from '../../../api/services/RichText'

const prefix = Frontend.Route.prefix

describe('RichText', function () {
  describe('processHTML', () => {
    it('Ensures that long link text is concatenated', () => {
      const processResult = RichText.processHTML(
        '<a href="https://hylo.com/0123456789001234567890012345678900123456789001234567890">https://hylo.com/0123456789001234567890012345678900123456789001234567890</a>',
      )
      expect(processResult).to.equal(
        '<a href="https://hylo.com/0123456789001234567890012345678900123456789001234567890" class="hylo-link">https://hylo.com/0123456789001234567890012345678…</a>'
      )
    })

    it('Aligns legacy HTML content to deliver a result consistent to current HTML format', () => {
      const processResult = RichText.processHTML(
        '<a data-entity-type="mention" data-user-id="99999">Person 9999</a>' +
        '<a data-entity-type="#mention" data-search="my-topic">#my-topic</a>'
      )

      expect(processResult).to.equal(
        '<span class="mention" data-type="mention" data-id="99999" data-label="Person 9999">Person 9999</span>' +
        '<span class="topic" data-type="topic" data-id="my-topic" data-label="#my-topic">#my-topic</span>'
      )
    })

    it('adds "mention-current-user" CSS class to mentions for a provider user id', () => {
      const processResult = RichText.processHTML(
        '<span class="mention" data-id="12">Test User</span>',
        { forUserId: '12' }
      )

      expect(processResult).to.equal(
        '<span class="mention mention-current-user" data-id="12">Test User</span>'
      )
    })

    it('returns empty string if called without text', () => {
      expect(RichText.processHTML()).to.equal('')
    })

    it('allows whitelist to be undefined', () => {
      expect(RichText.processHTML('foo')).to.equal('foo')
    })

    it('removes tags not on a whitelist', () => {
      const expected = 'Wombats are great.<div>They poop square.</div>'
      const unsafe = 'Wombats are great.<em>So great.</em><div>They poop square.</div>'
      const actual = RichText.processHTML(unsafe, { insaneOptions: { allowedTags: ['div'] } })
      expect(actual).to.equal(expected)
    })

    it('removes attributes not on a whitelist', () => {
      const expected = '<p id="wombat-data">Wombats are great.</p>'
      const unsafe = '<p id="wombat-data" class="main-wombat">Wombats are great.</p>'
      const actual = RichText.processHTML(unsafe, { insaneOptions: { allowTags: ['p'], allowedAttributes: { p: ['id'] } } })
      expect(actual).to.equal(expected)
    })
  })

  describe('.qualifyLinks', function () {
    it('turns relative links into fully-qualified links', function () {
      // Note: This text is legacy, e.g. `data-search` vs `data-label`, `data-user-id` vs `data-id`, etc
      const text = '<p>a paragraph, and of course <span href="/all/members/5942" class="mention" data-type="mention" data-id="5942" data-label="Minda Myers">Minda Myers</span>&nbsp;' +
        '<span href="/all/members/8781" class="mention" data-type="mention" data-id="8781" data-label="Ray Hylo">Ray Hylo</span>' +
        '<span href="/all/topics/boom" class="topic" data-type="topic" data-id="boom" data-label="#boom">#boom</span>.</p><p>danke</p>'
      const expectedWithGroupSlug = `<p>a paragraph, and of course <a href="${prefix}/groups/my-group-slug/members/5942" class="mention" data-type="mention" data-id="5942" data-label="Minda Myers">Minda Myers</a>&nbsp;` +
        `<a href="${prefix}/groups/my-group-slug/members/8781" class="mention" data-type="mention" data-id="8781" data-label="Ray Hylo">Ray Hylo</a>` +
        `<a href="${prefix}/groups/my-group-slug/topics/boom" class="topic" data-type="topic" data-id="boom" data-label="#boom">#boom</a>.</p><p>danke</p>`
      const expectedWithoutGroupSlug = `<p>a paragraph, and of course <a href="${prefix}/all/members/5942" class="mention" data-type="mention" data-id="5942" data-label="Minda Myers">Minda Myers</a>&nbsp;` +
        `<a href="${prefix}/all/members/8781" class="mention" data-type="mention" data-id="8781" data-label="Ray Hylo">Ray Hylo</a>` +
        `<a href="${prefix}/all/topics/boom" class="topic" data-type="topic" data-id="boom" data-label="#boom">#boom</a>.</p><p>danke</p>`

      expect(RichText.qualifyLinks(text, 'my-group-slug')).to.equal(expectedWithGroupSlug)
      expect(RichText.qualifyLinks(text)).to.equal(expectedWithoutGroupSlug)
    })
  })

  describe('getUserMentions', () => {
    it("doesn't fail if no mentions are found", () => {
      const text = `<p>test text</p>`

      expect(RichText.getUserMentions(text)).to.be.empty
    }),

    it('gets all the mentions', () => {
      const text = `<p><a href="${prefix}/all/topics/hashtag" class="topic" data-type="topic" data-id="hashtag" data-label="#hashtag">#hashtag</a>, ` +
        `<a href="${prefix}/all/topics/anotherhashtag" class="topic" data-type="topic" data-id="anotherhashtag" data-label="#anotherhashtag">#anotherhashtag</a>, ` +
        `<a href="https://www.metafilter.com/wooooo" class="linkified" target="_blank">https://www.metafilter.com/wooooo</a></p>` +
        `<p>a paragraph, and of course <a href="${prefix}/all/members/5942" class="mention" data-type="mention" data-id="5942" data-label="@Minda Myers">@Minda Myers</a>&nbsp;` +
        `<a href="${prefix}/all/members/8781" class="mention" data-type="mention" data-id="8781" data-label="@Ray Hylo">@Ray Hylo</a>&nbsp;` +
        `<a href="${prefix}/all/topics/boom" class="topic" data-type="topic" data-id="boom" data-label="#boom">#boom</a>.</p><p>danke</p>`

      expect(RichText.getUserMentions(text)).to.have.members(['5942', '8781'])
    })
  })
})

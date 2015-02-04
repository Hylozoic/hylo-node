require(require('root-path')('test/setup'));
var RichText = requireFromRoot('api/services/RichText'),
  format = require('util').format;

describe('RichText', function() {

  describe('.qualifyLinks', function() {

    it('turns data-user-id links into fully-qualified links', function() {
      var text = '<p>#hashtag, #anotherhashtag, https://www.metafilter.com/wooooo</p>' +
        '<p>a paragraph, and of course <a href="/u/5942" data-user-id="5942">@Minda Myers</a>&#xA0;' +
        '<a href="/u/8781" data-user-id="8781">@Ray Hylo</a>&#xA0;#boom.</p><p>danke</p>';

      var expected = format('<p>#hashtag, #anotherhashtag, https://www.metafilter.com/wooooo</p>' +
        '<p>a paragraph, and of course <a href="%s://%s/u/5942" data-user-id="5942">@Minda Myers</a>&#xA0;' +
        '<a href="%s://%s/u/8781" data-user-id="8781">@Ray Hylo</a>&#xA0;#boom.</p><p>danke</p>',
        process.env.PROTOCOL, process.env.DOMAIN, process.env.PROTOCOL, process.env.DOMAIN);

      expect(RichText.qualifyLinks(text)).to.equal(expected);
    });

  });

});

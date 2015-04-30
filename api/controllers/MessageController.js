var email = require('email-addresses'),
  format = require('util').format,
  Mailgun = require('mailgun').Mailgun,
  MailComposer = require('mailcomposer').MailComposer;

var example = {
  'Content-Type': 'multipart/mixed; boundary="------------020601070403020003080006"',
  Date: 'Fri, 26 Apr 2013 11:50:29 -0700',
  Subject: 'Re: Sample POST request',
  From: 'Lawrence <u=4e89f6c0441e8749761ad41d1432307646016564668f442b634ff42f18956a05@mg.hylo.com>',
  To: 'Soma Lawrence <u=4e89f6c0441e8749761ad41d1432307670cf47fe58629864d527ee0ea91cbbfdb47aafeaa9bb6582956e6b68bc76689a@mg.hylo.com>',
  'In-Reply-To': '<517AC78B.5060404@mg.hylo.com>',
  'Message-Id': '<517ACC75.5010709@mg.hylo.com>',
  'Mime-Version': '1.0',
  Received:
  [
  'by luna.mailgun.net with SMTP mgrt 8788212249833; Fri, 26 Apr 2013 18:50:30 +0000',
  'from [10.20.76.69] (Unknown [50.56.129.169]) by mxa.mailgun.org with ESMTP id 517acc75.4b341f0-worker2; Fri, 26 Apr 2013 18:50:29 -0000 (UTC)'
  ],
  References: '<517AC78B.5060404@mg.hylo.com>',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:17.0) Gecko/20130308 Thunderbird/17.0.4',
  'X-Mailgun-Variables': '{"my_var_1": "Mailgun Variable #1", "my-var-2": "awesome"}',
  'attachment-count': '2',
  'body-html': '<html>\n  <head>\n    <meta content="text/html; charset=ISO-8859-1"\n      http-equiv="Content-Type">\n  </head>\n  <body text="#000000" bgcolor="#FFFFFF">\n    <div class="moz-cite-prefix">\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">Hi Alice,</div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);"><br>\n      </div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">This is Bob.<span class="Apple-converted-space">&nbsp;<img\n            alt="" src="cid:part1.04060802.06030207@mg.hylo.com"\n            height="15" width="33"></span></div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);"><br>\n        I also attached a file.<br>\n        <br>\n      </div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">Thanks,</div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">Bob</div>\n      <br>\n      On 04/26/2013 11:29 AM, Alice wrote:<br>\n    </div>\n    <blockquote cite="mid:517AC78B.5060404@mg.hylo.com" type="cite">Hi\n      Bob,\n      <br>\n      <br>\n      This is Alice. How are you doing?\n      <br>\n      <br>\n      Thanks,\n      <br>\n      Alice\n      <br>\n    </blockquote>\n    <br>\n  </body>\n</html>\n',
  'body-plain': 'Hi Alice,\n\nThis is Bob.\n\nI also attached a file.\n\nThanks,\nBob\n\nOn 04/26/2013 11:29 AM, Alice wrote:\n> Hi Bob,\n>\n> This is Alice. How are you doing?\n>\n> Thanks,\n> Alice\n\n',
  'content-id-map': '{"<part1.04060802.06030207@mg.hylo.com>": "attachment-1"}',
  'message-headers': '[["Received", "by luna.mailgun.net with SMTP mgrt 8788212249833; Fri, 26 Apr 2013 18:50:30 +0000"], ["Received", "from [10.20.76.69] (Unknown [50.56.129.169]) by mxa.mailgun.org with ESMTP id 517acc75.4b341f0-worker2; Fri, 26 Apr 2013 18:50:29 -0000 (UTC)"], ["Message-Id", "<517ACC75.5010709@mg.hylo.com>"], ["Date", "Fri, 26 Apr 2013 11:50:29 -0700"], ["From", "Bob <bob@mg.hylo.com>"], ["User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:17.0) Gecko/20130308 Thunderbird/17.0.4"], ["Mime-Version", "1.0"], ["To", "Alice <alice@mg.hylo.com>"], ["Subject", "Re: Sample POST request"], ["References", "<517AC78B.5060404@mg.hylo.com>"], ["In-Reply-To", "<517AC78B.5060404@mg.hylo.com>"], ["X-Mailgun-Variables", "{\\"my_var_1\\": \\"Mailgun Variable #1\\", \\"my-var-2\\": \\"awesome\\"}"], ["Content-Type", "multipart/mixed; boundary=\\"------------020601070403020003080006\\""], ["Sender", "bob@mg.hylo.com"]]',
  signature: '834f3410c133b699cb655804987b40bf666beba49550486a3dfe55fdfa511185',
  'stripped-html': '<html><head><meta content="text/html; charset=ISO-8859-1" http-equiv="Content-Type"></head><body text="#000000" bgcolor="#FFFFFF">\n    <div class="moz-cite-prefix">\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">Hi Alice,</div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);"><br></div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">This is Bob.<span class="Apple-converted-space">&#160;<img alt="" src="cid:part1.04060802.06030207@mg.hylo.com" height="15" width="33"></span></div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);"><br>\n        I also attached a file.<br><br></div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">Thanks,</div>\n      <div style="color: rgb(34, 34, 34); font-family: arial,\n        sans-serif; font-size: 12.666666984558105px; font-style: normal;\n        font-variant: normal; font-weight: normal; letter-spacing:\n        normal; line-height: normal; orphans: auto; text-align: start;\n        text-indent: 0px; text-transform: none; white-space: normal;\n        widows: auto; word-spacing: 0px; -webkit-text-size-adjust: auto;\n        -webkit-text-stroke-width: 0px; background-color: rgb(255, 255,\n        255);">Bob</div>\n      <br><br></div>\n    <br></body></html>',
  'stripped-signature': 'Thanks,\nBob',
  'stripped-text': 'Hi Alice,\n\nThis is Bob.\n\nI also attached a file.',
  subject: 'Re: Sample POST request',
  timestamp: '1430421559',
  token: 'fb99d1e5ef9df61e65a4987740d4465789275d5741bb96d70d'
};

module.exports = {

  relayFromEmail: function(req, res) {
    var from = email.parseOneAddress(req.param('To')),
      to = email.parseOneAddress(req.param('From')),
      recipient = User.decryptEmail(to.address),
      newTo = (to.name ? format('%s <%s>', to.name, recipient) : recipient),
      sender = User.encryptEmail(from.address),
      newFrom = (from.name ? format('%s <%s>', from.name, sender) : sender);

    var composer = new MailComposer();
    var options = {
      from: newFrom,
      to: newTo,
      subject: req.param('Subject'),
      body: req.param('body-plain'),
      html: req.param('body-html')
    };
    console.log(options);
    composer.setMessageOption(options);

    var buildMessage = Promise.promisify(composer.buildMessage, composer),
      mg = new Mailgun(process.env.MAILGUN_API_KEY),
      sendRaw = Promise.promisify(mg.sendRaw, mg);

    buildMessage().then(function(body) {
      return sendRaw(newFrom, newTo, body);
    })
    .then(function() {
      res.ok({});
    })
    .catch(res.serverError.bind(res));

  },

  runExample: function() {
    this.relayFromEmail({
      contents: example,
      param: function(key) {
        return this.contents[key];
      },
      allParams: function() {
        return this.contents;
      }
    }, {
      ok: function(text) {
        console.log('ok: ' + text);
      },
      serverError: function(err) {
        console.error('err: ' + err);
      }
    })
  }

};
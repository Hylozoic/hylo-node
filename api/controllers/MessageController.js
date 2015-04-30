var email = require('email-addresses'),
  format = require('util').format,
  Mailgun = require('mailgun').Mailgun,
  MailComposer = require('mailcomposer').MailComposer;

module.exports = {

  relayFromEmail: function(req, res) {
    var from = email.parseOneAddress(req.param('To')),
      to = email.parseOneAddress(req.param('From')),
      recipient, sender;

    try {
      recipient = User.decryptEmail(to.address);
      sender = User.encryptEmail(from.address);
    } catch (e) {
      res.send('Not Acceptable').status(406);
      require('rollbar').handleError(e, {to: to, from: from});
      return;
    }

    var newTo = (to.name ? format('%s <%s>', to.name, recipient) : recipient),
      newFrom = (from.name ? format('%s <%s>', from.name, sender) : sender),
      composer = new MailComposer();

    composer.setMessageOption({
      from: newFrom,
      to: newTo,
      subject: req.param('Subject'),
      body: req.param('body-plain'),
      html: req.param('body-html')
    });

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

  }

};
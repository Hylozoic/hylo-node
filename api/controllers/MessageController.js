var email = require('email-addresses'),
  Mailgun = require('mailgun').Mailgun,
  MailComposer = require('mailcomposer').MailComposer;

module.exports = {

  createWaitlistRequest: function(req, res) {
    var form = _.pick(req.allParams(), 'name', 'email', 'details');

    Email.sendSimpleEmail(process.env.WAITLIST_ASANA_EMAIL_ADDRESS, 'tem_8bNZg82ZUPzuXAqu2eRJF6', form, {
      cc: [{address: 'edward@hylo.com'}],
      sender: {
        name: 'Hylobot',
        address: 'edward@hylo.com'
      }
    })
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  relayFromEmail: function(req, res) {
    var from = email.parseOneAddress(req.param('From')),
      to = _.find(email.parseAddressList(req.param('To')), e => e.domain === process.env.MAILGUN_DOMAIN),
      recipient, sender;

    try {
      recipient = User.decryptEmail(to.address);
      sender = User.encryptEmail(from.address);
    } catch (e) {
      res.send('Not Acceptable').status(406);
      require('rollbar').handleError(e, req);
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

    // TODO add attachments
    // var attachmentCount = Number(req.param('attachment-count') || 0);

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
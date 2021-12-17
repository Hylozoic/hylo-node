import jwt from 'jsonwebtoken'

module.exports = {
  create: function (req, res) {
    const { name, email, email_validated, password } = req.allParams()

    return User.create({name, email: email ? email.toLowerCase() : null, email_validated, account: {type: 'password', password}})
    .then(async (user) => {
      await Analytics.trackSignup(user.id, req)
      if (req.param('login')) {
        await UserSession.login(req, user, 'password')
      }
      await user.refresh()

      if (req.param('resp') === 'user') {
        return res.ok({
          name: user.get('name'),
          email: user.get('email')
        })
      } else {
        return res.ok({})
      }
    })
    .catch(function (err) {
      res.status(422).send({ error: err.message ? err.message : err })
    })
  },

  status: function (req, res) {
    res.ok({signedIn: UserSession.isLoggedIn(req)})
  },

  sendEmailVerification: async function (req, res) {
    const email = req.param('email')

    const user = await User.find(email)
    if (user) {
      return res.status(422).send({ error: "duplicate-email" })
    }

    const code = await UserVerificationCode.create(email)
    const token = jwt.sign({
      iss: 'https://hylo.com',
      aud: 'https://hylo.com',
      sub: email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hour expiration
      code: code.get('code')
    }, process.env.JWT_SECRET);

    Queue.classMethod('Email', 'sendEmailVerification', {
      email,
      templateData: {
        code: code.get('code'),
        verify_url: Frontend.Route.verifyEmail(token)
      }
    })

    return res.ok({})
  },

  sendPasswordReset: function (req, res) {
    const email = req.param('email')
    return User.query(q => q.whereRaw('lower(email) = ?', email.toLowerCase())).fetch().then(function (user) {
      if (!user) {
        return res.ok({})
      } else {
        const nextUrl = req.param('evo')
          ? Frontend.Route.evo.passwordSetting()
          : null
        const token = user.generateJWT()
        Queue.classMethod('Email', 'sendPasswordReset', {
          email: user.get('email'),
          templateData: {
            login_url: Frontend.Route.jwtLogin(user, token, nextUrl)
          }
        })
        return res.ok({})
      }
    })
    .catch(res.serverError.bind(res))
  },

  verifyEmailByCode: async function (req, res) {
    let { code, email } = req.allParams()

    if (await UserVerificationCode.verify(email, code)) {
      // Store verified email for 4 hours
      res.cookie('verifiedEmail', email, { maxAge: 1000 * 60 * 60 * 4 });
      return res.ok(email)
    }

    return res.status(403).json({ error: 'invalid code' });
  },

  verifyEmailByToken: async function (req, res) {
    let { token } = req.allParams()
    const verify = Promise.promisify(jwt.verify, jwt)
    try {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET, { audience: 'https://hylo.com', issuer: 'https://hylo.com' })
      const email = decoded.sub
      const code = decoded.code

      if (await UserVerificationCode.verify(email, code)) {
        // Store verified email for 4 hours
        res.cookie('verifiedEmail', email, { maxAge: 1000 * 60 * 60 * 4 });
        return res.redirect(Frontend.Route.signupFinish())
      }
    } catch (e) {}

    return res.redirect(Frontend.Route.signup('invalid-link'))
  }

}

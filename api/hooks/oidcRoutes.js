import { get } from 'lodash/fp'
import oidc from '../services/OpenIDConnect'

// This is only needed for local dev, for some reason it is using :3001 for the port when we want :3000
const adjustRedirectUrl = (url, req) => {
  const redirectUrl = (process.env.PROTOCOL === 'https') ? url.replace('http://', 'https://') : url
  console.error("redirect url", redirectUrl, "base url =", req.baseUrl, "original url", req.originalUrl, "final url = ", redirectUrl.replace(req.baseUrl, process.env.PROTOCOL + '://' + process.env.DOMAIN))
  return redirectUrl.replace(req.baseUrl, process.env.PROTOCOL + '://' + process.env.DOMAIN)
}

module.exports = function (app) {

  return {
    routes: {
      before: {
        'GET /noo/oidc/interaction/:uid':  async (req, res, next) => {
          try {
            const details = await oidc.interactionDetails(req, res)
            const { uid, prompt, params } = details

            const client = await oidc.Client.find(params.client_id)

            if (prompt.name === 'login') {
              console.error("login interaction, redirecting to /oauth/login/", details)
              return res.redirect('/oauth/login/' + uid + '?name=' + client['name'])
            }

            console.error("non-login interactionxx", details)

            // TODO: could be called authorize?
            let redirectUrl = '/oauth/consent/' + uid + '?name=' + client['name']
            const missingOIDCScope = get("details.missingOIDCScope", prompt) || false
            if (missingOIDCScope) {
              redirectUrl += '&' + missingOIDCScope.map(s => 'missingScopes=' + s).join('&')
            }

            return res.redirect(redirectUrl)
          } catch (err) {
            console.error("Goterrror", err)
            return next(err)
          }
        },

        'POST /noo/oidc/:uid/login': async (req, res, next) => {
          try {
            const details = await oidc.interactionDetails(req, res)
            const { uid, prompt, params } = details

            if (prompt.name !== 'login') return res.status(403).send({ error: "Invalid request, please start over" })

            const client = await oidc.Client.find(params.client_id)

            let user

            // Check if user is already logged in by session
            const userId = req.session?.userId
            if (userId) {
              user = await User.find(userId)
            } else {
              // Otherwise try to log user in
              user = await User.authenticate(req.body.email, req.body.password)
            }

            const result = {
              login: { accountId: user.id },
            }

            let redirectTo = await oidc.interactionResult(req, res, result, { mergeWithLastSubmission: false })

            // Add name of the client so we can display locally
            redirectTo = adjustRedirectUrl(redirectTo, req) + '?name=' + client['name']

            return res.send({ redirectTo })
          } catch (err) {
            console.error("Goterrror2", err)
            return res.status(403).send({ error: err.message })
          }
        },

        'POST /noo/oidc/:uid/confirm': async (req, res, next) => {
          try {
            const interactionDetails = await oidc.interactionDetails(req, res)
            const { prompt: { name, details }, params, session: { accountId } } = interactionDetails

            console.error("confirmmm/consent interaction2", interactionDetails, " name = ", name, details, params, accountId)
            if (name !== 'consent') return res.status(500).send({ error: "Invalid Request" })

            let { grantId } = interactionDetails
            let grant

            if (grantId) {
              // we'll be modifying existing grant in existing session
              grant = await oidc.Grant.find(grantId)
            } else {
              // we're establishing a new grant
              grant = new oidc.Grant({
                accountId,
                clientId: params.client_id
              })
            }

            if (details.missingOIDCScope) {
              grant.addOIDCScope(details.missingOIDCScope.join(' '))
              // use grant.rejectOIDCScope to reject a subset or the whole thing
            }
            if (details.missingOIDCClaims) {
              grant.addOIDCClaims(details.missingOIDCClaims)
              // use grant.rejectOIDCClaims to reject a subset or the whole thing
            }
            if (details.missingResourceScopes) {
              // eslint-disable-next-line no-restricted-syntax
              for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
                grant.addResourceScope(indicator, scopes.join(' '))
                // use grant.rejectResourceScope to reject a subset or the whole thing
              }
            }

            grantId = await grant.save()

            const consent = {}
            if (!interactionDetails.grantId) {
              // we don't have to pass grantId to consent, we're just modifying existing one
              consent.grantId = grantId
            }

            const result = { consent }
            const redirectTo = await oidc.interactionResult(req, res, result, { mergeWithLastSubmission: true })
            return res.send({ redirectTo: adjustRedirectUrl(redirectTo, req) })
          } catch (err) {
            return res.status(500).send({ error: err.message })
          }
        },

        'POST /noo/oidc/:uid/abort': async (req, res, next) => {
          try {
            const result = {
              error: 'access_denied',
              error_description: 'End-User aborted interaction',
            }
            const redirectTo = await oidc.interactionResult(req, res, result, { mergeWithLastSubmission: false })
            return res.send({ redirectTo: adjustRedirectUrl(redirectTo, req) })
          } catch (err) {
            return res.status(500).json({ error: err.message })
          }
        }
      }
    }
  }
}

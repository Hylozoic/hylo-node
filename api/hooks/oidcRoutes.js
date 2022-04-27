import { get } from 'lodash/fp'
import oidc from '../services/OpenIDConnect'

// This is only needed for local dev, for some reason it is using :3001 for the port when we want :3000
const adjustRedirectUrl = (url) => {
  return url.replace(':3001', ':3000')
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
              return res.redirect('/oauth/login/' + uid + '?name=' + client['name'])
            }

            // TODO: could be called authorize?
            let redirectUrl = '/oauth/consent/' + uid
            const missingOIDCScope = get("details.missingOIDCScope", prompt) || false
            if (missingOIDCScope) {
              redirectUrl += "?name=" + client['name'] + '&' + missingOIDCScope.map(s => 'missingScopes=' + s).join('&')
            }

            return res.redirect(redirectUrl)
          } catch (err) {
            return next(err)
          }
        },

        'POST /noo/oidc/:uid/login': async (req, res, next) => {
          try {
            const { uid, prompt, params } = await oidc.interactionDetails(req, res)
            if (prompt.name !== 'login') return res.status(403).send({ error: "Invalid request, please start over" })

            const client = await oidc.Client.find(params.client_id)

            const user = await User.authenticate(req.body.email, req.body.password)

            const result = {
              login: { accountId: user.id },
            }

            let redirectTo = await oidc.interactionResult(req, res, result, { mergeWithLastSubmission: false })

            // Add name of the client so we can display locally
            redirectTo = adjustRedirectUrl(redirectTo) + '?name=' + client['name']

            return res.send({ redirectTo })
          } catch (err) {
            return res.status(403).send({ error: err.message })
          }
        },

        'POST /noo/oidc/:uid/confirm': async (req, res, next) => {
          try {
            const interactionDetails = await oidc.interactionDetails(req, res)
            const { prompt: { name, details }, params, session: { accountId } } = interactionDetails

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
            return res.send({ redirectTo: adjustRedirectUrl(redirectTo) })
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
            return res.send({ redirectTo: adjustRedirectUrl(redirectTo) })
          } catch (err) {
            return res.status(500).json({ error: err.message })
          }
        }
      }
    }
  }
}

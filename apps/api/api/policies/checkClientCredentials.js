import OIDCAdapter from '../../api/services/oidc/KnexAdapter'
import { decodeHyloJWT } from '../../lib/HyloJWT'

module.exports = async (req, res, next) => {
  const TOKEN_RE = /^Bearer (.+)$/i
  const match = req.headers.authorization && req.headers.authorization.match(TOKEN_RE)
  let clientId
  if (match) {
    const token = match[1]

    try {
      // Look for a JWT for API clients using the Client Credentials oAuth flow
      const decoded = decodeHyloJWT(token)
      clientId = decoded.client_id

      // TODO: check scopes/claims? or is that already happening in the OIDC resource server code?
      //       I think it is checking if scope is ok there but probably need to check here too?
      // XXX: for now only allow 'super' API clients to do anything
      const client = await (new OIDCAdapter("Client")).find(clientId)
      if (!client || client.role !== 'super') {
        return res.status(403).json({ error: 'Unauthorized' })
      }
      req.api_client = { id: clientId, name: client.name, scope: decoded.scope, super: true }
    } catch (e) {
      // Not a JWT, look up token in the oidc_payloads table to see if it as an AccessToken for the Authorization Code oAuth flow
      const accessToken = await (new OIDCAdapter("AccessToken")).find(token)
      const expiresAt = accessToken && new Date(accessToken.exp * 1000)

      if (expiresAt && expiresAt > Date.now()) {
        clientId = accessToken.clientId
        const client = await (new OIDCAdapter("Client")).find(clientId)
        if (!client) {
          return res.status(403).json({ error: 'Unauthorized' })
        }

        req.api_client = { id: clientId, name: client.name, scope: accessToken.scope }

        // Log user in using Access Token
        req.session.userId = accessToken.accountId
      } else {
        console.error("Error decoding token", e.message)
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }
  }

  return next()
}

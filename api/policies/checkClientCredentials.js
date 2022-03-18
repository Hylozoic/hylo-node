import OIDCAdapter from '../../api/services/oidc/KnexAdapter'
import { decodeHyloJWT } from '../../lib/HyloJWT'

module.exports = async (req, res, next) => {
  const TOKEN_RE = /^Bearer (.+)$/i
  const match = req.headers.authorization && req.headers.authorization.match(TOKEN_RE)
  if (match) {
    try {
      const token = match[1]
      const decoded = decodeHyloJWT(token)

      // TODO: check scopes/claims? or is that already happening in the OIDC resource server code?
      //       i think it is checking if scope is ok there but probably need to check here too?
      // XXX: for now only allow super people to do anything
      const client = await (new OIDCAdapter("Client")).find(decoded.client_id)
      if (!client || client.role !== 'super') {
        return res.status(403).json({ error: 'Unauthorized' })
      }
      req.api_client = { id: decoded.client_id, name: client.name }
      return next()
    } catch (e) {
      console.error("Error decoding token", e.message)
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  return next()
}

const oidc_payloads = "oidc_payloads"

const types = [
  "Session",
  "AccessToken",
  "AuthorizationCode",
  "RefreshToken",
  "DeviceCode",
  "ClientCredentials",
  "Client",
  "InitialAccessToken",
  "RegistrationAccessToken",
  "Interaction",
  "ReplayDetection",
  "PushedAuthorizationRequest",
  "Grant",
]

class DbAdapter {
  constructor(name) {
    this.name = name
    this.type = name
    this.cleaned = bookshelf.knex.table(oidc_payloads).where("expires_at", "<", new Date()).delete().then(() => this)
  }

  async upsert(id, payload, expiresIn) {
    const expires_at = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined
    await bookshelf.knex
      .table(oidc_payloads)
      .insert({
        id,
        type: this.type,
        payload,
        grant_id: payload.grantId,
        user_code: payload.userCode,
        uid: payload.uid,
        expires_at,
      })
      .onConflict(["id", "type"])
      .merge()
  }

  get _table() {
    return bookshelf.knex.table(oidc_payloads).where("type", this.type)
  }

  _rows(obj) {
    return this._table.where(obj)
  }

  _result(r) {
    return r.length > 0
      ? {
        ...r[0].payload,
        ...(r[0].consumed_at ? { consumed: true } : undefined),
      }
      : undefined
  }

  _findBy(obj) {
    return this._rows(obj).then(this._result)
  }

  find(id) {
    return this._findBy({ id })
  }

  findByUserCode(user_code) {
    return this._findBy({ user_code })
  }

  findByUid(uid) {
    return this._findBy({ uid })
  }

  destroy(id) {
    return this._rows({ id }).delete()
  }

  revokeByGrantId(grant_id) {
    return this._rows({ grant_id }).delete()
  }

  consume(id) {
    return this._rows({ id }).update({ consumed_at: new Date() })
  }
}

module.exports = DbAdapter

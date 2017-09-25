export function registerDevice (userId, { playerId, platform, version }) {
  return Device.upsert({userId, playerId, platform, version})
  .then(() => ({success: true}))
}

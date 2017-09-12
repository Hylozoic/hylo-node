export default function validateNetworkData (userId, data) {
  if (!data.name) {
    throw new Error("Network name can't be blank")
  }
  return Promise.resolve(data)
}

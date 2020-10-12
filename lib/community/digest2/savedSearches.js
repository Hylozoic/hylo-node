const sendDigest = async (search) => {
  const posts = search.newPosts()
}
export const sendAllDigests = async () => {
  const savedSearches = await SavedSearch.where({ active: true }).query()
  const promises = savedSearches.map(s => sendDigest(s))
  await Promise.all(promises)
}
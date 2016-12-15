export const fulfillRequest = function(opts) {
  const { fulfilledAt, contributorIds } = opts
  return bookshelf.transaction(transacting => {
    return this.save(
      {fulfilled_at: (fulfilledAt || new Date())},
      {patch: true, transacting}
    ).then(() => Promise.map(
      contributorIds,
      userId => Contribution.create(userId, this.id, transacting)
    ))
  })
}

export const unfulfillRequest = function() {
  return bookshelf.transaction(transacting => {
    const save = (post) => post.save({fulfilled_at: null}, {patch: true, transacting})
    const loadContributions = (post) => {
      return post.load(['contributions'], {transacting})
    }
    const removeActivities = (post) => {
      return Promise.all(
        post.relations.contributions.map(c =>
          Activity.removeForContribution(c.id, transacting))
      )
    }
    const removeContributions = (post) => {
      return Promise.all(
        post.relations.contributions.map(c =>
          c.destroy({transacting}))
      )
    }
    return save(this).then(loadContributions)
      .tap(removeActivities)
      .tap(removeContributions)
  })
}

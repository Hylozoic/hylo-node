export function fulfill (opts = {}) {
  const { fulfilledAt, contributorIds } = opts
  return bookshelf.transaction(transacting => {
    const fulfill = (post) =>
      post.save(
        {fulfilled_at: (fulfilledAt || new Date())},
        {patch: true, transacting}
      )
    const addContributors = (post) =>
      Promise.map(
        contributorIds || [],
        userId => Contribution.create(userId, this.id, transacting)
      )
    return fulfill(this).tap(addContributors)
  })
}

export function unfulfill () {
  return bookshelf.transaction(transacting => {
    const unfulfill = (post) =>
      post.save({fulfilled_at: null}, {patch: true, transacting})
    const loadContributions = (post) =>
      post.load(['contributions'], {transacting})
    const removeActivities = (post) =>
      Promise.map(
        post.relations.contributions.models,
        c => Activity.removeForContribution(c.id, transacting)
      )
    const removeContributions = (post) =>
      Promise.map(
        post.relations.contributions.models,
        c => c.destroy({transacting, require: false})
      )
    return unfulfill(this).then(loadContributions)
      .tap(removeActivities)
      .tap(removeContributions)
  })
}

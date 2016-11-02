require('../../setup')

describe('FullTextSearch', () => {
  it('sets up, refreshes, and drops the materialied view', function () {
    this.timeout(5000)
    return FullTextSearch.dropView()
    .then(() => FullTextSearch.createView())
    .then(() => FullTextSearch.refreshView())
    .then(() => FullTextSearch.dropView())
  })
})

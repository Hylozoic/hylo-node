
const validations = [
  {
    title: "title can't be blank",
    rule: params => params.name
  }, {
    title: "only posts of type 'project' may have a financial request",
    rule: params => !params.financialRequestAmount || params.type === 'project'
  }, {
    title: 'financial requests must be between 0 and 5,000',
    rule: params => params.financialRequestAmount === undefined || (params.financialRequestAmount > 0 && params.financialRequestAmount <= 5000)
  }, {
    title: 'financial request amount must be a numeric value',
    rule: params => params.financialRequestAmount === undefined || typeof params.financialRequestAmount === 'number'
  }, {
    title: "deadline can't be blank for financial requests",
    rule: params => params.financialRequestAmount === undefined || params.end_time !== undefined
  }
]

module.exports = {
  validate: function (postParams) {
    return _.chain(validations)
    .reject(validation => validation.rule(postParams))
    .map(validation => validation.title)
    .value()
  }
}

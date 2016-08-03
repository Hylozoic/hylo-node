const isFinancialRequest = postParams => postParams.financialRequestAmount !== undefined
const isFinancialRequestOnEdit = postParams => postParams.id !== undefined

const postValidations = [
  {
    title: "title can't be blank",
    rule: postParams => postParams.name
  }
]

const financialRequestValidations = [
  {
    title: "only posts of type 'project' may have a financial request",
    rule: postParams => postParams.type === 'project'
  }, {
    title: 'financial requests must be between 0 and 100,000',
    rule: postParams => (postParams.financialRequestAmount > 0 && postParams.financialRequestAmount <= 100000)
  }, {
    title: 'financial requests can have no more than 2 decimal places',
    rule: postParams => typeof postParams.financialRequestAmount === 'number' &&
                    (parseFloat(postParams.financialRequestAmount.toFixed(2)) === postParams.financialRequestAmount)
  }, {
    title: 'financial request amount must be a numeric value',
    rule: postParams => typeof postParams.financialRequestAmount === 'number'
  }, {
    title: "deadline can't be blank for financial requests",
    rule: postParams => postParams.end_time !== undefined && postParams.end_time !== null
  }, {
    title: 'deadline can not be in the past',
    rule: postParams => (postParams.end_time === undefined || postParams.end_time === null) || (new Date(postParams.end_time).getTime() > new Date().getTime())
  }
]

const financialRequestValidationsOnEdit = [
  {
    title: 'deadline can not be edited',
    rule: postParams => postParams.end_time === undefined
  }, {
    title: 'financial request amount can not be edited',
    rule: postParams => postParams.financialRequestAmount === undefined
  }
]

module.exports = {
  validate: function (postParams) {
    const validations = [
      ...postValidations,
      ...(isFinancialRequest(postParams) ? financialRequestValidations : []),
      ...(isFinancialRequestOnEdit(postParams) ? financialRequestValidationsOnEdit : [])
    ]

    return _.chain(validations)
    .reject(validation => validation.rule(postParams))
    .map(validation => validation.title)
    .value()
  }
}

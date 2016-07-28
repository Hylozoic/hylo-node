var root = require('root-path')
require(root('test/setup'))
var PostValidator = require(root('api/services/PostValidator'))

describe('PostValidator', () => {
  describe('.validate', () => {
    const defaultPostParams = {
      name: 'some post',
      type: 'project',
      end_time: new Date()
    }

    it('should show no error for a valid post', () => {
      const errors = PostValidator.validate(defaultPostParams)
      expect(errors).to.eql([])
    })

    it('should show no error for a valid project with financialRequestAmount', () => {
      const postParams = _.merge({}, defaultPostParams, {
        financialRequestAmount: 100,
        type: 'project'
      })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.eql([])
    })

    it('should return an error if there is no title', () => {
      const postParams = _.omit(defaultPostParams, ['name'])
      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain("title can't be blank")
    })

    it('should return an error if there is a financial request but the type is not a project', () => {
      const postParams = _.merge({}, defaultPostParams, {
        type: 'comment',
        financialRequestAmount: 100
      })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain("only posts of type 'project' may have a financial request")
    })

    it('should return an error if financialRequestAmount is less than zero', () => {
      const postParams = _.merge({}, defaultPostParams, { financialRequestAmount: -100 })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain('financial requests must be between 0 and 100,000')
    })

    it('should return an error if financialRequestAmount is equal to zero', () => {
      const postParams = _.merge({}, defaultPostParams, { financialRequestAmount: 0 })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain('financial requests must be between 0 and 100,000')
    })

    it('should return an error if financialRequestAmount is equal to zero', () => {
      const postParams = _.merge({}, defaultPostParams, { financialRequestAmount: 0 })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain('financial requests must be between 0 and 100,000')
    })

    it('should return an error if financialRequestAmount is more than 100,000', () => {
      const postParams = _.merge({}, defaultPostParams, { financialRequestAmount: 100001 })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain('financial requests must be between 0 and 100,000')
    })

    it('should return an error if financialRequestAmount is not numeric', () => {
      const postParams = _.merge({}, defaultPostParams, { financialRequestAmount: '1000' })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain('financial request amount must be a numeric value')
    })

    it('should return an error if financialRequestAmount is NaN', () => {
      const postParams = _.merge({}, defaultPostParams, { financialRequestAmount: NaN })

      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain('financial requests must be between 0 and 100,000')
    })

    it('should return an error if there is no end_time for a financial request', () => {
      const postParams = _.merge(_.omit(defaultPostParams, ['end_time']), { financialRequestAmount: 1000 })
      const errors = PostValidator.validate(postParams)
      expect(errors).to.have.lengthOf(1)
      expect(errors).to.contain("deadline can't be blank for financial requests")
    })

    it('should not return an error if no end_time is provided for non financial requests', () => {
      const postParams = _.omit(defaultPostParams, ['end_time'])
      const errors = PostValidator.validate(postParams)
      expect(errors).to.be.eql([])
    })
  })
})

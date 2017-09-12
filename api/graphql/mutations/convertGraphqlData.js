import { transform, snakeCase } from 'lodash'

export default function convertGraphqlData (data) {
  return transform(data, (result, value, key) => {
    result[snakeCase(key)] = typeof value === 'object'
      ? convertGraphqlData(value)
      : value
  }, {})
}

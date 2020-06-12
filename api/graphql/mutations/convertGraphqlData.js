import { transform, snakeCase } from 'lodash'

export default function convertGraphqlData (data) {
  if (data === null) {
    return null
  }

  return transform(data, (result, value, key) => {
    result[snakeCase(key)] = typeof value === 'object'
      ? convertGraphqlData(value)
      : value
  }, Array.isArray(data) ? [] : {})
}

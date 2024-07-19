import nock from 'nock'

const isSpy = (func) => !!func.__spy

export const spyify = (object, methodName, callback = () => {}) => {
  if (!isSpy(object[methodName])) object['_original' + methodName] = object[methodName]
  object[methodName] = spy(function () {
    const ret = object['_original' + methodName](...arguments)
    if (callback) return callback(...arguments, ret)
    return ret
  })
}

export const mockify = (object, methodName, func) => {
  if (!isSpy(object[methodName])) object['_original' + methodName] = object[methodName]
  object[methodName] = spy(func)
}

export const unspyify = (object, methodName) => {
  if (object['_original' + methodName]) {
    object[methodName] = object['_original' + methodName]
  }
}

export const wait = (millis, callback) =>
  new Promise(resolve => setTimeout(() =>
    resolve(callback ? callback() : null), millis))

// this is data for a 1x1 png
const pixel = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001010300000025db56ca00000003504c5445ff4d005c35387f0000000174524e53ccd23456fd0000000a49444154789c636200000006000336377ca80000000049454e44ae426082', 'hex')

export const stubGetImageSize = url => {
  const u = require('url').parse(url)
  const host = `${u.protocol}//${u.host}`
  // console.log(`stubbing ${host}${u.pathname}`)
  return nock(host).get(u.pathname).reply(200, pixel)
}

export function expectEqualQuery (actual, expected, { isCollection = true } = {}) {
  const reformatted = expected.replace(/\n\s*/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
  const query = isCollection ? actual.query() : actual
  const reformattedQuery = query.toString().replace(/\n\s*/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
  expect(reformattedQuery).to.equal(reformatted)
}

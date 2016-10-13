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
  new Promise((resolve, _) => setTimeout(() =>
    resolve(callback ? callback() : null), millis))

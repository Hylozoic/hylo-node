export const spyify = (object, methodName, callback) => {
  object['_original' + methodName] = object[methodName]
  object[methodName] = spy(function () {
    if (callback) callback(...arguments)
    return object['_original' + methodName](...arguments)
  })
  object[methodName] = spy(callback || object[methodName])
}

export const unspyify = (object, methodName) => {
  object[methodName] = object['_original' + methodName]
}

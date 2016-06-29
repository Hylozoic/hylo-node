export const spyify = (object, methodName, callback) => {
  object['_original' + methodName] = object[methodName]
  object[methodName] = spy(callback || object[methodName])
}

export const unspyify = (object, methodName) => {
  object[methodName] = object['_original' + methodName]
}

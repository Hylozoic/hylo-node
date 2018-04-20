import { get, has, isUndefined, merge, unset } from 'lodash'

export default {
  addSetting: function (value, save = false) {
    console.log('in addSetting')
    this.set('settings', merge({}, this.get('settings'), value))
    if (save) {
      console.log('saving')
      return this.save({settings: this.get('settings')}, {patch: true})
    }
    return this
  },

  removeSetting: function (path, save = false) {
    unset(this.get('settings'), path)
    if (save) {
      return this.save({settings: this.get('settings')}, {patch: true})
    }
    return this
  },

  getSetting: function (key) {
    return get(this.get('settings'), key)
  },

  hasSetting: function (key, value) {
    return isUndefined(value)
      ? has(this.get('settings'), key)
      : this.get('settings')[key] === value
  }
}

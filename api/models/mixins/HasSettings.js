import { merge, unset } from 'lodash'

export default {
  addSetting: function (value, save = false) {
    this.set('settings', merge({}, this.get('settings'), value))
    if (save) {
      return this.save({settings: this.get('settings')}, {patch: true})
    }
  },

  removeSetting: function (path, save = false) {
    unset(this.get('settings'), path)
    if (save) {
      return this.save({settings: this.get('settings')}, {patch: true})
    }
  }
}

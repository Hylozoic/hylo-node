import { merge, unset } from 'lodash'

export default {
  addSetting: function (value) {
    return this.set('settings', merge({}, this.get('settings'), value))
  },

  removeSetting: function (path, save = false) {
    unset(this.get('settings'), path)
    if (save) {
      return this.save({settings: this.get('settings')}, {patch: true})
    }
  }
}

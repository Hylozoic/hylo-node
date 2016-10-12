import { merge, unset } from 'lodash'

export default {
  addSetting: function (value) {
    return this.set('settings', merge({}, this.get('settings'), value))
  },

  removeSetting: function (path) {
    return unset(this.get('settings'), path)
  }
}

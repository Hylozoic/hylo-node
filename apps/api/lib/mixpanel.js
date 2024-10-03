const Mixpanel = require('mixpanel')

if (process.env.MIXPANEL_TOKEN && process.env.NODE_ENV !== 'test') {
  const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN)
  module.exports = mixpanel
} else {
  module.exports = {
    disabled: true,

    track: () => {},

    people: {
      set: () => {}
    },

    groups: {
      set: () => {}
    }
  }
}

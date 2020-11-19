const rollbar = require("rollbar");

if (process.env.ROLLBAR_SERVER_TOKEN && process.env.NODE_ENV !== "test") {
  rollbar.init({
    accessToken: process.env.ROLLBAR_SERVER_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
  });
  module.exports = rollbar;
} else {
  console.log("Rollbar disabled (process.env.ROLLBAR_SERVER_TOKEN undefined)");
  module.exports = {
    disabled: true,

    error(err, callback) {
      // eslint-disable-line
      // do nothing
      if (typeof callback === "function") callback();
    },

    errorHandler() {
      return null;
    },
  };
}

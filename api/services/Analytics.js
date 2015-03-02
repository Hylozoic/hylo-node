var instance = require('analytics-node')(process.env.SEGMENT_KEY);
console.log('initializing segment analytics');
module.exports = instance;
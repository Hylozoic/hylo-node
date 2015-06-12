var aws = require('aws-sdk'),
  mime = require('mime'),
  path = require('path'),
  request = require('request'),
  s3stream = require('s3-upload-stream')(new aws.S3());

var promisifyStream = function(stream) {
  return new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
};

module.exports = {

  copyAsset: function(instance, modelName, attr) {
    var subfolder = attr.replace('_url', ''),
      url = instance.get(attr),
      key = path.join(modelName.toLowerCase(), instance.id, subfolder, path.basename(url)),
      newUrl = process.env.AWS_S3_CONTENT_URL + '/' + key;

    console.log('from: ' + url);
    console.log('to:   ' + newUrl);

    if (url !== newUrl) {
      var download = request(url);
      download.pipe(s3stream.upload({
        Bucket: process.env.AWS_S3_BUCKET,
        ACL: 'public-read',
        ContentType: mime.lookup(key),
        Key: key
      }));

      var changes = {};
      changes[attr] = newUrl;

      return promisifyStream(download)
      .then(instance.save(changes, {patch: true}));
    }
  }
}
var aws = require('aws-sdk'),
  crypto = require('crypto'),
  gm = require('gm'),
  mime = require('mime'),
  path = require('path'),
  Promise = require('bluebird'),
  request = require('request'),
  s3stream = require('s3-upload-stream')(new aws.S3());

var promisifyStream = function(stream) {
  return new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
};

var basename = function(url) {
  var name = path.basename(url).replace(/(\?.*|[ %+])/g, '');
  return name === '' ? crypto.randomBytes(2).toString('hex') : name;
};

module.exports = {

  copyAsset: function(instance, modelName, attr) {
    var subfolder = attr.replace('_url', ''),
      url = instance.get(attr),
      key = path.join(modelName.toLowerCase(), instance.id, subfolder, basename(url)),
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
      .then(() => instance.save(changes, {patch: true}));
    }
  },

  resizeAsset: function(instance, attr, settings) {
    var s3 = new aws.S3(),
      getObject = Promise.promisify(s3.getObject, s3),
      url = instance.get(attr),
      key = url.replace(process.env.AWS_S3_CONTENT_URL + '/', ''),
      newKey = key.replace(/(\.\w{2,4})?$/, '-resized$1'),
      newUrl = process.env.AWS_S3_CONTENT_URL + '/' + newKey;

    console.log('from: ' + url);
    console.log('to:   ' + newUrl);

    return getObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }).then(obj => {
      var resize = gm(obj.Body)
      .resize(settings.width, settings.height, '>') // do not resize if already smaller
      .stream();

      resize.pipe(s3stream.upload({
        Bucket: process.env.AWS_S3_BUCKET,
        ACL: 'public-read',
        ContentType: mime.lookup(key),
        Key: newKey
      }));

      var changes = {};
      changes[attr] = newUrl;

      return promisifyStream(resize)
      .then(() => instance.save(changes, {patch: true}));
    });
  }

}

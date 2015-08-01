function LSAVector(o) {
	if (typeof (o) === 'number') {
		this.vec = [];
		var nDims = o;
		for (var i=0; i<nDims; i++)  {
			this.vec[i] = 0.0;
		}
		this.unknownWords = null;
		this.totalWords = null;

	} else {
		throw "Unkown object for LSAVector()";
	}
}

LSAVector.prototype.clone = function() {
	var r = new LSAVector(this.vec.length);
	r.vec = this.vec.slice(0);
	return r;
};

LSAVector.prototype.cosine = function(v2) {
	var v1 = this;
	var np = v1.norm() * v2.norm();
	if (np === 0.0) {
		return 0.0;
	}
	return v1.dot(v2)/np;
};

LSAVector.prototype.dot = function(v2) {
	var v1 = this;
	var s = 0.0;
	v1.vec.forEach(function(e, i) {
		s+= v1.vec[i] * v2.vec[i];
	});
	return s;
};

LSAVector.prototype.norm = function() {
	var s = 0.0;
	this.vec.forEach(function(v, i) {
		s += Math.pow(v, 2);
	});
	return Math.sqrt(s);
};

LSAVector.prototype.add = function(v2) {
	var r = this;
	this.vec.forEach(function(v, i) {
		r.vec[i] = r.vec[i] + v2.vec[i];
	});
	return r;
};

LSAVector.prototype.mult = function(s) {
	var r = this;
	this.vec.forEach(function(v, i) {
		r.vec[i] = r.vec[i] * s;
	});
	return r;
};

LSAVector.prototype.multArr = function(arr) {
	var r = this;
	this.vec.forEach(function(v, i) {
		r.vec[i] = r.vec[i] * arr[i];
	});
	return r;
};



function Serendipity() {
  	this.vectors = null;
	this.weights = null;
	this.singular = null;
	this.stopwords = null;
	this.words = null;
}

Serendipity.prototype.readCallback = function(name, body) {
	var that = this;

	console.log("Serendipity Loading "+name);
	if (name === '') {

	} else if (name === 'words') {
		that.words = readSet(body);
	} else if (name === 'stop_words') {
		that.stopwords = readSet(body);
	} else if (name === 'vectors') {
		that.vectors = readMultiFloatTable(body);
	} else if (name === 'singular') {
		that.singular = readArray(body);
	} else if (name === 'weights') {
		that.weights = readFloatTable(body);
	} else {
		throw "Unknown file "+ name;
	}

};

Serendipity.prototype.initFromFile = function(f, finalCallback) {
	var fn  =  this.readCallback.bind(this);
	readFromFile(f, fn, finalCallback);
};

Serendipity.prototype.initFromUrl = function(u, finalCallback) {
	var fn  =  this.readCallback.bind(this);
	readFromUrl(u, fn, finalCallback);
};

Serendipity.prototype.numDims = function(f) {
	if (!this.singular) {
		throw "Serendipity Not Initialized";
	}
	return this.singular.length;
};

Serendipity.prototype.wordVector = function(w) {
	if (!this.words[w]) {
		return null;
	}
	var r = new LSAVector(this.numDims());
	r.vec = this.vectors[this.words[w]].slice(0);
	return r;
};

Serendipity.prototype.docVector = function(text) {
	var counts = {};
	var that = this;
	text.toLowerCase().split(/\W+/).forEach(function(w, i) {
		w = w.trim();
		if (w) {
			if (!counts[w]) {
				counts[w] = 0;
			}
			counts[w]++;
		}
	});

	var r = new LSAVector(this.numDims());
	r.unknownWords = {};
	r.totalWords = 0;

	for (var k in counts) {
		r.totalWords += counts[k];
		if (that.words[k]) {
			var wv = this.wordVector(k);
			wv.mult(Math.log(1+counts[k]) * this.weights[this.words[k]]);
			r.add(wv);
		} else if (k.length > 2 && k.match(/[a-z]/)) {
			r.unknownWords[k] = counts[k];
		}
	}
	//return r.multArr(this.singular);
	return r;
};

Serendipity.prototype.similarity = function(v1, v2, ignoreUnknownWords) {
	var cos = 0.0;
	if (v1 && v2) {
		cos = v1.cosine(v2);
	}


	if ((true !== ignoreUnknownWords) && v1.unknownWords && v2.unknownWords) {
		for (var w in v1.unknownWords) {
			if (w in v2.unknownWords) {
				//cos += Math.log(1.0 + 0.5*(v1.unknownWords[w] + v2.unknownWords[w])) / (0.5 * (v1.totalWords + v2.totalWords));
				var adj = 1.0 / (v1.totalWords + v2.totalWords + 1.0);
				cos += adj;
			}
		}
	}
	return cos;
};



function readFromStream(stream, appCallback, finalCallback) {

	var zlib = require('zlib');
	var tar = require('tar-stream');

	var extract = tar.extract();
	var file = null;
	var body = "";


	extract.on('entry', function(header, stream, callback) {
	  // header is the tar header
	  // stream is the content body (might be an empty stream)
	  // call next when you are done with this entry
		file = header.name.replace('.txt', '');

		stream.on('data', function (chunk) {
		    body += chunk;
		});

	  stream.on('end', function() {
		  if (file)
			  appCallback(file, body);
		  body = "";
		  callback(); // ready for next entry
	  })

	  //stream.resume() // just auto drain the stream
	})

	extract.on('finish', function() {
		finalCallback();
	});

	stream.pipe(zlib.Unzip()).pipe(extract);
}

function readSet(body) {
	var r = {};
	body.split('\n').forEach(function (v, i) { if (v) { r[v] = i; } });
	return r;
}

function readFloatTable(body) {
	var r = [];
	body.split('\n').forEach(function (v, i) {
		if (v) {
			v = parseFloat(v);
			if (!isNaN(v)) {
				r.push(v);
			}
		}
	});
	return r;
}

function readArray(body) {

	var r = [];
	body.split('\n').forEach(function (v, i) {
		if (v) {
			var vals = v.split(' ');
			vals.forEach(function(v, i) {
				if (vals[i]) {
					vals[i] = parseFloat(vals[i]);
				} else {
					vals.splice(i, 1);
				}
			});
			r = vals;
		}
	});
	return r;
}

function readMultiFloatTable(body) {
	var r = [];
	body.split('\n').forEach(function (v, i) {
		if (v) {
			var vals = v.split(' ');
			vals.forEach(function(v, i) {
				vals[i] = parseFloat(vals[i]);
				if (isNaN(vals[i])) {
					vals.splice(i, 1);
				}
			});

			r.push(vals);
		}
	});
	return r;
}

function readFromFile(fname, callback, finalCallback) {
	var fs = require('fs');
	var fstream = fs.createReadStream(fname).on('error', console.log);
	readFromStream (fstream, callback, finalCallback);
}

function readFromUrl(url, callback, finalCallback)  {
	var request = require("request");
	readFromStream (request(url), callback, finalCallback);
}


module.exports = Serendipity;

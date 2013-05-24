/* 
    Copyright 2012 Coherent Theory LLC

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation; either version 2 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/

var utils = require('./utils.js');
var errors = require('./errors.js');
var knox = require('knox');
var mime = require('mime');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');

var AssetStore = (function() {
    var storageConfig;
    var storageSystem;
    function AssetStore() {
        storageSystem = app.config.storageSystem;
        storageConfig = app.config[storageSystem];
    }

    function localPutStream(fromFile, assetId, filename, fn)
    {
        //console.log("Let the renaming begin!");
        var path = process.cwd() + storageConfig.incomingBasePath +
                assetId;
        var relPath = assetId + '/' + filename;

        try {
            fs.mkdirSync(path);
        } catch (err) {
            if (!fs.existsSync(path)) {
                fn(err);
                return;
            }
        }
        path += '/' + filename;

        //console.log("going to rename " + fromFile + " to " + path);
        fs.rename(fromFile, path,
                  function(err) {
                      var res = { 'path' : relPath };
                      if (err && err.code === 'EXDEV') {
                          // we are apparently moving across partitions,
                          //  so fallback to copying
                          var is = fs.createReadStream(fromFile);
                          var os = fs.createWriteStream(path);

                          is.on('data', function(chunk) { os.write(chunk); })
                            .on('end', function() {
                                os.end();
                                fs.unlink(fromFile);
                                fn(null, res);
                            });
                          return;
                      }
                      fn(err, res);
                  }
                 );
    }

    function localGetStream(res, url, filename, fn)
    {
        var path = process.cwd() + storageConfig.basePath + url.path;
        fs.stat(path,
        function(err, stat) {
            if (err) {
                fn(err);
                return;
            }

            var stream = fs.createReadStream(path);
            res.header('Content-Length', stat.size);
            res.header('Content-Type', mime.lookup(stream.path));
            res.attachment(filename);

            stream.on('error', fn)
                  .on('data', function(chunk){ res.write(chunk); })
                  .on('end', function(){ fn(null); res.end(); });
        });
    }

    function s3PutStream(fromFile, assetId, filename, client, fn)
    {
        fs.stat(fromFile, function(err, stat) {
            if (err) {
                fn(err);
                return;
            }
            if (!stat.isFile()) {
                fn(new Error('Problem streaming file. Try again later.'));
                return;
            }

            var stream = fs.createReadStream(fromFile);

            var s3Req = client.put(assetId+filename, {
                'Content-Length': stat.size,
                'Content-Type': mime.lookup(stream.path),
                'x-amz-acl': 'private'
            });
            s3Req.on('response', function(res){
                //console.log('Upload res status code = ' + res.statusCode);
                //console.log(res.headers);
                if (res.statusCode !== 200) {
                    fn(new Error("File is unavailable. " +
                                 "Please try again later."));
                    return;
                }
                fn(null, res);
            });
            stream
                .on('error', function(err){ fn(err); })
                .on('data', function(chunk){ s3Req.write(chunk); })
                .on('end', function(){ s3Req.end(); });
        });
    }

    function s3GetStream(res, parsedUrl, filename, fn)
    {
        var client;

        try {
            client = knox.createClient(storageConfig);
        } catch (err) {
            fn(err);
            return;
        }

        var clientReq = client.get(parsedUrl.path);
        clientReq.on('response', function(downRes) {
            //console.log("download statusCode: ", downRes.statusCode);
            //console.log("headers: ", downRes.headers);

            if (downRes.statusCode !== 200 ||
                !downRes.headers['Content-Length'] ||
                !downRes.headers['Content-Type']) {
                fn(new Error("File is unavailable. Please try again later."));
                return;
            }

            res.header('Content-Length', downRes.headers['Content-Length']);
            res.header('Content-Type', downRes.headers['Content-Type']);
            res.attachment(filename);

            downRes.on('data', function(data) {
                //console.log('data received = ' + data.length)
                //console.log(data.toString());
                res.write(data);
            });
            downRes.on('end', function(data) {
                fn(null);
                res.end();
            });
            downRes.on('close', function(err) {
                //console.log(err);
                //fn(err);
                res.close(err);
            });
        });

        clientReq.on('error', function(e) {
            fn(e);
            return;
        });

        clientReq.end();
    }

    function keysToLowerCase(input) {
        var ret = [];
        for (var a in input) {
            ret[a.toLowerCase()] = input[a];
        }
        return ret;
    }

    function httpGetStream(res, parsedUrl, filename, fn)
    {
        var isSecure = parsedUrl.protocol === 'https:';
        var options = {
            'host': parsedUrl.hostname,
            'path': parsedUrl.path
        };

        (isSecure ? http : https).get(options, function(downRes) {
            //console.log("statusCode: ", downRes.statusCode);
            //console.log("headers: ", downRes.headers);
            downRes.header = keysToLowerCase(downRes.header);
            if (!downRes.headers['content-length'] ||
                !downRes.headers['content-type']) {
                fn(new Error("File is unavailable. Please try again later."));
                return;
            }

            res.header('Content-Length', downRes.headers['content-length']);
            res.header('Content-Type', downRes.headers['content-type']);
            res.attachment(filename);

            downRes.on('data', function(data) {
                //console.log('data received = ' + data.length)
                //console.log(data.toString());
                res.write(data);
            });
            downRes.on('end', function(data) {
                res.end();
                fn(null);
            });
            downRes.on('close', function(err) {
                console.log(err);
                res.close(err);
            });
        }).on('error', function(e) {
            fn(new Error("File is unavailable. Please try again later."));
            return;
        });
    }

    AssetStore.prototype.upload = function(fromFile, assetId, filename, fn) {
        if (!fromFile || !assetId || !filename) {
            var err = errors.create('MissingParameters', '');
            fn(err);
            return;
        }
        
        if (storageSystem === 's3') {
            var client;

            try {
                client = knox.createClient(storageConfig);
            } catch (err) {
                fn(err);
                return;
            }
            s3PutStream(fromFile, assetId, filename, client, fn);
        } else {
            localPutStream(fromFile, assetId, filename, fn);
        }
    };

    // storageUrl: the storage mechanism specific URL
    // filename: the name that hte file should be sent to the client as
    // fn: a function used to process errors with
    AssetStore.prototype.download = function(res, storageUrl, filename, fn) {
        var parsedUrl = url.parse(storageUrl);

        //console.log(parsedUrl);

        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            httpGetStream(res, parsedUrl, filename, fn);
        } else if (storageSystem === 's3') {
            s3GetStream(res, parsedUrl, filename, fn);
        } else {
            localGetStream(res, parsedUrl, filename, fn);
        }
    };

    AssetStore.prototype.remove = function(fileUrl, fn) {
        var parsedUrl = url.parse(fileUrl);

        if (storageSystem === 's3') {
            var client;

            try {
                client = knox.createClient(storageConfig);
            } catch (err) {
                fn(err);
                return;
            }

            var clientReq = client.del(parsedUrl.path);
            clientReq.on('response', function(downRes) {
                //console.log("download statusCode: ", downRes.statusCode);
                //console.log("headers: ", downRes.headers);

                if (downRes.statusCode !== 200 &&
                    downRes.statusCode !== 204) {
                    fn(new Error("File is unavailable. Please try again later."));
                    return;
                }
                fn(null, downRes);
            });

            clientReq.on('error', function(e) {
                fn(e);
                return;
            });

            clientReq.end();
        } else {
            fs.unlink(parsedUrl.path,
                      function(err) {
                          fn(err);
                          return;
                      });
        }
    };

    return AssetStore;
})();

module.exports.AssetStore = AssetStore;

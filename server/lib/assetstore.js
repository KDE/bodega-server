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
    var incomingDirPath;
    var contentDirPath;

    function checkContentDirectory(dirpath, fn) {
        var stats;
        var e;

        if (!dirpath) {
            e = errors.create('UploadFailed',
                              "Invalid content directory!");
            fn(e);
            return;
        }

        if (fs.existsSync()) {
            //statSync fails with inexistent paths
            stats = fs.statSync(dirpath);
        }

        if (!stats || !stats.isDirectory()) {
            try {
                fs.mkdirSync(dirpath, "0700");
            } catch (err) {
                if (!fs.existsSync(dirpath)) {
                    fn(err);
                    return;
                }
            }
        }

        fs.chmod(dirpath, '0700', function (err) {
            fn(err);
        });
    }

    function AssetStore() {
        var stats;

        storageSystem = app.config.storage.system;
        storageConfig = app.config.storage[storageSystem];

        if (storageSystem !== "s3") {
            incomingDirPath = path.join(process.cwd(),
                                        storageConfig.incomingBasePath);
            contentDirPath = path.join(process.cwd(),
                                       storageConfig.basePath);
            checkContentDirectory(incomingDirPath, function(err) {
                if (err) {
                    console.log("Invalid content directory! Set storageConfig!");
                    console.error(err);
                    process.exit(1);
                }
            });
            checkContentDirectory(contentDirPath, function(err) {
                if (err) {
                    console.log("Invalid content directory! Set storageConfig!");
                    console.error(err);
                    process.exit(1);
                }
            });
        }
    }

    function pathForAsset(assetInfo) {
        var assetPath = assetInfo.externpath;
        var parsedUrl;

        /* If it's a http url just return it as is */
        if (assetPath) {
            parsedUrl = url.parse(assetPath);
            if (parsedUrl.protocol === 'http:' ||
                parsedUrl.protocol === 'https:') {
                return assetPath;
            }
        }

        if (!assetInfo.id || !assetInfo.file) {
            return null;
        }

        if (storageSystem === 's3') {
            assetPath = assetInfo.id + assetInfo.file;
            if (assetInfo.incoming) {
                assetPath = "incoming-" + assetPath;
            }
        } else {
            if (assetInfo.incoming) {
                assetPath =
                    path.join(incomingDirPath,
                              assetInfo.id.toString());
            } else {
                assetPath =
                    path.join(contentDirPath,
                              assetInfo.id.toString());
            }
            assetPath = path.join(assetPath, assetInfo.file);
        }
        return assetPath;
    }

    function localMove(fromFile, toFile, fn) {
        fs.rename(fromFile, toFile, function(err) {
            if (err && err.code === 'EXDEV') {
                // we are apparently moving across partitions,
                //  so fallback to copying
                var is = fs.createReadStream(fromFile);
                var os = fs.createWriteStream(toFile);

                is.on('data', function(chunk) { os.write(chunk); })
                  .on('end', function() {
                        os.end();
                        fs.unlink(fromFile);
                        fn(null);
                    });
                return;
            }
            fn(err);
        });
    }


    function localPutStream(fromFile, assetPath, fn)
    {
        //console.log("Let the renaming begin!");
        var dirname = path.dirname(assetPath);
        try {
            fs.mkdirSync(dirname, "0700");
        } catch (err) {
            if (!fs.existsSync(dirname)) {
                fn(err);
                return;
            }
        }

        //console.log("going to rename " + fromFile + " to " + assetPath);
        localMove(fromFile, assetPath, fn);
    }

    function localGetStream(res, parsedUrl, filename, fn)
    {
        fs.stat(parsedUrl.path, function(err, stat) {
            if (err) {
                fn(err);
                return;
            }

            var stream = fs.createReadStream(parsedUrl.path);
            res.header('Content-Length', stat.size);
            res.header('Content-Type', mime.lookup(stream.path));
            res.attachment(filename);

            stream.on('error', fn)
                  .on('data', function(chunk) { res.write(chunk); })
                  .on('end', function() { fn(null); res.end(); });
        });
    }

    function s3PutStream(fromFile, assetPath, client, fn)
    {
        client.putFile(fromFile, assetPath, {'x-amz-acl': 'private'},
                       function (err, res) {
                           if (res.statusCode !== 200) {
                               fn(new Error("File is unavailable. " +
                                            "Please try again later."));
                               return;
                           }
                           fn(err, res);
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

    AssetStore.prototype.upload = function(fromFile, assetInfo, fn) {
        var assetPath;
        var e;
        if (!fromFile || !assetInfo.id || !assetInfo.file) {
            e = errors.create('MissingParameters', '');
            fn(e);
            return;
        }
        assetPath = pathForAsset(assetInfo);

        fs.stat(fromFile, function(err, stat) {
            if (err) {
                e = errors.create('AssetFileMissing', err.message);
                fn(e);
                return;
            }
            assetInfo.size = stat.size;
            if (storageSystem === 's3') {
                var client;

                try {
                    client = knox.createClient(storageConfig);
                } catch (err) {
                    fn(err);
                    return;
                }
                s3PutStream(fromFile, assetPath, client, fn);
            } else {
                localPutStream(fromFile, assetPath, fn);
            }
        });
    };

    // fn: a function used to process errors with
    AssetStore.prototype.download = function(res, assetInfo, fn) {
        var assetPath = pathForAsset(assetInfo);
        var parsedUrl = url.parse(assetPath);

        if (parsedUrl.protocol === 'http:' ||
            parsedUrl.protocol === 'https:') {
            httpGetStream(res, parsedUrl, assetInfo.file, fn);
        } else if (storageSystem === 's3') {
            s3GetStream(res, parsedUrl, assetInfo.file, fn);
        } else {
            localGetStream(res, parsedUrl, assetInfo.file, fn);
        }
    };

    AssetStore.prototype.remove = function(assetInfo, fn) {
        var assetPath = pathForAsset(assetInfo);
        var parsedUrl = url.parse(assetPath);

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
            fs.unlink(parsedUrl.path, function(err) {
                fn(err);
                return;
            });
        }
    };

    AssetStore.prototype.publish = function(assetInfo, fn) {
        var incomingAssetPath, assetPath;
        var e;

        if (!assetInfo.incoming || !assetInfo.posted) {
            e = errors.create('PublishingFailed',
                              "Trying to publishing a non-incoming asset.");
            fn(e);
            return;
        }

        //Can't publish external assets
        if (assetInfo.externpath) {
            fn(null);
            return;
        }

        incomingAssetPath = pathForAsset(assetInfo);
        assetInfo.incoming = false;
        assetPath = pathForAsset(assetInfo);
        assetInfo.incoming = true;

        if (storageSystem === 's3') {
            var client;
            console.log("S3 publishing isn't well tested!");
            try {
                client = knox.createClient(storageConfig);
            } catch (err) {
                fn(err);
                return;
            }
            client.copyFile(incomingAssetPath, assetPath, fn);
        } else {
            localPutStream(incomingAssetPath, assetPath, fn);
        }
    };

    AssetStore.prototype.copyAsset = function(assetInfo, cb) {
        var fromPath;
        var toPath;
        var incoming = assetInfo.incoming;
        var incomingDir;

        assetInfo.incoming = false;
        fromPath = pathForAsset(assetInfo);
        assetInfo.incoming = true;
        toPath = pathForAsset(assetInfo);
        assetInfo.incoming = incoming;

        incomingDir = path.dirname(toPath);

        checkContentDirectory(incomingDir, function(err) {
            var e;
            if (err) {
                e = errors.create('AssetFileMissing', err.message);
                cb(e);
                return;
            }
            utils.copyFile(fromPath, toPath, function(err) {
                if (err) {
                    e = errors.create('AssetFileMissing', err.message);
                    cb(e);
                    return;
                }
                cb(null);
            });
        });
    };

    return AssetStore;
})();

module.exports.AssetStore = AssetStore;

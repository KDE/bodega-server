/*
    Copyright 2013 Coherent Theory LLC

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

var utils = require('../utils.js');
var errors = require('../errors.js');
var createUtils = require('../createutils.js');
var fs = require('fs');
var path = require('path');
var async = require('async');

function addToJson(json, obj, key) {
    if (obj[key]) {
        json[key] = obj[key];
    }
}

function sendResponse(db, req, res, assetInfo)
{
    var json = utils.standardJson(req, true);

    json.asset = {
        id : assetInfo.id,
        name : assetInfo.name
    };

    addToJson(json.asset, assetInfo, 'baseprice');
    addToJson(json.asset, assetInfo, 'description');
    addToJson(json.asset, assetInfo, 'version');
    addToJson(json.asset, assetInfo, 'externpath');
    addToJson(json.asset, assetInfo, 'file');
    addToJson(json.asset, assetInfo, 'size');

    res.send(json);
}

function setupTags(db, req, res, assetInfo, cb)
{
    var e;

    if (assetInfo.tags) {
        createUtils.setupTags(
            db, req, res, assetInfo,
            function(err, db, req, res, assetInfo) {
                if (err) {
                    e = errors.create('UploadTagError', err.message);
                    cb(e, db, req, res, assetInfo);
                    return;
                }
                cb(null, db, req, res, assetInfo);
            });
    } else {
        cb(null, db, req, res, assetInfo);
    }
}

function setupPreviews(db, req, res, assetInfo, cb)
{
    var e;
    if (assetInfo.previews) {
        createUtils.setupPreviews(
            db, req, res, assetInfo,
            function(err) {
                if (err) {
                    e = errors.create('UploadPreviewError', err.message);
                    cb(e, db, req, res, assetInfo);
                    return;
                }
                cb(null, db, req, res, assetInfo);
            });
    } else {
        cb(null, db, req, res, assetInfo);
    }
}

function writeIncomingAsset(db, req, res, assetInfo, cb)
{
    var params = [assetInfo.id, assetInfo.partner];
    var setters = [];

    var attrs = ['baseprice', 'name', 'description',
                 'version', 'externpath', 'file', 'size'];
    var attr;
    for (var idx in attrs) {
        attr = attrs[idx];
        if (assetInfo[attr]) {
            params.push(assetInfo[attr]);
            setters.push(attr + " = $" + params.length);
        }
    }

    if (setters.length < 1) {
        cb(null, db, req, res, assetInfo);
        return;
    }

    var queryStr = "UPDATE incomingAssets SET " + setters.join(", ") +
                   " WHERE id = $1 AND partner = $2";

    db.query(queryStr, params, function(err, result) {
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });
}


function writeCreatedAsset(db, req, res, assetInfo, cb)
{
    var params = [];
    var columns = [];
    var values= [];

    var attrs = ['id', 'partner', 'baseprice',
                 'name', 'description', 'version', 'externpath',
                 'file', 'size'];
    var attr;
    for (var idx in attrs) {
        attr = attrs[idx];
        if (assetInfo[attr]) {
            columns.push(attr);
            params.push(assetInfo[attr]);
            values.push("$" + params.length);
        }
    }

    if (columns.length < 1) {
        cb(null, db, req, res, assetInfo);
        return;
    }

    var queryStr = "INSERT INTO incomingAssets (" + columns.join(", ") +
                   ") VALUES (" + values.join(", ") + ")";

    db.query(queryStr, params, function(err, result) {
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });
}

function uploadIncomingAsset(db, req, res, assetInfo, cb)
{
    var fromFile = null;
    var e;

    if (req.files && req.files.asset) {
        fromFile = req.files.asset.path;
    }

    if (!fromFile) {
        cb(null, db, req, res, assetInfo);
        return;
    }

    app.assetStore.upload(fromFile, assetInfo, function(err) {
        if (err) {
            //console.log("error due to bad rename?");
            e = errors.create('UploadFailed', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });
}

function updateIncomingAsset(db, req, res, assetInfo)
{
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo);
    }];

    funcs.push(uploadIncomingAsset);
    funcs.push(writeIncomingAsset);
    funcs.push(setupTags);
    funcs.push(setupPreviews);

    async.waterfall(funcs, function(err, db, req, res, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }
        sendResponse(db, req, res, assetInfo);
    });
}


function endTransaction(db, req, res, assetInfo, cb)
{
    var query = "COMMIT;";
    var e;

    var q = db.query(query, [], function(err, result) {
        var i;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });
}

function duplicateTag(db, req, res, assetInfo, tag, callback)
{
    var query = 'insert into incomingassettags (asset, tag) values ($1, $2);';
    var args = [tag.asset, tag.tag];
    var e;

    db.query(query, args, function(err, result) {
        if (err) {
            e = errors.create('Database', err.message);
            callback(e);
            return;
        }
        callback(null);
    });
}

function duplicateTags(db, req, res, assetInfo, cb)
{
    async.each(assetInfo.tags, function(tag, callback) {
        duplicateTag(db, req, res, assetInfo, tag, callback);
    }, function(err) {
        cb(err, db, req, res, assetInfo);
    });
}

function findTags(db, req, res, assetInfo, cb)
{
    var query =  "SELECT tagTypes.type, tags.title, a.asset, a.tag \
    FROM assetTags a JOIN tags ON (a.tag = tags.id) \
    LEFT JOIN tagTypes ON (tags.type = tagTypes.id) where a.asset = $1;";
    var e;

    db.query(query, [assetInfo.id], function (err, result) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.tags = result.rows;
        cb(null, db, req, res, assetInfo);
    });
}

function duplicatePreview(db, req, res, assetInfo, preview, callback)
{
    var query = 'insert into incomingassetpreviews (asset, path, mimetype, \
    type, subtype) values ($1, $2, $3, $4, $5);';
    var args = [preview.asset, preview.path, preview.mimetype,
                preview.type, preview.subtype];
    var e;

    db.query(query, args, function(err, result) {
        if (err) {
            e = errors.create('Database', err.message);
            callback(e);
            return;
        }
        app.previewStore.copyPreview(assetInfo, preview, function(err) {
            if (err) {
                callback(err);
                return;
            }
            callback(null);
        });
    });
}

function duplicatePreviews(db, req, res, assetInfo, cb)
{
    async.each(assetInfo.previews, function(preview, callback) {
        duplicatePreview(db, req, res, assetInfo, preview, callback);
    }, function(err) {
        cb(err, db, req, res, assetInfo);
    });
}

function findPreviews(db, req, res, assetInfo, cb)
{
    var query = "select * from assetPreviews where asset=$1;";
    var e;

    db.query(query, [assetInfo.id], function (err, result) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.previews = result.rows;
        cb(null, db, req, res, assetInfo);
    });
}

function duplicatePublishedAsset(db, req, res, assetInfo, cb)
{
    var incomingAssetQuery =
            "insert into incomingAssets (id, partner, baseprice, \
                                         name, description, version,  \
                                         versionts, externpath, file, \
                                         size, image, posted)\
                                         values ($1, $2, $3, $4, $5, $6, $7, \
                                                 $8, $9, $10, $11, $12, false)";

    db.query(
        incomingAssetQuery, [assetInfo.id,
                             assetInfo.partner, assetInfo.baseprice,
                             assetInfo.name, assetInfo.description,
                             assetInfo.version, assetInfo.versionts,
                             assetInfo.externpath, assetInfo.file,
                             assetInfo.size, assetInfo.image],
        function (err, result) {
            var e;
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo);
                return;
            }
            app.assetStore.copyAsset(assetInfo, function(err) {
                if (err) {
                    cb(err, db, req, res, assetInfo);
                    return;
                }
                cb(null, db, req, res, assetInfo);
            });
        });
}


function beginTransaction(db, req, res, assetInfo, cb)
{
    var query = "BEGIN;";
    var e;

    var q = db.query(query, [], function(err, result) {
        var i;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });
}

function updatePublishedAsset(db, req, res, assetInfo)
{
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo.publishedAsset);
    }];

    funcs.push(beginTransaction);
    funcs.push(duplicatePublishedAsset);
    funcs.push(findPreviews);
    funcs.push(duplicatePreviews);
    funcs.push(findTags);
    funcs.push(duplicateTags);
    funcs.push(endTransaction);

    async.waterfall(funcs, function(err) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }
        updateIncomingAsset(db, req, res, assetInfo);
    });
}

function createAssetId(db, req, res, assetInfo, cb)
{
    var e;
    var query = "select nextval('seq_assetsids') as assetId;";
    db.query(query, [], function(err, result) {
        if (err) {
            e = errors.crate('UploadFailed', req, res, err);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.id = utils.parseNumber(result.rows[0].assetid);
        cb(null, db, req, res, assetInfo);
    });
}

function createAsset(db, req, res, assetInfo)
{
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo);
    }];

    funcs.push(createAssetId);
    funcs.push(uploadIncomingAsset);
    funcs.push(writeCreatedAsset);
    funcs.push(setupTags);
    funcs.push(setupPreviews);

    async.waterfall(funcs, function(err, db, req, res, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }
        sendResponse(db, req, res, assetInfo);
    });
}

function processInfo(assetInfo, db, req, res, opts)
{
    var isCreating = opts && opts.create;

    if (!assetInfo) {
        //"Unable to parse the asset info file.",
        errors.report('UploadInvalidJson', req, res);
        return;
    }

    if (isCreating) {
        assetInfo.incoming = true;

        if (!assetInfo.file || assetInfo.id) {
            //"Unable to parse the asset info file.",
            errors.report('UploadInvalidJson', req, res);
            return;
        }
    } else {
        //we're updating
        if (req.params.assetId && !assetInfo.id) {
            assetInfo.id = utils.parseNumber(req.params.assetId);
        }
    }

    if (assetInfo.posted !== undefined &&
        typeof assetInfo.posted !== 'boolean') {
        assetInfo.posted = utils.parseBool(assetInfo.posted);
    }

    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            if (err) {
                errors.report(err.type, req, res, err);
                return;
            }
            if (isCreating) {
                createAsset(db, req, res, assetInfo);
            } else {
                createUtils.findAsset(
                    db, req, res, assetInfo, false,
                    function(err, db, req, res, assetInfo) {
                        if (err) {
                            errors.report('AssetMissing', req, res, err);
                            return;
                        }
                        //Can't edit a posted asset
                        if (assetInfo.posted) {
                            errors.report('AssetPosted', req, res, err);
                            return;
                        }
                        if (assetInfo.incoming) {
                            updateIncomingAsset(db, req, res, assetInfo);
                        } else {
                            updatePublishedAsset(db, req, res, assetInfo);
                        }
                    }
                );
            }
        });
}

module.exports.update = function(db, req, res) {
    createUtils.findAssetInfo(req, function(err, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err.message);
            return;
        }

        processInfo(assetInfo, db, req, res);
    });
};


module.exports.create = function(db, req, res) {
    createUtils.findAssetInfo(req, function(err, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err.message);
            return;
        }

        processInfo(assetInfo, db, req, res, {create : true});
    });
};

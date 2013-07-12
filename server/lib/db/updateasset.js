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
var createUtils = require('./createutils.js');
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
    addToJson(json.asset, assetInfo, 'license');
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

function addToStr(q, hash, value)
{
    if (hash[value] !== undefined && hash[value] !== null) {
        if (q.inserted) {
            q.insertStr += ", ";
            q.valuesStr += ", ";
        }
        q.insertStr += value;
        q.valuesStr += "'" + hash[value] + "'";
        ++q.inserted;
    }
}

function buildQueryString(assetInfo)
{
    var queryStr = "update incomingAssets set ";
    var q = {
        insertStr : "(",
        valuesStr : "(",
        inserted  : 0
    };

    addToStr(q, assetInfo, 'license');
    addToStr(q, assetInfo, 'baseprice');
    addToStr(q, assetInfo, 'name');
    addToStr(q, assetInfo, 'description');
    addToStr(q, assetInfo, 'version');
    addToStr(q, assetInfo, 'externpath');
    addToStr(q, assetInfo, 'file');
    addToStr(q, assetInfo, 'size');

    q.insertStr += ")";
    q.valuesStr += ")";

    queryStr += q.insertStr + " = " + q.valuesStr;
    queryStr += " where id = " + assetInfo.id;
    queryStr += " and";
    queryStr += " partner = " + assetInfo.partner;

    if (!q.inserted) {
        return null;
    }

    return queryStr;
}

function writeIncomingAsset(db, req, res, assetInfo, cb)
{
    var queryStr = buildQueryString(assetInfo);

    if (!queryStr) {
        cb(null, db, req, res, assetInfo);
        return;
    }

    db.query(queryStr, [], function(err, result) {
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
    var query = 'insert into assetTags (asset, tag) values ($1, $2);';
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
    var query = 'insert into assetPreviews (asset, path, mimetype, \
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
            "insert into incomingAssets (id, license, partner, baseprice, \
                                         name, description, version,  \
                                         versionts, externpath, file, \
                                         size, image, posted)\
                                         values ($1, $2, $3, $4, $5, $6, $7, \
                                                 $8, $9, $10, $11, $12, false)";

    db.query(
        incomingAssetQuery, [assetInfo.id, assetInfo.license,
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

function processInfo(assetInfo, db, req, res)
{
    if (!assetInfo) {
        //"Unable to parse the asset info file.",
        errors.report('UploadInvalidJson', req, res);
        return;
    }

    if (req.params.assetId && !assetInfo.id) {
        assetInfo.id = utils.parseNumber(req.params.assetId);
    }

    if (!assetInfo.id) {
        errors.report('UploadInvalidJson', req, res);
        return;
    }

    if (assetInfo.posted !== undefined && typeof assetInfo.posted !== 'boolean') {
        assetInfo.posted = utils.parseBool(assetInfo.posted);
    }

    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            if (err) {
                errors.report('PartnerInvalid', req, res, err);
                return;
            }
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
        });
}

module.exports = function(db, req, res) {
    createUtils.findAssetInfo(req, function(err, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err.message);
            return;
        }

        processInfo(assetInfo, db, req, res);
    });
};

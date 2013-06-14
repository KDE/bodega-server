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

function sendResponse(db, req, res, assetInfo)
{
    var json = utils.standardJson(req, true);

    json.asset = {
        id : assetInfo.id,
        name : assetInfo.name
    };
    res.send(json);
}

function assetHasTag(assetInfo, tagType)
{
    var keys = Object.keys(assetInfo.tags);
    var tagIdx = 0;
    var tagCount = keys.length;
    for (tagIdx = 0; tagIdx < tagCount; ++tagIdx) {
        var tagInfo = assetInfo.tags[tagIdx];
        if (tagInfo.type === tagType) {
            return true;
        }
    }
    return false;
}

function validateAssetInfo(db, req, res, assetInfo, cb)
{
    var e;
    var fields = ['license', 'partner',
                  'name', 'description',
                  'version', 'file', 'size',
                  'image'];
    var field;
    var i;
    for (i = 0; i < fields.length; ++i) {
        field = fields[i];
        if (typeof assetInfo[field] === 'undefined' ||
            assetInfo[field] === null) {
            e = errors.create('AssetInfoMissing',
                              'Asset is missing the ' + field +  ' field.');
            cb(e, db, req, res, assetInfo);
            return;
        }
    }

    cb(null, db, req, res, assetInfo);
}

function fetchTags(db, req, res, assetInfo, cb)
{
    var tagsQuery =
            "SELECT tagTypes.type, tags.title, a.tag, a.action \
    FROM incomingAssetTags a \
    JOIN tags ON (a.tag = tags.id) LEFT JOIN tagTypes ON \
    (tags.type = tagTypes.id) where a.asset = $1;";
    var e;

    var q = db.query(
        tagsQuery, [assetInfo.id],
        function(err, result) {
            var i;
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo);
                return;
            }
            assetInfo.tags = result.rows;
            cb(null, db, req, res, assetInfo);
        });
}

function validateTags(db, req, res, assetInfo, cb)
{
    var mandatoryTagsForAssetType = {
        "application" : ["author", "license"],
        "book" : ["author", "publisher"],
        "game" : ["author", "license"]
    };
    var keys = Object.keys(assetInfo.tags);
    var tagIdx = 0;
    var tagCount = keys.length;
    var assetType = null;
    var err, tagType;

    for (tagIdx = 0; tagIdx < tagCount; ++tagIdx) {
        var tagInfo = assetInfo.tags[tagIdx];
        if (tagInfo.type === "assetType") {
            assetType = tagInfo.title;
        }
    }

    if (!assetType) {
        err = errors.create('UploadMissingTag',
                            "Missing required tag 'assetType'");
        cb(err, db, req, res, assetInfo);
        return;
    }

    assetInfo.assetType = assetType;
    var requiredTags = mandatoryTagsForAssetType[assetType];

    if (!requiredTags) {
        err = errors.create('UploadMissingTag',
                            "Unrecognized assetType");
        cb(err, db, req, res, assetInfo);
        return;
    }

    for (tagIdx = 0; tagIdx < requiredTags.length; ++tagIdx) {
        tagType = requiredTags[tagIdx];
        if (!assetHasTag(assetInfo, tagType)) {
            err = errors.create('UploadMissingTag',
                                "Missing required tag: " + tagType);
            cb(err, db, req, res, assetInfo);
            return;
        }
    }

    cb(null, db, req, res, assetInfo);
}

function fetchPreviews(db, req, res, assetInfo, cb)
{
    var previewsQuery =
            "SELECT p.path, p.mimetype, p.type, p.subtype, p.action \
    FROM incomingAssetPreviews p where p.asset = $1;";
    var e;

    var q = db.query(
        previewsQuery, [assetInfo.id],
        function(err, result) {
            var i;
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo);
                return;
            }
            assetInfo.previews = result.rows;
            cb(null, db, req, res, assetInfo);
        });
}

function validatePreviews(db, req, res, assetInfo, cb)
{
    app.previewStore.canPublish(assetInfo, function(err) {
        cb(err, db, req, res, assetInfo);
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

function writeAsset(db, req, res, assetInfo, cb)
{
    var query;
    var fieldsStr = '(';
    var valuesStr = '(';
    var args  = [];
    var fields = ['license', 'partner', 'basePrice',
                  'name', 'description', 'version',
                  'file', 'image'];
    var field;
    var i;
    var idx = 1;


    if (!assetInfo.published) {
        args.push(assetInfo.id);
        fieldsStr += 'id, ';
        valuesStr += '$' + idx + ', ';
        ++idx;
    }

    for (i = 0; i < fields.length; ++i) {
        field = fields[i];
        if (typeof assetInfo[field] !== 'undefined' &&
            assetInfo[field] !== null) {
            fieldsStr += field;
            args.push(assetInfo[field]);
            valuesStr += "$" + idx;

            if (i !== (fields.length - 1)) {
                fieldsStr += ', ';
                valuesStr += ', ';
            }
            ++idx;
        }
    }

    if (args.length) {
        fieldsStr += ")";
        valuesStr += ")";
    } else {
        cb(null, db, req, res, assetInfo);
        return;
    }

    if (assetInfo.published) {
        query = "UPDATE assets set " + fieldsStr +
            " = " + valuesStr + " WHERE id = " + assetInfo.id;
    } else {
        query = "INSERT INTO assets " + fieldsStr +
            " VALUES " + valuesStr;
    }

    //console.log(args);
    //console.log("Query is : ");
    //console.log(query);

    db.query(query, args, function(err, result) {
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });

}

function deleteIncoming(db, req, res, assetInfo, cb)
{
    var query = 'delete from incomingAssets where id = $1;';
    db.query(query, [assetInfo.id], function(err, result) {
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });
}

function writeTag(db, req, res, assetInfo, tag, cb)
{
    var query = 'insert into assetTags (asset, tag) values ($1, $2);';
    var args = [tag.asset, tag.tag];

    db.query(query, args, function(err, result) {
        cb(err, db, req, res, assetInfo, tag);
    });
}

function writeTags(db, req, res, assetInfo, cb)
{
    async.each(assetInfo.tags, function(tag, callback) {
        writeTag(db, req, res, assetInfo, tag, callback);
    }, function(err) {
        cb(err, db, req, res, assetInfo);
    });
}

function deleteTags(db, req, res, assetInfo, cb)
{
    var query = 'delete from assetTags where asset=$1;';
    var args = [assetInfo.id];

    db.query(query, args, function(err, result) {
        cb(err, db, req, res, assetInfo);
    });
}

function writePreview(db, req, res, assetInfo, preview, cb)
{
    var query = 'insert into assetPreviews \
    (asset, path, mimetype, type, subtype) \
    values ($1, $2, $3, $4, $5);';
    var args = [preview.asset, preview.path, preview.mimetype,
                preview.type, preview.subtype];

    db.query(query, args, function(err, result) {
        cb(err, db, req, res, assetInfo);
    });
}

function writePreviews(db, req, res, assetInfo, cb)
{
    async.each(assetInfo.previews, function(preview, callback) {
        writePreview(db, req, res, assetInfo, preview, callback);
    }, function(err) {
        cb(err, db, req, res, assetInfo);
    });
}

function deletePreviews(db, req, res, assetInfo, cb)
{
    var query = 'delete from assetPreviews where asset=$1;';
    var args = [assetInfo.id];

    db.query(query, args, function(err, result) {
        cb(err, db, req, res, assetInfo);
    });
}

function publishPreviews(db, req, res, assetInfo, cb)
{
    app.previewStore.publish(assetInfo, function(err) {
        cb(null, db, req, res, assetInfo);
    });
}

function publishAssetFile(db, req, res, assetInfo, cb)
{
    app.assetStore.publish(assetInfo, function(err) {
        cb(null, db, req, res, assetInfo);
    });
}

function endTransaction(db, req, res, assetInfo, cb)
{
    var query = "END;";
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

function publishAsset(db, req, res, assetInfo)
{
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo);
    }];

    // fetch tags
    funcs.push(fetchTags);
    // validateTags
    funcs.push(validateTags);

    // fetch previews
    funcs.push(fetchPreviews);
    // validatePreviews
    funcs.push(validatePreviews);

    // validate asset info
    funcs.push(validateAssetInfo);

    //begin transaction
    funcs.push(beginTransaction);
    //  store asset in db
    funcs.push(writeAsset);
    //  delete old tags from the db
    funcs.push(deleteTags);
    //  store tags in db
    funcs.push(writeTags);
    //  delete old previews from the db
    funcs.push(deletePreviews);
    //  store previews in db
    funcs.push(writePreviews);
    //  publish previews
    funcs.push(publishPreviews);
    //  publish asset
    funcs.push(publishAssetFile);
    //  delete from the incoming
    funcs.push(deleteIncoming);
    //end transaction
    funcs.push(endTransaction);

    async.waterfall(funcs, function(err, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }
        sendResponse(db, req, res, assetInfo);
    });
}

module.exports = function(db, req, res) {
    var assetInfo = {};

    assetInfo.id = utils.parseNumber(req.params.assetId);
    if (!assetInfo.id) {
        errors.report('MissingParameters', req, res);
        return;
    }
    assetInfo.partner = req.query.partner;

    createUtils.isValidator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            if (err) {
                errors.report('InvalidPartner', req, res, err);
                return;
            }
            createUtils.findPostedAsset(
                db, req, res, assetInfo, true,
                function(err, db, req, res, assetInfo) {
                    if (err) {
                        errors.report('AssetMissing', req, res);
                        return;
                    }
                    if (!assetInfo.incoming) {
                        errors.report('AssetMissing', req, res);
                        return;
                    }
                    publishAsset(db, req, res, assetInfo);
                }
            );
        });
};

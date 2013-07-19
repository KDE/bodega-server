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
var assetRules = require('../../assetRules.js');
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
        "SELECT tagTypes.type, tags.title, a.tag \
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
    var requiredTags = assetRules.mandatoryTags[assetType];

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
            "SELECT p.path, p.mimetype, p.type, p.subtype \
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

function generateIcons(db, req, res, assetInfo, cb)
{
    if (assetInfo.assetType === 'book' ||
        assetInfo.assetType === 'album') {
        app.previewStore.generateCoverIcons(assetInfo, function(err) {
            cb(err, db, req, res, assetInfo);
        });
    } else {
        app.previewStore.generateScaledIcons(assetInfo, function(err) {
            cb(err, db, req, res, assetInfo);
        });
    }
}

function setPosted(db, req, res, assetInfo, cb)
{
    var query = 'UPDATE incomingAssets set posted=true;';

    //console.log(args);
    //console.log("Query is : ");
    //console.log(query);

    db.query(query, [], function(err, result) {
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        cb(null, db, req, res, assetInfo);
    });
}


function postAsset(db, req, res, assetInfo)
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
    // generate icons from covers/larger icons
    funcs.push(generateIcons);
    // validatePreviews
    funcs.push(validatePreviews);

    // validate asset info
    funcs.push(validateAssetInfo);

    // mark the asset as posted
    funcs.push(setPosted);

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

    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            if (err) {
                errors.report('InvalidPartner', req, res, err);
                return;
            }
            createUtils.findAsset(
                db, req, res, assetInfo, true,
                function(err, db, req, res, assetInfo) {
                    if (err) {
                        errors.report('AssetMissing', req, res);
                        return;
                    }
                    if (!assetInfo.incoming || assetInfo.published) {
                        errors.report('AssetMissing', req, res);
                        return;
                    }
                    postAsset(db, req, res, assetInfo);
                }
            );
        });
};

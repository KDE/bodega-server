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
        assetInfo.transaction = true;
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
        fieldsStr += 'id';
        valuesStr += '$' + idx;
        ++idx;
    }

    var firstField = true;

    for (i = 0; i < fields.length; ++i) {
        field = fields[i];
        if (typeof assetInfo[field] !== 'undefined' &&
            assetInfo[field] !== null) {

            if (!firstField) {
                fieldsStr += ', ';
                valuesStr += ', ';
            }

            fieldsStr += field;
            args.push(assetInfo[field]);
            valuesStr += "$" + idx;
            firstField = false;
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
    var args = [assetInfo.id, tag.tag];

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
    var args = [assetInfo.id, preview.path, preview.mimetype,
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
    var query = "commit;";
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
}

function approveAsset(db, req, res, assetInfo)
{
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo);
    }];

    // fetch tags
    funcs.push(fetchTags);
    // fetch previews
    funcs.push(fetchPreviews);

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
            if (assetInfo.transaction) {
                db.query("rollback", [], function() {
                    errors.report(err.name, req, res, err);
                });
            } else {
                errors.report(err.name, req, res, err);
            }
            return;
        }
        sendResponse(db, req, res, assetInfo);
    });
}

function findPublisher(db, req, res, assetInfo, cb)
{
    var query = "select p.supportemail,ia.name from partners p inner join incomingassets ia on p.id=ia.partner where ia.id=$1;";
    var e;

    db.query(query, [assetInfo.id], function(err, result) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.name = result.rows[0].name;
        assetInfo.supportEmail = result.rows[0].supportemail;
        cb(null, db, req, res, assetInfo);
    });
}

function sendRejectionEmail(db, req, res, assetInfo, cb)
{
    db.query("INSERT INTO emailQueue (data, template) \
              VALUES (hstore(Array[['assetid', $1], ['assetname', $2], ['reason', $3], ['email', $4]]), 'partner_distributor_assetRejection')",
             [assetInfo.id, assetInfo.name, assetInfo.rejectionReason, assetInfo.supportemail],
             function(err, result) {
                 if (err) {
                     errors.report('Database', req, res, err);
                 }

                 cb(err, db, req, res, assetInfo);
             });
}

function unpostAsset(db, req, res, assetInfo, cb)
{
    var query = 'UPDATE incomingAssets set posted=false where id=$1;';

    //console.log(args);
    //console.log("Query is : ");
    //console.log(query);

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

function rejectAsset(db, req, res, assetInfo)
{
    var funcs = [];
    var reason = req.body.reason;

    if (!reason) {
        errors.report('MissingParameters', req, res);
        return;
    }

    assetInfo.rejectionReason = reason;
    funcs.push(function(cb) {
        cb(null, db, req, res, assetInfo);
    });

    // find publishers email
    funcs.push(findPublisher);
    // inform other admins about rejection
    funcs.push(sendRejectionEmail);
    // remove the posted flag
    funcs.push(unpostAsset);

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
    var approve, reject;

    assetInfo.id = utils.parseNumber(req.params.assetId);
    if (!assetInfo.id) {
        errors.report('MissingParameters', req, res);
        return;
    }

    approve = utils.parseBool(req.query.approve);
    reject  = utils.parseBool(req.query.reject);

    if (!approve && !reject) {
        errors.report('MissingParameters', req, res);
        return;
    }

    if (approve && reject) {
        errors.report('TooManyParameters', req, res);
        return;
    }

    createUtils.isBodegaManager(db, req, res, function(err, db, req, res) {
        if (err) {
            errors.report('PartnerInvalid', req, res, err);
            return;
        }
        createUtils.findPostedAsset(
            db, req, res, assetInfo, true,
            function(err, db, req, res, assetInfo) {
                if (err) {
                    errors.report(err.name, req, res, err);
                    return;
                }

                if (!assetInfo.incoming) {
                    errors.report('AssetMissing', req, res);
                    return;
                }

                if (approve) {
                    approveAsset(db, req, res, assetInfo);
                } else if (reject) {
                    rejectAsset(db, req, res, assetInfo);
                }
            }
        );
    });
};

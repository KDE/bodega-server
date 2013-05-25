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

var async = require('async');
var errors = require('../errors.js');
var path = require('path');


function associateTag(db, req, res, assetInfo, tagInfo, tagIdx, tagCount, cb)
{
    var tagQuery =
            'insert into incomingAssetTags (asset, tag) values ($1, $2);';
    var atEnd = (tagIdx === (tagCount - 1));
    var e;
    db.query(
        tagQuery, [assetInfo.id, tagInfo.tagId],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo);
                return;
            }
            //process next tag
            ++tagIdx;
            cb(null, db, req, res, assetInfo,
               tagIdx, tagCount);
        });
}

function recordTag(db, req, res, assetInfo, tagInfo, tagIdx, tagCount, cb)
{
    var insertTagQuery =
            'insert into tags (partner, type, title) values ($1, $2, $3) returning id;';
    var e;
    db.query(
        insertTagQuery, [assetInfo.partnerId, tagInfo.typeId, tagInfo.title],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo, tagIdx, tagCount);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.tagId = result.rows[0].id;
                associateTag(db, req, res, assetInfo,
                             tagInfo, tagIdx, tagCount, cb);
            } else {
                e = errors.create(
                    'NoMatch',
                    "Tag '" + tagInfo.type + "'doesn't exist!");
                cb(e, db, req, res, assetInfo, tagIdx, tagCount);
                return;
            }
        });
}


function findTag(db, req, res, assetInfo, tagInfo, tagIdx, tagCount, cb)
{
    var findTagQuery =
            'select id from tags where type = $1 and title = $2;';
    var e;
    db.query(
        findTagQuery, [assetInfo.partnerId, tagInfo.typeId, tagInfo.title],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo, tagIdx, tagCount);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.tagId = result.rows[0].id;
                associateTag(db, req, res, assetInfo,
                             tagInfo, tagIdx, tagCount, cb);
            } else {
                e = errors.create(
                    'NoMatch',
                    "Tag '" + tagInfo.type + "'doesn't exist!");
                cb(e, db, req, res, assetInfo, tagIdx, tagCount);
                return;
            }
        });
}


function setupTag(db, req, res, assetInfo, tagIdx, tagCount, cb)
{
    var tagInfo = assetInfo.tags[tagIdx];
    var tagIdQuery =
            "select id from tagtypes t where t.type=$1;";
    var e;
    db.query(
        tagIdQuery, [tagInfo.type],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo, tagIdx, tagCount);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.typeId = result.rows[0].id;
                recordTag(db, req, res, assetInfo, tagInfo,
                          tagIdx, tagCount, cb);
            } else {
                e = errors.create(
                    'NoMatch',
                    "Tag '" + tagInfo.type + "'doesn't exist!");
                cb(e, db, req, res, assetInfo, tagIdx, tagCount);
                return;
            }
        }
    );
}

module.exports.setupTags = function(db, req, res, assetInfo, fn)
{
    var keys = Object.keys(assetInfo.tags);
    var tagIdx = 0;
    var tagCount = keys.length;
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo, 0, tagCount);
    }];

    for (tagIdx = 0; tagIdx < tagCount; ++tagIdx) {
        funcs.push(setupTag);
    }

    async.waterfall(
        funcs, function(err, db, req, res, assetInfo, tagIdx, tagCount) {
            //console.log(err);
            fn(err, db, req, res, assetInfo);
        });
};

function recordPreview(db, req, res, assetInfo, previewPath,
                       previewIdx, previewCount, cb)
{
    var atEnd = (previewIdx === (previewCount - 1));
    var newPreviewQuery = 'insert into incomingAssetPreviews (asset, path) values ($1, $2)';
    var e;
    db.query(newPreviewQuery,
             [assetInfo.id, previewPath],
             function(err, result) {
                 if (err) {
                     e = errors.create('Database', err.message);
                     cb(e, db, req, res, assetInfo, previewIdx, previewCount);
                     return;
                 }
                 ++previewIdx;
                 cb(null, db, req, res, assetInfo,
                    previewIdx, previewCount);
             });
}

/**
 * setupPreview is recursive through recordPreview because we want
 * to make sure that the error stops the entire chain. with a for
 * loop that would be impossible because each iteration of the for 
 * loop would invoke an asynchronous function, essentially making
 * them all run in parallel.
 */
function setupPreview(db, req, res, assetInfo, previewIdx, previewCount, cb)
{
    var keys = Object.keys(assetInfo.previews);
    var previewInfo = assetInfo.previews[previewIdx];
    var preview = req.files[previewInfo.file];
    var e;

    if (!preview || !previewInfo) {
        preview = previewInfo ? previewInfo.file : previewIdx;
        e = errors.create('UploadPreviewError',
                          'Preview ' + preview + ' is missing.');
        //console.log("error due to bad rename?");
        cb(e, db, req, res, assetInfo, previewIdx, previewCount);
        return;
    }

    var filename = path.basename(preview.name);
    app.assetStore.upload(
        preview.path, assetInfo.id, filename,
        function(err, result) {
            if (err) {
                e = errors.create('UploadFailed', err.message);
                //console.log("error due to bad rename?");
                cb(e, db, req, res, assetInfo, previewIdx, previewCount);
                return;
            }
            recordPreview(db, req, res, assetInfo, result.path,
                          previewIdx, previewCount, cb);
        });
}

module.exports.setupPreviews = function(db, req, res, assetInfo, fn)
{
    var keys = Object.keys(assetInfo.previews);
    var previewIdx = 0;
    var previewCount = keys.length;
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo, 0, previewCount);
    }];

    for (previewIdx = 0; previewIdx < previewCount; ++previewIdx) {
        funcs.push(setupPreview);
    }

    async.waterfall(
        funcs,
        function(err, db, req, res, assetInfo, previewIdx, previewCount) {
            fn(err, db, req, res, assetInfo);
        });
};

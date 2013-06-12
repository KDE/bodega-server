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
        insertTagQuery, [assetInfo.partner, tagInfo.typeId, tagInfo.title],
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
        findTagQuery, [assetInfo.partner, tagInfo.typeId, tagInfo.title],
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
    var previewInfo = assetInfo.previews[previewIdx];
    var newPreviewQuery = 'insert into incomingAssetPreviews (asset, path, mimetype, type, subtype) values ($1, $2, $3, $4, $5)';
    var e;

    db.query(newPreviewQuery,
             [assetInfo.id, previewPath, previewInfo.mimetype, previewInfo.type, previewInfo.subtype],
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
    var e;
    var previewPath;

    if (!previewInfo) {
        e = errors.create('UploadPreviewError',
                          'Preview ' + previewIdx + ' is missing.');
        //console.log("error due to bad rename?");
        cb(e, db, req, res, assetInfo, previewIdx, previewCount);
        return;
    }

    if (previewInfo.type === 'icon') {
        if (!assetInfo.image) {
            assetInfo.image =
                app.previewStore.previewRelativePath(assetInfo, previewInfo);
        }
    }

    previewPath = app.previewStore.previewRelativePath(assetInfo,
                                                       previewInfo);
    recordPreview(db, req, res, assetInfo, previewPath,
                  previewIdx, previewCount, cb);
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

module.exports.bindPreviewsToFiles = function(assetInfo, files, fn)
{
    var i;
    var preview;
    var e;
    var file;

    if (!assetInfo.previews || !assetInfo.previews.length) {
        fn(null);
        return;
    }
    if (!files) {
        e = errors.create('PreviewFileMissing',
                          'All preview files are missing!');
        fn(e);
        return;
    }

    for (i = 0; i < assetInfo.previews.length; ++i) {
        preview = assetInfo.previews[i];
        file = files[preview.file];

        if (!file) {
            e = errors.create('PreviewFileMissing',
                              'File ' + preview.file + ' is missing');
            fn(e);
            return;
        }
        //console.log("Binding " + preview.file + " to " + file.path);
        //console.log("Name = " + file.name);
        //console.log("Size = " + file.size);
        preview.file = file.path;
        preview.name = file.name;
        if (!preview.mimetype) {
            preview.mimetype = file.type;
        }
    }
    fn(null);
};

module.exports.isContentCreator = function(db, req, res, assetInfo, fn)
{
    //console.log("checking " + assetInfo.partner + ' ' + req.session.user.id);
    var partner = assetInfo.partner;
    var e;
    if (!partner) {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Content Creator';",
                 [req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         e = errors.create('PartnerInvalid',
                                           err ? err.message : '');
                         fn(e, db, req, res, assetInfo);
                         return;
                     }

                     assetInfo.partner = result.rows[0].partner;
                     fn(null, db, req, res, assetInfo);
                 });
    } else {
        //console.log("checking up on partner");
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Content Creator';",
                 [partner, req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         e = errors.create('PartnerInvalid',
                                           err ? err.message : '');
                         fn(e, db, req, res, assetInfo);
                         return;
                     }

                     //console.log("going to store the asset now .. " + partner + " " + result.rows.length);
                     fn(null, db, req, res, assetInfo);
                 });
    }
};

function mergeObjects(a, b)
{
    var key;
    if (a && b) {
        for (key in b) {
            a[key] = b[key];
        }
    }
    return a;
}

function findIncomingAsset(db, req, res, assetInfo, fillIn, fn)
{
    var q = "select * from incomingAssets where id = $1 and partner = $2;";
    var e;
    db.query(
        q, [assetInfo.id, assetInfo.partner],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                fn(e, db, req, res, assetInfo);
                return;
            }
            if (!result.rows || result.rows.length !== 1) {
                if (!assetInfo.published) {
                    e = errors.create('AssetMissing',
                                      'Unable to find the update asset ' +
                                      assetInfo.id);
                    fn(e, db, req, res, assetInfo);
                } else {
                    fn(null, db, req, res, assetInfo);
                }
            } else {
                if (fillIn) {
                    assetInfo = mergeObjects(assetInfo, result.rows[0]);
                }
                assetInfo.incoming = true;
                fn(null, db, req, res, assetInfo);
            }
        }
    );
}


function findPublishedAsset(db, req, res, assetInfo, fillIn, fn)
{
    var q = "select * from assets where id = $1 and partner = $2;";
    var e;
    db.query(
        q, [assetInfo.id, assetInfo.partner],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                fn(e, db, req, res, assetInfo);
                return;
            }
            if (!result.rows || result.rows.length !== 1) {
                findIncomingAsset(db, req, res, assetInfo, fillIn, fn);
                return;
            } else {
                if (fillIn) {
                    assetInfo = result.rows[0];
                }
                assetInfo.published = true;
                findIncomingAsset(db, req, res, assetInfo, fillIn, fn);
            }
        }
    );
}

module.exports.findAsset = function(db, req, res, assetInfo, fillIn, fn)
{
    //console.log("checking " + assetInfo.partner + ' ' + req.session.user.id);
    var partner = assetInfo.partner;
    var e;

    if (!assetInfo || !assetInfo.id || !assetInfo.partner) {
        e = errors.create('MissingParameters',
                          'Asset info missing asset or partner id.');
        fn(e, db, req, res, assetInfo);
        return;
    }

    assetInfo.incoming  = false;
    assetInfo.published = false;
    findPublishedAsset(db, req, res, assetInfo, fillIn, fn);
};

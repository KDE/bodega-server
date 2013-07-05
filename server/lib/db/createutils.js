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

function associateTag(db, req, res, assetInfo, tagInfo, cb)
{
    var tagQuery =
            'insert into incomingAssetTags (asset, tag) select $1 as asset, $2 as tag where $2 not in (select asset from incomingAssetTags where asset = $1);';

    var e;
    db.query(
        tagQuery, [assetInfo.id, tagInfo.tagId],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo, tagInfo);
                return;
            }
            //process next tag
            cb(null, db, req, res, assetInfo, tagInfo);
        });
}

function recordTag(db, req, res, assetInfo, tagInfo, cb)
{
    var insertTagQuery =
            'insert into tags (partner, type, title) values ($1, $2, $3) returning id;';
    var e;
    db.query(
        insertTagQuery, [assetInfo.partner, tagInfo.typeId, tagInfo.title],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo, tagInfo);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.tagId = result.rows[0].id;
                associateTag(db, req, res, assetInfo,
                             tagInfo, cb);
            } else {
                e = errors.create(
                    'NoMatch',
                    "Tag '" + tagInfo.type + "'doesn't exist!");
                cb(e, db, req, res, assetInfo, tagInfo);
                return;
            }
        });
}

function findTag(db, req, res, assetInfo, tagInfo, cb)
{
    var findTagQuery =
            'select id from tags where partner = $1 and type = $2 and title = $3;';
    var e;
    db.query(
        findTagQuery, [assetInfo.partner, tagInfo.typeId, tagInfo.title],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo, tagInfo);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.tagId = result.rows[0].id;
                associateTag(db, req, res, assetInfo,
                             tagInfo, cb);
            } else {
                recordTag(db, req, res, assetInfo,
                          tagInfo, cb);
            }
        });
}

function setupTag(db, req, res, assetInfo, tagInfo, cb)
{
    var tagIdQuery =
            "select id from tagtypes t where t.type=$1;";
    var e;

    db.query(
        tagIdQuery, [tagInfo.type],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, assetInfo, tagInfo);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.typeId = result.rows[0].id;
                findTag(db, req, res, assetInfo, tagInfo, cb);
            } else {
                e = errors.create(
                    'NoMatch',
                    "Tag '" + tagInfo.type + "'doesn't exist!");
                cb(e, db, req, res, assetInfo, tagInfo);
                return;
            }
        }
    );
}

module.exports.setupTags = function(db, req, res, assetInfo, fn)
{
    var params = [];
    params.push(assetInfo.id);

    var query = "delete from incomingAssetTags where asset = $1 ";

    if (assetInfo.tags.length > 0) {
        var placeHolders = [];
        for (var i = 0; i < assetInfo.tags.length; ++i) {
            placeHolders.push('$'+ (i + 2));
            params.push(assetInfo.tags[i].id);
        }

        query += " and tag not in (" + placeHolders.join(',') + ")";
    }


    db.query(
        query,
        params,
        function(err, result) {
            if (err) {
                fn(err, db, req, res, assetInfo);
                return;
            }
        });

    async.each(assetInfo.tags, function(tag, callback) {
        setupTag(db, req, res, assetInfo, tag, callback);
    }, function(err) {
        fn(err, db, req, res, assetInfo);
    });
};

function recordPreview(db, req, res, assetInfo, previewPath,
                       previewInfo, cb)
{
    var newPreviewQuery = 'insert into incomingAssetPreviews (asset, path, mimetype, type, subtype) values ($1, $2, $3, $4, $5)';
    var e;

    db.query(newPreviewQuery,
             [assetInfo.id, previewPath, previewInfo.mimetype, previewInfo.type, previewInfo.subtype],
             function(err, result) {
                 if (err) {
                     e = errors.create('Database', err.message);
                     cb(e, db, req, res, assetInfo, previewInfo);
                     return;
                 }
                 cb(null, db, req, res, assetInfo, previewInfo);
             });
}

function setupPreview(db, req, res, assetInfo, previewInfo, cb)
{
    var e;
    var previewPath;

    if (!previewInfo) {
        e = errors.create('UploadPreviewError',
                          'Preview is missing.');
        //console.log("error due to bad rename?");
        cb(e, db, req, res, assetInfo, previewInfo);
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
                  previewInfo, cb);
}

function recordPreviews(db, req, res, assetInfo, fn)
{
    async.each(assetInfo.previews, function(preview, callback) {
        setupPreview(db, req, res, assetInfo, preview, callback);
    }, function(err) {
        fn(err, db, req, res, assetInfo);
    });
}

function bindPreviewsToFiles(assetInfo, files, fn)
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
}

module.exports.bindPreviewsToFiles = bindPreviewsToFiles;

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


module.exports.isValidator = function(db, req, res, assetInfo, fn)
{
    //console.log("checking " + assetInfo.partner + ' ' + req.session.user.id);
    var partner = assetInfo.partner;
    var e;
    if (!partner) {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Validator';",
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
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Validator';",
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
                e = errors.create('AssetMissing',
                                  'Unable to find the update asset ' +
                                  assetInfo.id);
                fn(e, db, req, res, assetInfo);
                return;
            } else {
                if (fillIn) {
                    assetInfo = result.rows[0];
                } else {
                    assetInfo.publishedAsset = result.rows[0];
                }
                assetInfo.published = true;
                fn(null, db, req, res, assetInfo);
            }
        }
    );
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
                findPublishedAsset(db, req, res, assetInfo, fillIn, fn);
            } else {
                if (fillIn) {
                    assetInfo = result.rows[0];
                }
                assetInfo.incoming = true;
                fn(null, db, req, res, assetInfo);
            }
        }
    );
}

function findPostedAsset(db, req, res, assetInfo, fn)
{
    var q = "select * from incomingAssets where id = $1 and posted = true;";
    var e;
    db.query(
        q, [assetInfo.id],
        function(err, result) {
            if (err) {
                e = errors.create('Database', err.message);
                fn(e, db, req, res, assetInfo);
                return;
            }
            if (!result.rows || result.rows.length !== 1) {
                e = errors.create('AssetMissing',
                                  'Unable to find the update asset ' +
                                  assetInfo.id);
                fn(e, db, req, res, assetInfo);
                return;
            } else {
                assetInfo = result.rows[0];
                assetInfo.incoming = true;
                fn(null, db, req, res, assetInfo);
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
    findIncomingAsset(db, req, res, assetInfo, fillIn, fn);
};


module.exports.findPostedAsset = function(db, req, res, assetInfo, fillIn, fn)
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
    assetInfo.posted = false;
    findPostedAsset(db, req, res, assetInfo, fn);
};


module.exports.setupPreviews = function(db, req, res, assetInfo, fn)
{
    bindPreviewsToFiles(assetInfo, req.files, function(err) {
        if (err) {
            fn(err);
            return;
        }
        app.previewStore.upload(assetInfo, function(err) {
            if (err) {
                fn(err);
                return;
            }
            recordPreviews(db, req, res, assetInfo, fn);
        });
    });
};

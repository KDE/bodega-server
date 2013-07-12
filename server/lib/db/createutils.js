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
var path = require('path');

var errors = require('../errors.js');
var utils = require('../utils.js');
var fs = require('fs');

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

module.exports.setupTags = function(db, req, res, assetInfo, fn)
{
    if (!Array.isArray(assetInfo.tags) ||  assetInfo.tags.length < 1) {
        //FIXME: should delete all tags
        return;
    }

    /* first we create all the tags that are missing and set them to be owned by
       requesting partner; this involves a monster query that looks like this:

    insert into tags (type, title, partner)
        select tt.id, pm.author, 1002 from
        (select *, 1002 from (values ('author', 'Zack Rusin'), ('author', 'Aaron Seigo'), ('assetType', 'book')) as tmp
             except select y.type, t.title, 1002 as key from tags t left join tagtypes y on (t.type = y.id)
                         where ((y.type = 'assetType' and t.title = 'book') or
                                (y.type = 'author' and t.title = 'Zack Rusin')) and
                               (t.partner is null or t.partner = 1002)) as pm (type, author)
        left join tagtypes tt on (tt.type = pm.type);
    */
    // $1 is the partner id
    var params = [ utils.parseNumber(assetInfo.partner) ];
    // the list of values: ('tag type', 'tag name')
    var tagValueList = [];
    // the where clause for the extant tags: (y.type = 'tag type' and t.title = 'tag name')
    var existingTagWhere = [];
    // the list of values used at insertion: (tt.type = 'tag type' and title = 'tag name')
    var insertWhere = [];

    assetInfo.tags.forEach(function(tag) {
        if (typeof tag !== 'object' || !tag.type || !tag.title) {
            return;
        }

        tagValueList.push("($" + (params.length + 1) + ", $" + (params.length  + 2) + ")");
        existingTagWhere.push("(y.type = $"  + (params.length + 1) + " and title = $" + (params.length  + 2) + ")");
        insertWhere.push("(tt.type = $" + (params.length + 1) + " and title = $" + (params.length + 2) + ")");
        params.push(tag.type);
        params.push(tag.title);
    });

    //FIXME: check that params has anything in it
    var createMissingSql = "insert into tags (type, title, partner) \
                            select tt.id, pm.author, $1::int from (select *, $1::int from (values " +
                            tagValueList.join(', ') + ") as tmp \
                            except select y.type, t.title, $1::int as key from tags t \
                                left join tagtypes y on (t.type = y.id) where (" +
                            existingTagWhere.join(' or ') +
                            ") and (t.partner is null or t.partner = $1)) as pm (type, author, asset) \
                             left join tagtypes tt on (tt.type = pm.type)";


    // at this point we are guaranteed to have all the tags we need in the database
    // well, assuming nobody has deleted them on us between the previous query and this one :/

    /* so now we insert the appropriate tags into the table; we want to use tags owned by the partner
       over global tags. we do this using another monster query.

       insert into assetTags (asset, tag)
       select 1000, t.id from (select max(partner) as partner, tags.type, title from tags
                         left join tagtypes tt on (tags.type = tt.id)
                         where (tt.type = 'author' and title = 'Aaron Seigo') or
                                (tt.type = 'author' and title = 'Zack Rusin')
                    group by tags.type, title) as finder
                left join tags t on (CASE WHEN finder.partner is null
                                          THEN t.partner IS NULL
                                          ELSE finder.partner = t.partner END
                                     and (t.partner = 1002  or t.partner is null)
                                     and finder.type = t.type and finder.title = t.title);
    */
    var deleteSql = "delete from incomingAssetTags where asset = $2 and tag in \
                     (select at.tag from assettags at left join tags t on \
                     (at.tag = t.id and (t.partner = $1 or t.partner is null)) where at.asset = $2)";

    var insertSql = "insert into incomingAssetTags (asset, tag) select $" +
                     (params.length + 1) +
                     ", t.id from (select max(partner) as partner, tags.type, title from tags \
                     left join tagtypes tt on (tags.type = tt.id) where (";
    insertSql += insertWhere.join(' or ');
    insertSql += ") group by tags.type, title) as finder \
                  left join tags t on (CASE WHEN finder.partner is null \
                                       THEN t.partner IS NULL \
                                       ELSE finder.partner = t.partner END \
                                   and (t.partner = $1 or t.partner is null) \
                                   and finder.type = t.type and finder.title = t.title)";

    utils.wrapInTransaction(
    [
    function(db, req, res, createMissingSql, deleteSql, insertSql, params, cb)
    {
        //console.log("Creation: " + createMissingSql);
        //console.log("Params: " + JSON.stringify(params));
        db.query(createMissingSql, params,
                 function(err) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null, db, req, res, deleteSql, insertSql, params);
                 });
    },
    function(db, req, res, deleteSql, insertSql, params, cb)
    {
        //console.log("Deleting: " + deleteSql);
        db.query(deleteSql, [ assetInfo.partner, assetInfo.id ],
                 function(err) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null, db, req, res, insertSql, params);
                 });
    },
    function(db, req, res,  insertSql, params, cb)
    {
        //console.log("Insertion: " + insertSql);
        params.push(assetInfo.id);
        db.query(insertSql, params,
                 function(err) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null);
                 });
    }
    ],
    db, req, res, createMissingSql, deleteSql, insertSql, params,
    function(err) {
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

module.exports.findAssetInfo = function(req, cb) {
    var e;

    if (req.query.info) {
        cb(null, req.query.info);
    } else if (req.body.info) {
        cb(null, req.body.info);
    } else if (req.files && req.files.info) {
        fs.readFile(req.files.info.path, function (err, data) {
            var assetInfo;
            if (err) {
                e = errors.create('UploadInvalidJson', err.message);
                cb(e);
                return;
            }
            try {
                assetInfo = JSON.parse(data);
            } catch (err) {
                //JSON parser failed
                assetInfo = null;
                e = errors.create('UploadInvalidJson', err.message);
                return cb(e, null);
            }
            cb(null, assetInfo);
            return;
        });
    } else {
        //"The asset info file is missing.",
        e = errors.create('MissingParameters');
        cb(e);
        return;
    }
};

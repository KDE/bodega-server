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

var utils = require('../utils.js');
var errors = require('../errors.js');
var fs = require('fs');
var path = require('path');

function sendResponse(db, req, res, assetInfo)
{
    var json = {
        device : req.session.user.device,
        authStatus : req.session.authorized,
        points : req.session.user.points,
        asset : {
            id : assetInfo.id,
            name : assetInfo.name
        }
    };
    res.send(json);
}

function deleteUpload(db, req, res, path)
{
    app.assetStore.remove(path, function() {});
}

function reportError(db, req, res, assetInfo,
                     errorType, error)
{
    var rmQuery =
            'DELETE FROM incomingAssets WHERE id = $1;';

    /* we don't care about errors at this point
     * because if we're here an error already
     * occured. We just want to cleanup garbage data and
     * propagate an error as a response. */
    db.query(rmQuery, [assetInfo.id],
             function(err, result){});
    deleteUpload(db, req, res, assetInfo.incomingPath);
    
    errors.report(errorType, req, res, error);
}

function associateTag(db, req, res, assetInfo, tagInfo, tagIdx, tagCount)
{
    var tagQuery =
            'insert into incomingAssetTags (asset, tag) values ($1, $2);';
    var atEnd = (tagIdx == (tagCount - 1));
    db.query(
        tagQuery, [assetInfo.id, tagInfo.tagId],
        function(err, result) {
            if (err) {
                reportError(db, req, res, assetInfo, 'Database', err);
                return;
            }
            if (atEnd) {
                sendResponse(db, req, res, assetInfo);
            } else {
                //process next tag
                ++tagIdx;
                setupTag(db, req, res, assetInfo,
                         tagIdx, tagCount);
            }
        });
}

function recordTag(db, req, res, assetInfo, tagInfo, tagIdx, tagCount)
{
    var tagQuery =
            'insert into tags (partner, type, title) values ($1, $2, $3) returning id;';
    db.query(
        tagQuery, [assetInfo.partnerId, tagInfo.typeId, tagInfo.title],
        function(err, result) {
            if (err) {
                reportError(db, req, res, assetInfo, 'Database', err);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.tagId = result.rows[0].id;
                associateTag(db, req, res, assetInfo,
                             tagInfo, tagIdx, tagCount);
            } else {
                var e = new Error("Tag '" + tagInfo.type + "'doesn't exist!");
                reportError(db, req, res, assetInfo,
                            'NoMatch', e);
                return;
            }
        });
}

function setupTag(db, req, res, assetInfo, tagIdx, tagCount)
{
    var tagInfo = assetInfo.tags[tagIdx];
    var tagIdQuery =
            "select id from tagtypes t where t.type=$1;";
    db.query(
        tagIdQuery, [tagInfo.type],
        function(err, result) {
            if (err) {
                reportError(db, req, res, assetInfo,
                            'Database', err);
                return;
            }
            if (result && result.rows.length > 0) {
                tagInfo.typeId = result.rows[0].id;
                recordTag(db, req, res, assetInfo, tagInfo, tagIdx, tagCount);
            } else {
                var e = new Error("Tag '" + tagInfo.type + "'doesn't exist!");
                reportError(db, req, res, assetInfo,
                            'NoMatch', e);
                return;
            }
        }
    );

}

function setupTags(db, req, res, assetInfo)
{
    var i;
    if (assetInfo.tags) {
        var keys = Object.keys(assetInfo.tags);
        var tagIdx = 0;
        var tagCount = keys.length;
        setupTag(db, req, res, assetInfo, tagIdx, tagCount);
    }
}


function recordPreview(db, req, res, assetInfo, previewPath,
                       previewIdx, previewCount)
{
    var atEnd = (previewIdx == (previewCount - 1));
    var newPreviewQuery = 'insert into incomingAssetPreviews (asset, path) values ($1, $2)';
    db.query(newPreviewQuery,
             [assetInfo.id, previewPath],
             function(err, result) {
                 if (err) {
                     reportError(db, req, res, assetInfo,
                                 'Database', err);
                     return;
                 }
                 if (atEnd) {
                     setupTags(db, req, res, assetInfo);
                 } else {
                     ++previewIdx;
                     setupPreview(db, req, res, assetInfo,
                                  previewIdx, previewCount);
                 }
             });
}

/**
 * setupPreview is recursive through recordPreview because we want
 * to make sure that the error stops the entire chain. with a for
 * loop that would be impossible because each iteration of the for 
 * loop would invoke an asynchronous function, essentially making
 * them all run in parallel.
 */
function setupPreview(db, req, res, assetInfo, previewIdx, previewCount)
{
    var keys = Object.keys(assetInfo.previews);
    var previewInfo = assetInfo.previews[previewIdx];
    var preview = req.files[previewInfo.file];
    
    //console.log(previewInfo);
    //console.log(preview);
    var filename = path.basename(preview.name);
    app.assetStore.upload(
        preview.path, assetInfo.id, filename,
        function(err, result) {
            if (err) {
                //console.log("error due to bad rename?");
                reportError(db, req, res, assetInfo,
                            'UploadFailed', err);
                return;
            }
            recordPreview(db, req, res, assetInfo, result.path,
                         previewIdx, previewCount);
        });
}

function setupPreviews(db, req, res, assetInfo)
{
    var i;
    if (assetInfo.previews) {
        var keys = Object.keys(assetInfo.previews);
        var previewIdx = 0;
        var previewCount = keys.length;
        setupPreview(db, req, res, assetInfo, previewIdx, previewCount);
    }
}


function setupIcons(db, req, res, assetInfo)
{
    var imageUrls = utils.findImagePaths(req);

    // upload:
    //   req.files.icons.tiny
    //   req.files.icons.small
    //   req.files.icons.medium
    //   req.files.icons.large
    //   req.files.icons.huge

    setupPreviews(db, req, res, assetInfo);
}


function recordAsset(db, req, res, assetInfo)
{
    var file = req.files.asset;
    var incomingPath = assetInfo.incomingPath;
    var newAssetQuery = 'insert into incomingAssets (id, license, author, baseprice, name, description, version, path, file) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    db.query(newAssetQuery,
             [assetInfo.id, assetInfo.license, assetInfo.partnerId, assetInfo.basePrice, assetInfo.name, assetInfo.description, assetInfo.version, assetInfo.incomingPath, assetInfo.filename],
             function(err, result) {
                 if (err) {
                     reportError(db, req, res, assetInfo,
                                 'Database', err);
                     return;
                 }

                 setupIcons(db, req, res, assetInfo);
             });
}

function storeAsset(db, req, res, assetInfo)
{
    db.query("select nextval('seq_assetsids') as assetId;", [],
             function(err, result) {
                 var fromFile = req.files.asset.path;
                 var name = req.files.asset.name;
                 var filename = path.basename(name) + '-' + assetInfo.version;
                 assetInfo.id = result.rows[0].assetid;
                 assetInfo.filename = filename;
                 //console.log(req.files.asset);
                 //console.log("from file " + fromFile + ", id = " + assetInfo.id + ', filename = ' + filename);
                 app.assetStore.upload(
                     fromFile, assetInfo.id, filename,
                     function(err, result) {
                         if (err) {
                             //console.log("error due to bad rename?");
                             reportError(db, req, res, assetInfo,
                                         'UploadFailed', err);
                             return;
                         }
                         assetInfo.incomingPath = result.path;
                         recordAsset(db, req, res, assetInfo);
                     });
             });
}

function checkPartner(db, req, res, assetInfo)
{
    //console.log("checking " + assetInfo.partnerId + ' ' + req.session.user.id);
    var partner = assetInfo.partnerId;
    if (!partner) {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Content Creator';",
                 [req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         reportError(db, req, res, assetInfo,
                                     'UploadPartnerInvalid', err);
                         return;
                     }

                     assetInfo.partnerId = result.rows[0].partner;
                     storeAsset(db, req, res, assetInfo);
                 });
    } else {
        //console.log("checking up on partner");
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Content Creator';",
                 [partner, req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         reportError(db, req, res, assetInfo,
                                     'UploadPartnerInvalid', err);
                         return;
                     }

                     //console.log("going to store the asset now .. " + partner + " " + result.rows.length);
                     storeAsset(db, req, res, assetInfo);
                 });
    }
}

function assetHasTag(assetInfo, tagType)
{
    var keys = Object.keys(assetInfo.tags);
    var tagIdx = 0;
    var tagCount = keys.length;
    for (tagIdx = 0; tagIdx < tagCount; ++tagIdx) {
        var tagInfo = assetInfo.tags[tagIdx];
        if (tagInfo.type == tagType) {
            return true;
        }
    }
    return false;
}

function hasRequiredTags(db, req, res, assetInfo)
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
        if (tagInfo.type == "assetType") {
            assetType = tagInfo.title;
        }
    }

    if (!assetType) {
        err = new Error("Missing required tag 'assetType'");
        errors.report('UploadMissingTag', req, res, err);
        return false;
    }

    var requiredTags = mandatoryTagsForAssetType[assetType];

    if (!requiredTags) {
        err = new Error("Unrecognized assetType");
        errors.report('UploadMissingTag', req, res, err);
        return false;
    }

    for (tagIdx = 0; tagIdx < requiredTags.length; ++tagIdx) {
        tagType = requiredTags[tagIdx];
        if (!assetHasTag(assetInfo, tagType)) {
            err = new Error("Missing required tag: " + tagType);
            errors.report('UploadMissingTag', req, res, err);
            return false;
        }
    }

    return true;
}

module.exports = function(db, req, res) {
    // asset info
    //   icons
    //   previews
    //   asset
    var assetInfo;

    if (!req.files.info) {
        //"The asset info file is missing.",
        errors.report('MissingParameters', req, res);
        return;
    }

    fs.readFile(req.files.info.path, function (err, data) {
        if (err) {
            errors.report('Database', req, res, err);
            return;
        }
        try {
            assetInfo = JSON.parse(data);
        } catch (err) {
            //JSON parser failed
            assetInfo = null;
        }

        if (!assetInfo) {
            //"Unable to parse the asset info file.",
            errors.report('NoMatch', req, res);
            return;
        }

        if (!hasRequiredTags(db, req, res, assetInfo)) {
            //error has already been reported
            return;
        }

        checkPartner(db, req, res, assetInfo);
    });
};

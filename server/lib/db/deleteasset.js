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

function sendResponse(db, req, res, assetInfo)
{
    var json = utils.standardJson(req, true);

    json.asset = {
        id : assetInfo.id,
        name : assetInfo.name
    };
    res.send(json);
}

function deleteFiles(db, req, res, assetInfo)
{
    var i;
    app.assetStore.remove(assetInfo, function(err){});
    app.previewStore.remove(assetInfo, function(err){});
    sendResponse(db, req, res, assetInfo);
}

function deleteAsset(db, req, res, assetInfo, queries)
{
    db.query(
        queries.deleteAsset, [assetInfo.id],
        function(err, result) {
            var i;
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            assetInfo.previews = result.rows;
            if (!assetInfo.previews) {
                assetInfo.previews = [];
            }
            deleteFiles(db, req, res, assetInfo, queries);
        }
    );
}

function findPreviewFiles(db, req, res, assetInfo, queries)
{
    assetInfo.previews = [];
    db.query(
        queries.findPreviews, [assetInfo.id],
        function(err, result) {
            var i;
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            assetInfo.previews = result.rows;
            if (!assetInfo.previews) {
                assetInfo.previews = [];
            }
            deleteAsset(db, req, res, assetInfo, queries);
        }
    );
}

function deletePublishedAsset(db, req, res, assetInfo)
{
    //find previews query
    var queries = {
        findPreviews :
        "select * from incomingassetpreviews where asset = $1;",
        deleteAsset :
        "update assets set active = FALSE where id = $1;"
    };
    findPreviewFiles(db, req, res, assetInfo, queries);
}

function deleteIncomingAsset(db, req, res, assetInfo)
{
    var queries = {
        findPreviews :
        "select * from incomingassetpreviews where asset = $1;",
        deleteAsset :
        "delete from incomingassets where id = $1;"
    };
    findPreviewFiles(db, req, res, assetInfo, queries);
}

module.exports = function(db, req, res) {
    var assetInfo = {};

    assetInfo.id = utils.parseNumber(req.params.assetId);
    if (!assetInfo.id) {
        errors.report('MissingParameters', req, res);
        return;
    }

    createUtils.partnerForAsset(db, req, res, assetInfo,
            function(err, db, req, res, assetInfo) {
                if (err) {
                    errors.report(err.type, req, res, err);
                    return;
                }

                createUtils.isContentCreator(
                    db, req, res, assetInfo,
                    function(err, db, req, res, assetInfo) {
                        if (err) {
                            errors.report(err.type, req, res, err);
                            return;
                        }

                        createUtils.findAsset(
                            db, req, res, assetInfo, true,
                            function(err, db, req, res, assetInfo) {
                                if (err) {
                                    errors.report('AssetMissing', req, res);
                                    return;
                                }
                                if (assetInfo.incoming) {
                                    deleteIncomingAsset(db, req, res, assetInfo);
                                } else {
                                    deletePublishedAsset(db, req, res, assetInfo);
                                }
                            }
                        );
                    });
            });
};

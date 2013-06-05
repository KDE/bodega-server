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

function sendResponse(db, req, res, assetInfo)
{
    var json = utils.standardJson(req, true);

    json.asset = {
        id : assetInfo.id,
        name : assetInfo.name
    };
    res.send(json);
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

    //id, license, baseprice, name, description, version, path, file
    addToStr(q, assetInfo, 'license');
    addToStr(q, assetInfo, 'baseprice');
    addToStr(q, assetInfo, 'name');
    addToStr(q, assetInfo, 'description');
    addToStr(q, assetInfo, 'version');
    addToStr(q, assetInfo, 'file');
    addToStr(q, assetInfo, 'publish');

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

function updateIncomingAsset(db, req, res, assetInfo)
{
    var queryStr = buildQueryString(assetInfo);

    if (!queryStr) {
        sendResponse(db, req, res, assetInfo);
        return;
    }

    db.query(queryStr, [], function(err, result) {
        if (err) {
            errors.report('Database', req, res, err);
            return;
        }
        sendResponse(db, req, res, assetInfo);
    });
}

function setupTags(db, req, res, assetInfo)
{
    if (assetInfo.tags) {
        createUtils.setupTags(
            db, req, res, assetInfo,
            function(err, db, req, res, assetInfo) {
                if (err) {
                    errors.report('UploadTagError',
                                  req, res, err);
                    return;
                }
                sendResponse(db, req, res, assetInfo);
            });
    } else {
        sendResponse(db, req, res, assetInfo);
    }
}

function setupPreviews(db, req, res, assetInfo)
{
    if (assetInfo.previews) {
        createUtils.setupPreviews(
            db, req, res, assetInfo,
            function(err, db, req, res, assetInfo) {
                if (err) {
                    errors.report('UploadPreviewError', req, res, err);
                    return;
                }
                setupTags(db, req, res, assetInfo);
            });
    } else {
        setupTags(db, req, res, assetInfo);
    }
}

function updatePublishedAsset(db, req, res, assetInfo)
{
    var incomingAssetQuery =
            "insert into incomingAssets (id) values ($1)";

    db.query(
        incomingAssetQuery, [assetInfo.id],
        function (err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            updateIncomingAsset(db, req, res, assetInfo);
        });
}

module.exports = function(db, req, res) {
    var assetInfo;

    if (!req.files.info) {
        //"The asset info file is missing.",
        errors.report('MissingParameters', req, res);
        return;
    }

    fs.readFile(req.files.info.path, function (err, data) {
        if (err) {
            errors.report('UploadInvalidJson', req, res, err);
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
            errors.report('UploadInvalidJson', req, res);
            return;
        }

        if (req.query.assetId && !assetInfo.id) {
            assetInfo.id = req.query.assetId;
        }

        if (!assetInfo.id) {
            errors.report('UploadInvalidJson', req, res);
            return;
        }

        createUtils.isContentCreator(
            db, req, res, assetInfo,
            function(err, db, req, res, assetInfo) {
                if (err) {
                    errors.report('UploadPartnerInvalid', req, res, err);
                    return;
                }
                createUtils.findAsset(
                    db, req, res, assetInfo, false,
                    function(err, db, req, res, assetInfo) {
                        if (err) {
                            errors.report('DeleteAssetMissing', req, res, err);
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
    });
};

var utils = require('../utils.js');
var errors = require('../errors.js');
var fs = require('fs');


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

function setupContent(db, req, res, assetInfo)
{
    //upload req.files.previews[i]

    sendResponse(db, req, res, assetInfo);
}

function setupPreviews(db, req, res, assetInfo)
{
    var i;
    for (i = 0; i < assetInfo.length; ++i) {
        //upload req.files.previews[i]
    }
    setupContent();
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

    setupPreviews(db, res, res, assetInfo);
}


function setupAsset(db, req, res, assetInfo)
{
    var insertQuery =
        'INSERT INTO assets (license, author, basePrce, externId, name, \
          description, version, path, image) \
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;';

    db.query(
        insertQuery,
        [assetInfo.license,  assetInfo.author, assetInfo.basePrce,
         assetInfo.externId, assetInfo.name,   assetInfo.description,
         assetInfo.version,  assetInfo.path,   assetInfo.image],
        function(err, result) {
            if (err || !result.rows) {
                errors.report('Database', req, res, err);
                return;
            }
            assetInfo.id = result.rows[0].id;
            setupIcons(db, req, res, assetInfo);
        });
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

        console.log("assetInfo is " + assetInfo);
        if (!assetInfo) {
            //"Unable to parse the asset info file.",
            errors.report('NoMatch', req, res);
            return;
        }

        console.log(assetInfo);
        setupAsset(db, req, res, assetInfo);
    });
};

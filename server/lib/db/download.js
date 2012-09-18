var utils = require('../utils.js');
var errors = require('../errors.js');

function launchDownload(db, req, res)
{
    var assetInfoQuery =
        "SELECT a.id, a.author as partnerId, a.version, a.path, a.file, a.name \
         FROM assets a LEFT JOIN channelAssets c ON (a.id = c.asset)  \
         LEFT JOIN deviceChannels dc ON (dc.channel = c.channel) \
         WHERE a.id = $1 and dc.device = $2";

    var q = db.query(
        assetInfoQuery, [req.params.assetId, req.session.user.device],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result || !result.rows || result.rows.length !== 1) {
                //"Could not find the specified asset.",
                errors.report('NoMatch', req, res);
                return;
            }
            app.assetStore.download(res, result.rows[0].path, result.rows[0].file, function(err) {
                if (err) {
                    errors.report('Download', req, res, err);
                    return;
                }

                utils.recordDownload(db, req);
            });
        });
}

module.exports = function(db, req, res) {
    var q = db.query("SELECT ct_canDownload($1, $2, $3) as allowed;",
                     [req.session.user.id, req.session.user.device, req.params.assetId],
                     function(err, result) {
                        if (err || !result || result.rows.length < 1) {
                            errors.report('Database', req, res, err);
                            return;
                        }

                        if (!result.rows[0].allowed) {
                            //"Access denied to requested asset.",
                            errors.report('AccessDenied', req, res);
                            return;
                        }

                        launchDownload(db, req, res);
                     });
};

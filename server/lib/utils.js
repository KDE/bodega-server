module.exports.findImagePaths = function(req)
{
    var serverUrl = "http://" + req.header('host') + '/';
    var imageUrls = {
        tiny: serverUrl + 'images/22',
        small: serverUrl + 'images/32',
        medium: serverUrl + 'images/64',
        large: serverUrl + 'images/128',
        huge: serverUrl + 'images/512',
        previews: serverUrl + 'images/previews'
    };
    return imageUrls;
};

module.exports.recordDownload = function(db, req)
{
    var ip = req.headers['x-forwarded-for'];
    if (!ip) {
        ip = req.connection.socket ? req.connection.socket.remoteAddress
                                   : req.connection.remoteAddress;
        if (!ip) {
            ip = "0.0.0.0";
        }
    }
    db.query("SELECT ct_recordDownload($1, $2, $3, $4);",
            [req.session.user.id, req.params.assetId, ip,
             req.session.user.device],
            function(err, result) { }
            );
};

module.exports.standardJson = function(req, success)
{
    var json = {};

    if (req && req.session && req.session.authorized && req.session.user) {
        json.authStatus = req.session.authorized;
        json.device = req.session.user.device;
        json.points = req.session.user.points;
    } else {
        json.authStatus = false;
        json.device = 0;
        json.points = 0;
    }

    json.success = typeof success !== 'undefined' ? success : true;
    return json;
};


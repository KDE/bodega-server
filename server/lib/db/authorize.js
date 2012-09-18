var utils = require('../utils.js');
var errors = require('../errors.js');
var BCrypt = require('bcrypt');

function generateHash(pass)
{
    var start = Date.now();
    BCrypt.genSalt(10, function(err, salt) {
        //console.log('salt: ' + salt);
        BCrypt.hash(pass, salt, function(err, crypted) {
            //console.log('crypted: ' + crypted);
            //saveHashedPass(db, req, res, crypted);
        });
    });
}

function authenticate(db, req, res)
{
    var authQuery =
        "SELECT u.id, u.fullname, u.failedauth, u.email, u.active, \
         u.points + u.owedPoints as points, u.password FROM people u JOIN devices d ON (d.partNumber = $1) WHERE u.email = $2;";
    var authUser = req.query.auth_user;
    var authPassword = req.query.auth_password;
    var authDevice = req.query.auth_device;
    var imageUrls = utils.findImagePaths(req);

    //generateHash(authPassword);
    var q = db.query(
        authQuery, [authDevice, authUser],
        function(err, result) {

            if (err || result.rows.length === 0) {
                errors.report('NoMatch', req, res, err);
                return;
            }

            var userData = result.rows[0];

            if (!userData.active) {
                errors.report('AccountInactive', req, res);
                return;
            }

            BCrypt.compare(
                authPassword, userData.password,
                function(err, authorized) {
                    req.session.authorized = authorized;
                    if (!authorized) {
                        errors.report('NoMatch', req, res, err);
                        return;
                    }
                    var obj = {};
                    obj.userId = userData.id;
                    obj.device = authDevice;
                    obj.authStatus = authorized;
                    obj.points = userData.points;
                    obj.imageUrls = imageUrls;
                    var user = {
                        name:   authUser,
                        id: obj.userId,
                        device: authDevice,
                        points: obj.points
                    };
                    req.session.user = user;
                    res.json(obj);
                });
        });
}


module.exports = function(db, req, res) {
    authenticate(db, req, res);
};

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

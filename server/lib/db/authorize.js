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
        "SELECT u.id, u.fullname, u.email, u.active, \
         u.points, u.password FROM people u JOIN stores s ON (s.id = $1) WHERE u.email = $2;";
    var authUser = req.query.auth_user;
    var authPassword = req.query.auth_password;
    var authStore = utils.authStore(req);
    var imageUrls = utils.findImagePaths(req);

    var q = db.query(
        authQuery, [authStore, authUser],
        function(err, result) {

            if (err || result.rows.length === 0) {
                errors.report('NoMatch', req, res, err);
                return;
            }

            var userData = result.rows[0];
            if (!userData.active) {
                utils.queueAccountActivationMessage(db, req, userData.id, userData.email);
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

                    var user = {
                        name: authUser,
                        id: userData.id,
                        store: authStore,
                        points: userData.points
                    };
                    req.session.user = user;

                    var json = utils.standardJson(req);
                    json.imageUrls = imageUrls;
                    json.active = userData.active;
                    res.json(json);
                });
        });
}


module.exports = function(db, req, res) {
    authenticate(db, req, res);
};

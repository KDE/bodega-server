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

module.exports = function(db, req, res) {
    //console.log("gonna try for " + req.query.newPassword);
    if (!req.query.newPassword) {
        //"Password can not be empty.",
        errors.report('MissingParameters', req, res);
        return;
    }

    BCrypt.genSalt(10, function(err, salt) {
        if (err) {
            errors.report('EncryptionFailure', req, res, err);
            return;
        }

        BCrypt.hash(req.query.newPassword, salt, function(err, crypted) {
            if (err) {
                errors.report('EncryptionFailure', req, res, err);
                return;
            }

            var resetQuery = 'UPDATE people SET password = $1 WHERE id = $2;';
            db.query(resetQuery, [crypted, req.session.user.id],
                     function(err, result) {
                        if (err) {
                            errors.report('Database', req, res, err);
                            return;
                        }

                        var json = { success: true,
                                     authStatus: true
                                   };
                        res.json(json);
                        return;
                     }
                    );
            }
        );
    }
   );
};

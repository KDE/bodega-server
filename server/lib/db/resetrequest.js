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

module.exports = function(db, req, res) {
    var args = {
        email  : req.query.email
    };

    if (!args.email) {
        //"Email address can not be empty.",
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        'SELECT id, active FROM people WHERE email = $1;',
        [args.email],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows || result.rows.length === 0) {
                //"The given user account doesn't exist.",
                errors.report('NoMatch', req, res);
                return;
            }

            if (!result.rows[0].active) {
                //"Account has to be activated before it can be reset.",
                errors.report('AccountInactive', req, res);
                return;
            }

            var clientIp;
            if (req.headers['x-forwarded-for']) {
                clientIp = req.headers['x-forwarded-for'];
            } else {
                clientIp = req.connection.remoteAddress;
            }

            // queue up a message
            db.query("INSERT INTO emailQueue (recipient, data, template) \
                     VALUES ($1, hstore(Array[['requestAddress', $2]]), 'participant_passwordReset')",
                     [ result.rows[0].id, clientIp ],
                     function(err, result) {
                        if (err) {
                            errors.report('Database', req, res, err);
                            return;
                        }

                        var json = {};
                        json.message = "Password reset email sent!";
                        res.json(json);
                    });
        }
    );
};

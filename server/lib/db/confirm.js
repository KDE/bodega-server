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
        code : req.query.code,
        userId : req.query.id,
        email : req.query.email,
    };
    var query =
        'select ct_activateAccount($1, $2) as activated;';

    if (!args.code || !args.userId) {
        //"Missing confirmation code or user id.",
        res.render('registrationconfirmation.jade',
        { layout: false,
          title: 'Account activation failed!',
          message: 'Activation parameters missing',
          success: false,
          storeName: app.config.storeInfo.name
        });
        return;
    }

    db.query(
        query, [args.userId, args.code],
        function(err, result) {
            var text;
            var json = {
                userId: args.userId
            };

            var updateError = true;
            db.query('update people set active = true where id = $1', [args.userId], function(err2, result) {
                if (err) {
                    updateError = false;
                    errors.report('Database', req, res, err2);
                }
            });

            if (err || updateError) {
                errors.report('Database', req, res, err);
                res.render('registrationconfirmation.jade',
                { layout: false,
                  title: 'Account activation failed!',
                  message: 'Activation for ID ' + args.userId + ' failed with code "' + args.code + '" because: ' + err.message,
                  success: false
                });
                return;
            }
            if (!result.rows || result.rows.length !== 1 ||
                !result.rows[0].activated) {
                //"Unable to confirm user. Check the activation code.",
                res.render('registrationconfirmation.jade',
                { layout: false,
                  title: 'Account activation request not found!',
                  message: 'The account activation request "' + args.userId + ': ' + args.code + '" could not be found.',
                  success: false
                });
                return;
            }

            db.query('select email from people where id = $1;', [args.userId],
            function(err, result) {
            res.render('registrationconfirmation.jade',
                { layout: false,
                  title: 'Success!',
                  message: 'A new Make·Play·Live account for ' + result.rows[0].email + ' has been created. You may now log in.',
                  success: true,
                  storeName: app.config.storeInfo.name
                });
            });
        });
};

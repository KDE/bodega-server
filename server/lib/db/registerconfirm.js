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
        userId : utils.parseNumber(req.query.id),
        email : req.query.email
    };

    if (!args.code || !args.userId) {
        //"Missing confirmation code or user id.",
        res.render('registrationconfirmation.jade',
        { layout: false,
          title: 'Account activation failed!',
          message: 'Activation parameters missing',
          success: false,
          storeName: app.config.warehouseInfo.name
        });
        return;
    }

    db.query(
        'select ct_activateAccount($1, $2) as activated',
        [args.userId, args.code],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);

                res.render('registrationconfirmation.jade',
                {
                    layout: false,
                    title: 'Account activation failed!',
                    message: 'Activation for ID ' + args.userId + ' failed with code "' +
                             args.code + '" because: ' + err.message,
                    success: false
                });
                return;
            }

            var success = utils.parseBool(result.rows[0].success);

            if (success) {
                var email = result.rows[0].email;
                res.render('registrationconfirmation.jade',
                        {
                            layout: false,
                            title: 'Success!',
                            message: 'A new Make·Play·Live account for ' + email +
                                     ' has been created. You may now log in.',
                            success: true,
                            storeName: app.config.warehouseInfo.name
                        });
            } else {
                //"Unable to confirm user. Check the activation code.",
                res.render('registrationconfirmation.jade',
                {
                    layout: false,
                    title: 'Account activation request not found!',
                    message: 'The account activation request "' + args.userId + ': ' +
                             args.code + '" could not be found.',
                    success: false
                });
            }

        });
};

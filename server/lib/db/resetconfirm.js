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
var BCrypt = require('bcrypt');

module.exports = function(db, req, res) {
    var query =
        "select ct_setPassword($1, $2, $3) as success;";

    var args = {
        userId : req.query.id,
        userEmail : req.query.email,
        resetCode : req.query.code,
        newPassword : req.body.password1
    };

    if (!args.userId || !args.userEmail ||
        !args.resetCode || !args.newPassword) {
        res.render(
            'passwordresetconfirm.jade',
            { layout: false,
              title: 'Password reset failed!',
              message: 'Arguments missing!',
              success: false
            });
        return;
    }

    BCrypt.genSalt(10, function(err, salt) {
        if (err) {
            res.render(
                'passwordresetconfirm.jade',
                { layout: false,
                  title: 'Password reset failed!',
                  message: 'Couldn\'t encrypt the password! Please try again.',
                  success: false
                });
            return;
        }

        BCrypt.hash(args.newPassword, salt, function(err, crypted) {
            if (err) {
                res.render(
                    'passwordresetconfirm.jade',
                    { layout: false,
                      title: 'Password reset failed!',
                      message: 'Couldn\'t encrypt the password! Please try again.',
                      success: false
                    });
                return;
            }

            db.query(
                query,
                [args.userId, crypted, args.resetCode],
                function(err, result) {
                    if (err) {
                        res.render(
                            'passwordresetconfirm.jade',
                            { layout: false,
                              title: 'Password reset failed!',
                              message: 'Database communication problem! Please try again.',
                              success: false
                            });
                        return;
                    }

                    if (!result.rows || result.rows.length === 0 ||
                       !result.rows[0].success) {
                        res.render(
                            'passwordresetconfirm.jade',
                            { layout: false,
                              title: 'Password reset failed!',
                              message: 'Specified password reset code was invalid.',
                              success: false
                            });
                        return;
                    }
                    var title = 'Password successfully reset!';
                    var message = 'Password for user ' +
                        args.userEmail +
                        ' has been successfully reset.';
                    res.render(
                            'passwordresetconfirm.jade',
                            { layout: false,
                              'title': title,
                              'message': message,
                              success: true
                            });
                }
            );
        });
    });
};

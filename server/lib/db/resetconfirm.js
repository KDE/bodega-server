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

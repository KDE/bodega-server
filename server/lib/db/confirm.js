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
          message: 'Activation parameters missing'
          success: false
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
            if (err) {
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
                  success: true
                });
            });
        });
};

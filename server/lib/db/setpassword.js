var utils = require('../utils.js');
var errors = require('../errors.js');
var BCrypt = require('bcrypt');

module.exports = function(db, req, res) {
    if (!req.session.authorized) {
        //console.log("not authorized");
        return;
    }

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

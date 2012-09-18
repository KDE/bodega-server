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
        errors.report('MissingParameters', req, res);
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
                return;
            }
            if (!result.rows || result.rows.length !== 1 ||
                !result.rows[0].activated) {
                //"Unable to confirm user. Check the activation code.",
                errors.report('NoMatch', req, res);
                return;
            }
            json.message = "Registration successful!";
            res.json(json);
        });

};

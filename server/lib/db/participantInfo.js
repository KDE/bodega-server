var utils = require('../utils.js');
var errors = require('../errors.js');

module.exports = function(db, req, res) {
    var json = {
        authStatus: req.session.authorized,
        assetCount: 0,
        channelCount: 0,
        storeCount: 0,
        pointsEarned: 0,
        pointsOwed: 0,
        points: 0,
        organization: '',
        firstName: '',
        lastName: '',
        email: ''
    };

    if (req.session.authorized) {
        var accountInfoQuery = "SELECT firstName, lastName, email FROM people WHERE id = $1;";
        var q = db.query(accountInfoQuery, [req.session.user.id],
                         function(err, result)
                         {
                             if (err) {
                                 errors.report('Database', req, res, err);
                                 return;
                             }

                            json.firstName = result.rows[0].firstname;
                            json.lastName = result.rows[0].lastname;
                            json.email = result.rows[0].email;

                            var assetCountQuery = "SELECT COUNT(id) AS assetCount FROM assets WHERE author = $1;";
                            var q = db.query(assetCountQuery, [req.session.user.id],
                                             function(err, result)
                                             {
                                                if (err) {
                                                    errors.report('Database', req, res, err);
                                                    return;
                                                }

                                                json.assetCount = result.rows[0].assetCount;
                                                res.json(json);
                                             }
                                            );
                         }
                        );
    }
};


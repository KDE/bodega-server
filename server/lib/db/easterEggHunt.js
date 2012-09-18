var utils = require('../utils.js');

module.exports = function(db, req, res) {
    var query = 'SELECT egg FROM easterEggs WHERE phrase = $1 AND device = $2';
    var errorObj;
    var json = {
        egg: ''
    };

    db.query(
        query,
        [req.query.code, req.query.device],
        function(err, result) {
            if (!err && result && result.rows.length > 0) {
                json.egg = result.rows[0].egg;
            }

            res.json(json);
        });
};

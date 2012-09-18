var utils = require('../utils.js');
var errors = require('../errors.js');

module.exports = function(db, req, res) {
    // apparently unary+ is apparently the fastest way to convert string->num in js
    var asset = +req.params.assetId;
    if (isNaN(asset) || asset < 1) {
        //"An asset id is required.",
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query("SELECT ct_purchase($1, $2, $3) as result;",
             [req.session.user.id, req.session.user.device, asset],
             function(error, result)
             {
                 if (error || !result) {
                     errors.report('Database', req, res, error);
                     return;
                 }

                 var ret = result.rows[0].result;
                 if (ret > 0) {
                     errors.report('PurchaseFailed', req, res);
                     return;
                 }

                 db.query('SELECT points + owedPoints as points FROM people WHERE id = $1',
                          [req.session.user.id],
                          function(error, result)
                          {
                              if (error) {
                                  errors.report('Database', req, res, error);
                                  return;
                              }

                              req.session.user.points = result.rows[0].points;
                              var json = utils.standardJson(req);
                              res.json(json);
                          }
                         );
             }
            );
};

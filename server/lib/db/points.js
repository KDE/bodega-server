var utils = require('../utils.js');
var payments = require('../payments.js');
var errors = require('../errors.js');
var http = require('http');

module.exports.buy = function(db, req, res) {
    // query args:
    //   points=%d
    var args = {
        userId : req.session.user.id,
        points : parseInt(req.query.amount, 10)
    };

    if (!args.points) {
        // Number of points is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    payments.buyPoints(db, args, function(err, newPoints) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }

        req.session.user.points = newPoints;
        res.json(utils.standardJson(req));
    });
};

module.exports.redeemCode = function(db, req, res) {
    var query = 'SELECT ct_redeemPointsCode($1, $2) as newPoints';

    if (!req.params.code || req.params.code.size < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        query,
        [req.params.code, req.session.user.id],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result || result.rows[0].newpoints < 0) {
                errors.report('RedeemCodeFailure', req, res);
                return;
            }

            var newPoints = result.rows[0].newpoints;
            var added = newPoints - req.session.user.points;
            req.session.user.points = newPoints;
            var json = utils.standardJson(req);
            json.addedPoints = added;
            res.json(json);
        });
};


var currencyTs = 0;
var currencies = [];
function addOtherCurrency(req, res, json, points)
{
    if (currencies[req.query.otherCurrency]) {
        json[req.query.otherCurrency] =  Math.round((app.config.pointConversionRate / 100) * currencies[req.query.otherCurrency] * 100) / 100 * points;
    }

    res.json(json);
}

module.exports.price = function(db, req, res)
{
    var points = +req.query.amount;
    if (isNaN(points) || points < 100) {
        points = 100;
    }
    // get points to the nearest 100 (we only sell in blocks of 100)
    points = (points - (points % 100)) / 100;

    var json = {
        'USD': (Math.round((app.config.pointConversionRate / 100 * points) * 100) / 100)
    };

    if (!req.query.otherCurrency) {
        res.json(json);
        return;
    }

    if (currencies.length < 1 || currencyTs + 3600 < Math.round(Date.now() / 1000)) {
        var options = {
            'host': 'openexchangerates.org',
            'path': '/latest.json'
        };

        var currencyData = '';
        http.get(options, function(downRes) {

            downRes.on('data', function(data) {
                currencyData += data;
            });

            downRes.on('end', function(data) {
                currencyData = JSON.parse(currencyData);
                if (currencyData.rates) {
                    currencies = currencyData.rates;
                }

                if (currencyData.timestamp) {
                    currencyTs = currencyData.timestamp;
                }

                addOtherCurrency(req, res, json, points);
            });

            downRes.on('close', function(err) {
                currencyData = null;
                addOtherCurrency(req, res, json, points);
            });
        });
    } else {
        addOtherCurrency(req, res, json);
    }
};


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
var payments = require('../payments.js');
var errors = require('../errors.js');
var http = require('http');

module.exports.buy = function(db, req, res) {
    // query args:
    //   points=%d
    var args = {
        userId : req.session.user.id,
        points : parseInt(req.body.amount, 10)
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
    var points = utils.parseNumber(req.query.amount);
    if (points < 100) {
        points = 100;
    }

    // round upwards to the next 100 (we only sell in blocks of 100)
    if (points % 100 !== 0) {
        points = points + (100 - (points % 100));
    }

    points = points / 100;

    var json = {
        'USD': (Math.round((app.config.pointConversionRate / 100 * points) * 100) / 100)
    };

    if (!req.query.otherCurrency ||
        !app.config.appkeys.openexchangerates ||
        app.config.appkeys.openexchangerates === '') {
        res.json(json);
        return;
    }

    if (currencies.length < 1 || currencyTs + 3600 < Math.round(Date.now() / 1000)) {
        var options = {
            'host': 'openexchangerates.org',
            'path': '/api/latest.json?app_id=' + app.config.appkeys.openexchangerates
        };

        var currencyData = '';
        http.get(options, function(downRes) {

            downRes.on('data', function(data) {
                currencyData += data;
            });

            downRes.on('end', function(data) {
                try {
                    currencyData = JSON.parse(currencyData);
                } catch (e) {
                    var error = { message: 'Bad response on currency exchange rate for ' +
                                  req.query.otherCurrency };
                    errors.log(error);
                    res.json(json);
                    return;
                }
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

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
var errors = require('../errors.js');
var payments = require('../payments.js');
var check = require('validator').check;
var sanitize = require('validator').sanitize;

function series(callbacks, errHandler, db, req, res) {
    function next(err) {
        var callback = callbacks.shift();

        if (err) {
            errHandler(db, req, res, err);
            return;
        }

        if (callback) {
            callback(db, req, res, function(err) {
                next(err);
            });
        }
    }
    next();
}


function performUpdate(db, field, value, user, next)
{
    var resetQuery = 'UPDATE people SET ' + field + ' = $1 WHERE id = $2;';
    db.query(resetQuery, [value, user], function(err, result) {
        if (err) {
            err.name = 'Database';
            next(err);
            return;
        }
        next();
    });
}

function performFirstNameUpdate(db, req, res, next)
{
    var firstName = sanitize(req.body.firstName).trim();
    if (firstName === '') {
        firstName = sanitize(req.query.firstName).trim();
    }

    if (firstName !== '') {
        performUpdate(db, 'firstName', firstName, req.session.user.id, next);
    } else {
        next();
    }
}

function performMiddleNameUpdate(db, req, res, next)
{
    var middleNames = sanitize(req.body.middleNames).trim();
    if (middleNames === '') {
        middleNames = sanitize(req.query.middleNames).trim();
    }

    // middleNames can be null, so we don't check if middelNames !== ''
    performUpdate(db, 'middleNames', middleNames, req.session.user.id, next);
}

function performLastNameUpdate(db, req, res, next)
{
    var lastName = sanitize(req.body.lastName).trim();
    if (lastName === '') {
        lastName = sanitize(req.query.lastName).trim();
    }

    if (lastName !== '') {
        performUpdate(db, 'lastName', lastName, req.session.user.id, next);
    } else {
        next();
    }
}

function performEmailUpdate(db, req, res, next)
{
    var email = sanitize(req.body.email).trim();
    if (email === '') {
        email = sanitize(req.query.email).trim();
    }

    if (email !== '') {
        try {
            check(email).isEmail();
        } catch (e) {
            next(errors.create('InvalidEmailAddress', e.message));
            return;
        }
        var findQuery =
            'SELECT id, active FROM people WHERE email = $1 AND id !=  $2;';
        db.query(
            findQuery,
            [email, req.session.user.id],
            function(err, result) {
                if (err) {
                    next(errors.create('Database', err.message));
                    return;
                }

                if (result.rows && result.rows.length > 0 &&
                    result.rows[0].active) {
                    next(errors.create('AccountExists'));
                    return;
                } else {
                    performUpdate(db, 'email',
                                  email, req.session.user.id, next);
                }
            }
        );
    } else {
        next();
    }
}

function performCardUpdate(db, req, res, next)
{
    var card = req.body.card ? req.body.card : req.query.card;

    if (card) {
        var query =
            "SELECT u.id, u.email, u.active FROM people u WHERE u.id = $1;";
        var args = {
            "userId" : req.session.user.id,
            "card" : card
        };
        db.query(query, [args.userId], function(err, result) {
            if (err) {
                err.name = 'Database';
                next(err);
                return;
            }
            if (!result.rows || result.rows.length !== 1) {
                next(errors.create('NoMatch'));
                return;
            }
            args.email = result.rows[0].email;
            //console.log(args.email);
            payments.updateCardDetails(db, args, function(err, customerId) {
                if (err) {
                    next(err);
                    return;
                }
                //console.log(customerId);
                next();
            });
        });
    } else {
        next();
    }
}

function performAccountStatusUpdate(db, req, res, next)
{
    var stat = req.body.active ? req.body.active : req.query.active;

    if (stat) {
        performUpdate(db, 'active', stat, req.session.user.id, next);
    } else {
        next();
    }
}

function completeUpdate(db, req, res, next)
{
    // by the time we reach here, we are good and done!
    var json = utils.standardJson(req, true);
    res.json(json);
    next();
}

function errorHandler(db, req, res, err)
{
    errors.report(err.name, req, res, err);
}

module.exports.paymentMethod = function(db, req, res) {
    var args = { userId: req.session.user.id};
    payments.retrievePaymentMethod(db, args, function(err, card) {
        var json;
        if (err) {
            errors.report(err.name, req, res, err);
        } else {
            json = utils.standardJson(req, true);
            json.card = card;
            res.json(json);
        }
    });
};

module.exports.deletePaymentMethod = function(db, req, res) {
    var args = { userId: req.session.user.id};
    payments.deletePaymentMethod(db, args, function(err) {
        if (err) {
            errors.report(err.name, req, res, err);
        } else {
            var json = utils.standardJson(req, true);
            res.json(json);
        }
    });
};

module.exports.changeDetails = function(db, req, res) {
    //Execute updates serially
    series([
        performEmailUpdate,
        performFirstNameUpdate,
        performMiddleNameUpdate,
        performLastNameUpdate,
        performCardUpdate,
        performAccountStatusUpdate,
        completeUpdate
        ], errorHandler, db, req, res);
};

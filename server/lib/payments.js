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

var stripe = require('stripe')(app.config.appkeys.stripe.secretKey);

// In cents. Minimum is 500 points
var MIN_AMOUNT_ALLOWED = 5 * app.config.pointConversionRate;
// In cents. Maximum is 50000 points
var MAX_AMOUNT_ALLOWED = 500 * app.config.pointConversionRate;


function perr(name, descr)
{
    var e = new Error();
    e.name = name;
    e.message = descr;
    return e;
}

function stripeErrorConvert(stripeErr, defaultError)
{
    if (stripeErr) {
        if (stripeErr.name === 'invalid_request_error') {
            return perr(defaultError, stripeErr.message);
        } else if (stripeErr.name === 'api_error') {
            return perr(defaultError, stripeErr.message);
        } else if (stripeErr.name === 'card_error') {
            var code = stripeErr.code ? stripeErr.code : '';
            switch (code) {
            case 'card_declined':
                return perr('CardDeclined');
            case 'incorrect_number':
                return perr('CardIncorrectNumber');
            case 'invalid_number':
                return perr('CardInvalidNumber');
            case 'invalid_expiry_month':
                return perr('CardInvalidExpiryMonth');
            case 'invalid_expiry_year':
                return perr('CardInvalidExpiryYear');
            case 'invalid_cvc':
                return perr('CardInvalidCVC');
            case 'expired_card':
                return perr('CardExpired');
            case 'invalid_amount':
                return perr('CardInvalidAmount');
            case 'missing':
                return perr('PurchaseMethodMissing');
            case 'duplicate_transaction':
                return perr('CardDuplicateTransaction');
            case 'processing_error':
                return perr('CardProcessingError');
            default:
                console.log(stripeErr);
                return perr(defaultError,
                            stripeErr.message);
            }
        }
    }
    return perr(defaultError);
}

var customers = {
    create : function(userId, email, card, fn)
    {
        var customer = {
            "email" : email,
            "card" : card,
            "description" : userId
        };
        stripe.customers.create(
            customer,
            function(err, customer) {
                if (err) {
                    //console.log("Couldn't create the customer record");
                    //console.log(err);
                    fn(stripeErrorConvert(err, 'PurchaseMethodCreation'));
                    return;
                }
                //console.log("customer id", customer.id);
                fn(null, customer);
            }
        );
    },

    del : function(customerId, fn)
    {
        stripe.customers.del(
            customerId,
            function(err, customer) {
                if (err) {
                    //console.log("Couldn't create the customer record");
                    fn(stripeErrorConvert(err, 'PurchaseMethodDeletion'));
                    return;
                }
                //console.log("customer id", customer.id);
                fn(null, customer);
            }
        );
    },

    update : function(customerId, card, fn)
    {
        var data = {
            "card" : card
        };
        stripe.customers.update(
            customerId, data,
            function(err, customer) {
                if (err) {
                    //console.log("Couldn't create the customer record");
                    fn(stripeErrorConvert(err, 'PurchaseMethodDetails'));
                    return;
                }
                //console.log("customer id", customer.id);
                fn(null, customer);
            }
        );
    },

    retrieve : function(customerId, fn)
    {
        stripe.customers.retrieve(
            customerId,
            function(err, customer) {
                if (err) {
                    //console.log("Couldn't create the customer record");
                    fn(stripeErrorConvert(err, 'CustomerRetrieval'));
                    return;
                }
                //console.log("customer id", customer.id);
                fn(null, customer);
            }
        );
    },

    retrieveFromDb : function(db, userId, fn)
    {
        var queryStr = 'SELECT customerid FROM stripecustomers \
                        WHERE person = $1;';


        db.query(queryStr, [userId], function(err, result) {
            if (err) {
                fn(perr('CustomerDatabase', err.message));
                return;
            }
            if (!result.rows || result.rows.length < 1) {
                fn(perr('PurchaseMethodMissing'));
            } else {
                fn(null, result.rows[0].customerid);
            }
        });
    }
};

var charges = {
    create : function(customerId, points, fn)
    {
        // only do units of 100 points
        points = points - (points % 100);
        var data = {
            "amount" : app.config.pointConversionRate * (points / 100),
            "currency" : "usd",
            "customer" : customerId,
            "description" : points + ' points'
        };

        if (data.amount < MIN_AMOUNT_ALLOWED) {
            fn(perr('PurchaseNotEnoughPoints'));
            return;
        }

        if (data.amount >= MAX_AMOUNT_ALLOWED) {
            fn(perr('PurchaseTooManyPoints'));
            return;
        }

        if (isNaN(data.amount)) {
            fn(perr('CardInvalidAmount'));
            return;
        }

        stripe.charges.create(data, function(err, response) {
            if (err) {
                //console.log(err);
                fn(stripeErrorConvert(err, 'CustomerCharge'));
                return;
            }
            fn(null, response);
        });
    },


    refund : function(chargeId, fn)
    {
        var data = {
            "id" : chargeId
        };

        stripe.charges.refund(data, function(err, response) {
            if (err) {
                fn(stripeErrorConvert(err, 'CustomerRefund'));
                return;
            }
            fn(null, response);
        });
    }
};

function recordPointsPurchase(db, args, charge, fn)
{
    var queryStr = 'SELECT ct_addPoints($1, $2, $3) AS points;';

    var vals = [args.userId, args.points, charge.id + ": " + args.points + " points @ " + (charge.amount / 100) + " " + charge.currency];

    db.query(queryStr, vals, function(err, result) {
        if (err) {
            //we're losing money on every refund because
            // our fees are not refunded
            charges.refund(charge.id, function(err, response){
                if (err) {
                    fn(err);
                    return;
                }
                fn(perr('ChargeNotRecorded'));
            });
            return;
        }
        fn(null, result.rows[0].points);
    });
}

function createCustomer(db, args, fn)
{
    var queryStr = 'INSERT INTO stripecustomers (person, customerid) \
                    VALUES($1, $2);';

    if (!args.userId || !args.email) {
        fn(perr('MissingParameters'));
        return;
    }

    if (!args.card || !args.card.number ||
        !args.card.exp_month || !args.card.exp_year) {
        fn(perr('MissingParameters'));
        return;
    }

    customers.create(args.userId, args.email, args.card, function(err, c) {
        if (err) {
            fn(err);
            return;
        }
        db.query(queryStr, [args.userId, c.id], function(err, result) {
            if (err) {
                fn(perr('CustomerDatabase', err.message));
                return;
            }
            fn(null, c.id);
        });
    });
}


function isBadCustomerRecord(db, args, err)
{
    var badCustMsg = 'No such customer';
    var queryStr =
        'DELETE FROM stripecustomers WHERE person=$1 AND customerid=$2;';
    if (err &&
        err.message &&
        err.message.substr(0, badCustMsg.length) === badCustMsg) {
        customers.retrieveFromDb(db, args.userId, function(error, customerId) {
            if (!error) {
                db.query(queryStr, [ args.userId, customerId],
                         function(err, result) {} );
            }
        });
        return true;
    }

    return false;
}

function deleteCustomer(db, args, fn)
{
    var queryStr = 'DELETE FROM stripecustomers WHERE \
                    person=$1 AND customerid=$2;';

    if (!args.userId || !args.customerId) {
        fn(perr('MissingParameters'));
        return;
    }

    customers.del(args.customerId, function(err, c) {
        if (err) {
            if (isBadCustomerRecord(db, args, err)) {
                fn(null);
            } else {
                fn(err);
            }
            return;
        }
        db.query(queryStr, [args.userId, args.customerId], function(err, result) {
            if (err) {
                fn(perr('CustomerDatabase', err.message));
                return;
            }
            fn(null);
        });
    });
}

module.exports.buyPoints = function(db, args, fn)
{
    if (!args.userId || !args.points) {
        fn(perr('MissingParameters'));
        return;
    }

    customers.retrieveFromDb(db, args.userId, function(error, customerId) {
        if (error) {
            fn(error);
            return;
        }
        charges.create(customerId, args.points, function(error, charge) {
            if (error) {
                if (isBadCustomerRecord(db, args, error)) {
                    fn(perr('PurchaseMethodMissing'));
                } else {
                    fn(error);
                }
                return;
            }

            recordPointsPurchase(db, args, charge, fn);
        });
    });
};

module.exports.updateCardDetails = function(db, args, fn)
{
    if (!args.userId || !args.email) {
        fn(perr('MissingParameters'));
        return;
    }

    if (!args.card || !args.card.number ||
        !args.card.exp_month || !args.card.exp_year) {
        fn(perr('MissingParameters'));
        return;
    }

    customers.retrieveFromDb(db, args.userId, function(err, customerId) {
        if (err) {
            if (err.name === 'PurchaseMethodMissing') {
                createCustomer(db, args, fn);
            } else {
                fn(err);
            }
        } else {
            customers.update(customerId, args.card, function(err, res) {
                if (isBadCustomerRecord(db, args, err)) {
                    createCustomer(db, args, fn);
                } else {
                    fn(err);
                }
            });
        }
    });
};

module.exports.retrievePaymentMethod = function(db, args, fn)
{
    if (!args.userId) {
        fn(perr('MissingParameters'));
        return;
    }

    customers.retrieveFromDb(db, args.userId, function(err, customerId) {
        if (err) {
            fn(err);
        } else {
            customers.retrieve(customerId, function(err, customer) {
                if (err) {
                    if (isBadCustomerRecord(db, args, err)) {
                        fn(perr('PurchaseMethodMissing'));
                    } else {
                        fn(err);
                    }
                    return;
                }
                if (!customer || customer.cards.count < 1) {
                    fn(perr('PurchaseMethodMissing'));
                    return;
                }
                //console.log(customer);

                fn(null, customer.cards.data[0]);
            });
        }
    });
};

module.exports.deletePaymentMethod = function(db, args, fn)
{
    if (!args.userId) {
        fn(perr('MissingParameters'));
        return;
    }

    customers.retrieveFromDb(db, args.userId, function(err, customerId) {
        if (err) {
            fn(err);
        } else {
            args.customerId = customerId;
            deleteCustomer(db, args, fn);
        }
    });
};

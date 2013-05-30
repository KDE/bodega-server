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

var server = require('../app.js');
var utils = require('./support/http');

/* Only run the payments tests if the secret key
 * is in the config.json file */
var describeC = (app.config.stripe.secretKey && app.
                 config.stripe.secretKey.length > 10) ?
        describe :
        describe.skip;

describeC('Point operations', function(){
    var cookie;
    var startPoints;

    after(function(done) {
        //try to delete the account if one was created
        var url = '/bodega/v1/json/participant/deletePaymentMethod';
        var updateQuery = 'UPDATE people SET points=$1 WHERE \
                           email=\'zack@kde.org\'';
        //console.log(url);
        if (!cookie) {
            return;
        }

        utils.getUrl(server, url, function(res) {
            app.db.dbQuery(function (db) {
                db.query(updateQuery, [startPoints], function(err, result) {
                    if (err) {
                        console.warn(
                            "Couldn't clean the db in the points test!");
                        console.log(err);
                    }
                    done();
                });
            });
        }, cookie);
    });

    utils.auth(server, function(res, done) {
        cookie = res.headers['set-cookie'];
        startPoints = res.body.points;
        done();
    });

    describe('Payment registration', function(){
        it('should not have any card', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/participant/paymentMethod',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type',
                        'PurchaseMethodMissing');
                    done();
                },
                cookie);
        });
        it('should error without card card', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/points/buy?amount=500',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type',
                        'PurchaseMethodMissing');
                    done();
                },
                cookie);
        });
        it('should emit card_declined', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4000000000000002');
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=2013';
            url += '&';
            url += 'card[cvc]=333';
            url += '&';
            url += 'card[name]=' + encodeURIComponent('Zack Rusin');
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type',
                        'CardDeclined');
                    done();
                },
                cookie);
        });

        it('should emit CardIncorrectNumber', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4242424242424241');
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=2013';
            url += '&';
            url += 'card[cvc]=333';
            url += '&';
            url += 'card[name]=' + encodeURIComponent('Zack Rusin');
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type',
                        'CardIncorrectNumber');
                    done();
                },
                cookie);
        });

        it('should emit CardInvalidExpiryMonth', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4242424242424242');
            url += '&';
            url += 'card[exp_month]=13';
            url += '&';
            url += 'card[exp_year]=2013';
            url += '&';
            url += 'card[cvc]=333';
            url += '&';
            url += 'card[name]=' + encodeURIComponent('Zack Rusin');
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type',
                        'CardInvalidExpiryMonth');
                    done();
                },
                cookie);
        });

        it('should emit CardInvalidExpiryYear', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4242424242424242');
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=1970';
            url += '&';
            url += 'card[cvc]=333';
            url += '&';
            url += 'card[name]=' + encodeURIComponent('Zack Rusin');
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type',
                        'CardInvalidExpiryYear');
                    done();
                },
                cookie);
        });

        it('should emit CardInvalidCVC', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4242424242424242');
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=2013';
            url += '&';
            url += 'card[cvc]=99';
            url += '&';
            url += 'card[name]=' + encodeURIComponent('Zack Rusin');
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type',
                        'CardInvalidCVC');
                    done();
                },
                cookie);
        });

        it('should register successfully', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4242424242424242');
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=2013';
            url += '&';
            url += 'card[cvc]=333';
            url += '&';
            url += 'card[name]=' + encodeURIComponent('Zack Rusin');
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    //console.log(res.body);
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    done();
                },
                cookie);
        });

        it('should delete successfully', function(done){
            var url = '/bodega/v1/json/participant/deletePaymentMethod';
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    //console.log(res.body);
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    done();
                },
                cookie);
        });
    });

    describe('Buying points', function(){
        it('should register successfully', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4242424242424242');
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=2013';
            url += '&';
            url += 'card[cvc]=333';
            url += '&';
            url += 'card[name]=' + encodeURIComponent('Zack Rusin');
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    //console.log(res.body);
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    done();
                },
                cookie);
        });

        it('succeeds', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/points/buy?amount=500',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });

        it('errors on too few points', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/points/buy?amount=5',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type', 'PurchaseNotEnoughPoints');
                    done();
                },
                cookie);
        });

        it('errors on too many points', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/points/buy?amount=5000000000',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type', 'PurchaseTooManyPoints');
                    done();
                },
                cookie);
        });
    });

    describe('on users ', function(){
        var validCard = '4408041234567893';
        it('should allow changing the card', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent(validCard);
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=2013';
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });

        it('shouldnt change to an invalid card', function(done){
            var url = '/bodega/v1/json/participant/changeAccountDetails?';
            url += 'card[number]=' + encodeURIComponent('4408041234567890');
            url += '&';
            url += 'card[exp_month]=12';
            url += '&';
            url += 'card[exp_year]=2013';
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'CardIncorrectNumber');
                    done();
                },
                cookie);
        });

        it('should fetch the payment method', function(done){
            var url = '/bodega/v1/json/participant/paymentMethod';
            //console.log(url);
            utils.getUrl(
                server,
                url,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    //console.log(res.body);
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('card');
                    var card = res.body.card;
                    card.should.have.property('last4',
                                              validCard.substr(-4));
                    done();
                },
                cookie);
        });
    });
});

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

describe('Redeeming points code', function(){
    var cookie;
    var testCode = 'NtTMi4EMBJugZu1hxTmv';
    var testPoints = 1000;
    var startPoints = -1;

    before(function(done) {
        var insertQuery = 'INSERT INTO pointCodes (code, points, expires) \
        VALUES($1, $2, TIMESTAMP \'2013-10-19 10:23:54\');';
        app.db.dbQuery(function (db) {
            db.query(insertQuery, [testCode, testPoints], function(err, result) {
                if (err) {
                    console.warn("Couldn't modify the db for the point redeem test!");
                    console.log(err);
                }
                done();
            });
        });
    });

    after(function(done) {
        var deleteCodeQuery = 'DELETE FROM pointCodes WHERE code=$1;';
        var deleteTransactionQuery = "DELETE FROM pointTransactions WHERE person = 2 AND comment ~ 'Code redeemed:'";
        var updateQuery = 'UPDATE people SET points=$1 WHERE email=\'zack@kde.org\'';

        app.db.dbQuery(function (db) {
            db.query(deleteCodeQuery, [testCode], function(err, result) {
                if (err) {
                    console.warn("Couldn't clean the db after the point redeem test!");
                    console.log(err);
                }

                if (startPoints < 0) {
                    // we didn't get to run our tests, so startPoints is not initialized
                    done();
                } else {
                    db.query(updateQuery, [startPoints], function(err, result) {
                        if (err) {
                            console.warn("Couldn't clean the db for the point redeem test!");
                            console.log(err);
                        }

                        db.query(deleteTransactionQuery, function(err, result) {
                            if (err) {
                                console.warn("Couldn't clean the redemption transaction from the db!");
                                console.log(err);
                            }

                            done();
                        });
                    });
                }
            });
        });
    });

    utils.auth(server, function(res, done) {
        cookie = res.headers['set-cookie'];
        startPoints = res.body.points;
        done();
    });

    describe('Try to redeem codes', function(){
        it('A non-existent code', function(done){
            var expected = {
                "authStatus":true,
                "device":'VIVALDI-1',
                "store":'VIVALDI-1',
                "points":startPoints,
                "success": false,
                "error": {'type' : 'RedeemCodeFailure'}};
            utils.getUrl(
                server,
                '/bodega/v1/json/points/redeemCode/1111111111',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.eql(expected);
                    done();
                },
                cookie);
        });
        it('A working code', function(done){
            var expected = {
                "authStatus":true,
                "device": 'VIVALDI-1',
                "store": 'VIVALDI-1',
                "points":startPoints + testPoints,
                "success": true,
                "addedPoints":testPoints
                };
            utils.getUrl(
                server,
                '/bodega/v1/json/points/redeemCode/' + testCode,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.eql(expected);
                    done();
                },
                cookie);
        });
    });
});

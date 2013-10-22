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

var utils = require('./support/utils');

describe('Redeeming points code', function(){
    var testCode = 'NtTMi4EMBJugZu1hxTmv';
    var expiredCode = 'NtTMi4EMBJugZu1hxTmf';
    var testPoints = 1000;
    var startPoints = -1;

    before(function(done) {
        var insertQuery = "INSERT INTO pointCodes (code, points, expires) \
                           VALUES($1, $2, current_timestamp + ($3 || ' days')::interval)";
        app.db.dbQuery(function (db) {
            db.query(insertQuery, [testCode, testPoints, '10'], function(err, result) {
                if (err) {
                    console.warn("Couldn't modify the db for the point redeem test!");
                    console.log(err);
                }

                db.query(insertQuery, [expiredCode, testPoints, '-10'], function(err, result) {
                    if (err) {
                        console.warn("Couldn't modify the db for the point redeem test!");
                        console.log(err);
                    }

                    done();
                });
            });
        });
    });

    after(function(done) {
        var deleteCodeQuery = 'DELETE FROM pointCodes WHERE code IN ($1, $2);';
        var deleteTransactionQuery = "DELETE FROM pointTransactions WHERE person = 2 AND comment ~ 'Code redeemed:'";
        var updateQuery = 'UPDATE people SET points=$1 WHERE email=\'zack@kde.org\'';

        app.db.dbQuery(function (db) {
            db.query(deleteCodeQuery, [testCode, expiredCode], function(err, result) {
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

    utils.auth({ store: 'VIVALDI-1' }, function(res, done) {
        startPoints = res.body.points;
        done();
    });

    describe('Try to redeem codes', function(){
        it('A non-existent code', function(done) {
            var expected = {
                "authStatus":true,
                "device":'VIVALDI-1',
                "store":'VIVALDI-1',
                "points":startPoints,
                "success": false,
                "error": {'type' : 'RedeemCodeFailure'}};
            utils.getUrl('points/redeemCode/1111111111',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                });
        });

        it('An expired code', function(done) {
            var expected = {
                "authStatus":true,
                "device":'VIVALDI-1',
                "store":'VIVALDI-1',
                "points":startPoints,
                "success": false,
                "error": {'type' : 'RedeemCodeFailure'}};
            utils.getUrl('points/redeemCode/1111111111',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                });
        });

        it('A working code', function(done) {
            var expected = {
                "authStatus":true,
                "device": 'VIVALDI-1',
                "store": 'VIVALDI-1',
                "points":startPoints + testPoints,
                "success": true,
                "addedPoints":testPoints
                };
            utils.getUrl('points/redeemCode/' + testCode,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                });
        });
    });
});

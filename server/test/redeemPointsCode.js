var server = require('../app.js');
var utils = require('./support/http');

describe('Redeeming points code', function(){
    var cookie;
    var testCode = 'NtTMi4EMBJugZu1hxTmv';
    var testPoints = 1000;
    var startPoints = 0;

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
        var deleteQuery = 'DELETE FROM pointCodes WHERE code=$1;';
        var updateQuery = 'UPDATE people SET points=$1 WHERE \
        email=\'zack@kde.org\'';

        app.db.dbQuery(function (db) {
            db.query(deleteQuery, [testCode], function(err, result) {
                if (err) {
                    console.warn("Couldn't clean the db after the point redeem test!");
                    console.log(err);
                }
                db.query(updateQuery, [startPoints], function(err, result) {
                    if (err) {
                        console.warn("Couldn't clean the db for the point redeem test!");
                        console.log(err);
                    }
                    done();
                });
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
                "device":'VIVALDI-1',
                "authStatus":true,
                "points":startPoints,
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

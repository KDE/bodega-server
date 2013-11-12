/*
    Copyright 2013 Antonis Tsiapaliokas <kok3rs@gmail.com>

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
var errors = require('../lib/errors.js');
var utils = require('./support/utils');

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var pg = require('pg');

describe('Purchase Asset', function() {
    var cookie;
    var folderPath;

    utils.auth();

    describe('Purchase asset without enough points', function() {
        it('should fail', function(done) {
            utils.getUrl('purchase/26',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'AccountNotEnoughPoints');
                    done();
                });
        });
    });

    describe('Purchase asset with enough points', function() {
        it('should be purchased successfully', function(done) {
            utils.getUrl('purchase/25',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', true);
                    done();
                });
        });
    });

    describe('Check point distribution', function() {
        var receipt = {};
        before(function(done) {
            pg.connect(utils.dbConnectionString,
                function(err, client, finis) {
                    client.query("SELECT points, toParticipant, toStore FROM purchases \
                                  WHERE asset = 25 AND email = 'zack@kde.org' \
                                  ORDER BY purchasedOn DESC LIMIT 1", [],
                                 function(err, result) {
                                     assert(!err);
                                     result.should.have.property.rows;
                                     result.rows.should.have.property('length', 1);
                                     receipt = result.rows[0];
                                     finis();
                                     done();
                                 });
                });
       });

       it('should have the correct number of points', function(done) {
            receipt.should.have.property('points', 1180);
            done();
       });

       it('should have points for the publisher', function(done) {
            receipt.should.have.property('toparticipant', 1000);
            done();
       });

       it('should have receipt for the distributor', function(done) {
            receipt.should.have.property('tostore', 0);
            done();
       });

       it('should have receipt for the warehouse', function(done) {
            assert(receipt.points - receipt.toparticipant - receipt.tostore == 180);
            done();
       });
    });

    describe('Purchase asset which is not valid', function() {
        it('should be purchased successfully', function(done) {
            utils.getUrl('purchase/999',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property('type', 'InvalidAsset');
                    done();
                });
        });
    });

    describe('Download the purchased asset', function() {
        it('should download the asset', function(done) {
            utils.getStream('download/25',
                function(res) {
                    res.statusCode.should.equal(200);
                    done();
                });
        });
    });

    describe('Download an asset that cost points without being purchased', function() {
        it('should fail due to wrong permition', function(done) {
            utils.getUrl('download/26',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property('type', 'AccessDenied');
                    done();
                });
        });
    });

    describe('Download an asset that is free', function() {
        it('should be purchased successfully', function(done) {
            utils.getUrl(
                'purchase/14',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', true);
                    done();
                });
        });

        it('should download correctly', function(done) {
            utils.getStream('download/14',
                function(res) {
                    res.statusCode.should.equal(200);
                    done();
                });
        });
    });

    after(function(done) {
        // we delay the cleanup by 500ms as a complete hack
        // the client side closes as soon as it has received all the data it expects
        // the server side request continues on, however; so recording the download
        // happens ASYNCHRONOUSLY to this after function
        // the 500ms timeout just gives the server side of this request time to finish
        setTimeout(function() {
        pg.connect(utils.dbConnectionString,
            function(err, client, finis) {
                client.query("delete from purchases where asset in (25, 14) and email = 'zack@kde.org'", [],
                function(err, result) {
                    client.query("delete from downloads where address = $1", ['127.0.0.1'],
                    function(err, result) {
                        client.query("update people set points = 10000 where email ='zack@kde.org'", [],
                        function(err, result) {
                            client.query("update partners set earnedPoints = 0, owedPoints = 0 where name = 'KDE'", [],
                            function(err, result) {
                                finis();
                                done();
                            });
                        });
                    });
               });
          });
        }, 500);
    });
});

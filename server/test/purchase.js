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
var utils = require('./support/utils');
var fs = require('fs');
var path = require('path');

describe('Purchase Asset', function() {
    var cookie;
    var folderPath;

    utils.auth();

    describe('Purchase asset without enough points', function() {
        it('should fail', function(done) {
            utils.getUrl('purchase/26',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'PurchaseNotEnoughPoints');
                    done();
                });
        });
    });

    describe('Purchase asset with enough points', function() {
        it('should be purchased successfully', function(done) {
            utils.getUrl('purchase/25',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', true);
                    done();
                });
        });
    });

    describe('Purchase asset which is not valid', function() {
        it('should be purchased successfully', function(done) {
            utils.getUrl('purchase/999',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property('type', 'InvalidAsset');
                    done();
                });
        });
    });

    describe('Download the purchased asset', function() {
        //we are inside the server/test, we must go to server
        folderPath = path.dirname(__dirname) + '/content/24';
        it('should create a folder with the id of the asset first', function(done) {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, "0700");
            }
            done();
        });

        it('should create an empty file first', function(done) {
            fs.openSync(folderPath + 'org.kde.poker1.plasmoid', 'w');
            done();
        });

        it('should download the asset', function(done) {
            var opts = {
                stream: true,
                html: false
            };

            utils.getHtml('download/25',
                function(res) {
                    res.statusCode.should.equal(200);

                    if (opts && opts.stream) {
                        console.log("uparxei to stream")
                    }
                    done();
                }, opts);
        });
    });

    describe('Download an asset that cost points without being purchased', function() {
        it('should fail due to wrong permition', function(done) {
            utils.getUrl('download/26',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
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
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('points');
                    res.body.should.have.property('success', true);
                    done();
                });
        });
        it('should download correctly', function(done) {
            utils.getUrl('download/14',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/octet-stream');
                    done();
                }, true);
        });
    });

    describe('should remove the test asset', function() {
        it('should remove the test file first', function(done) {
            fs.unlinkSync(folderPath + '/org.kde.poker1.plasmoid');
            done();
        });
        it('should remove the test folder', function(done) {
            fs.rmdirSync(folderPath);
            done();
        });
    });

});

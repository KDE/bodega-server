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

var mime = require('mime');
var path = require('path');
var pg = require('pg');
var fs = require('fs');
var http = require('http');
var async = require('async');
var request = require('request');
var Cookie = require('cookie-jar');

function postFiles(server, dst, files, cookie, fn)
{
    var url = 'http://' + server.address().address + ':' +
            server.address().port + utils.baseJsonPath + dst;
    var obj = {
        url : url,
        cookie: cookie
    };
    var r = request.post(obj, function(err, res, body) {
        try {
            res.body = JSON.parse(body);
        } catch (e) {
            console.log('Error parsing JSON response to ' + url + ': ' + e.message);
            console.log('Body returned was ' + body);
            res.body = body;
        }
        fn(res);
    });
    var form = r.form();
    var filePath;

    for (var i = 0; i < files.length; ++i) {
        filePath = path.join(__dirname, files[i].filename);
        form.append(files[i].name,
                    fs.createReadStream(filePath));
    }
}

utils.auth({}, function(res, done) {
    var j = request.jar();
    request = request.defaults({jar :j });
    j.add(new Cookie(utils.cookie[0]));
    done();
});

describe('Asset manipulation', function(){
    var db;
    var dbSnapshotBefore;
    before(function(done) {
        utils.dbSnapshot(server, null, function(err, res) {
            if (err) {
                console.log("Couldn't snapshot the db!");
            }
            dbSnapshotBefore = res;
            done();
        });
    });

    var incompleteAssetId;
    var completeAssetId;
    var cleanupAssets = [];

    function deleteAsset(assets, i, cb)
    {
        var asset = assets[i];
        utils.getUrl('asset/delete/' + asset,
            function(res) {
                ++i;
                cb(null, assets, i);
            },
            utils.cookie);
    }

    function deleteCompleteAsset(assets, i, cb)
    {
        var deleteQuery = 'DELETE FROM assets WHERE id=$1;';
        app.db.dbQuery(function(db) {
            db.query(deleteQuery, [assets[i]], function(err, result) {
                cb(null, assets, i);
            });
        });
    }

    describe('Creation', function(){
        it('allow incomplete assets', function(done){
            postFiles(server.server,
                    'asset/create',
                    [{
                        "name" : "info",
                        "filename" : "sampleasset/sample-info-incomplete.json"
                    }, {
                        "name" : "asset",
                        "filename" : "sampleasset/sample.pdf"
                    }], utils.cookie,
                      function(res) {
                          res.body.should.have.property('authStatus', true);
                          res.body.should.not.have.property('error');
                          res.body.should.have.property('asset');
                          res.body.asset.should.have.property('id');
                          incompleteAssetId = res.body.asset.id;
                          cleanupAssets.push(incompleteAssetId);
                          done();
                      });
        });

        it('of a simple asset', function(done){
            postFiles(server.server,
                    'asset/create',
                    [{
                        "name" : "info",
                        "filename" : "sampleasset/sample-info.json"
                    }, {
                        "name" : "asset",
                        "filename" : "sampleasset/sample.pdf"
                    },{
                        "name" : "sample-0.png",
                        "filename" : "sampleasset/sample-0.png"
                    },{
                        "name" : "sample-1.png",
                        "filename" : "sampleasset/sample-1.png"
                    },{
                        "name" : "cover.jpg",
                        "filename" : "sampleasset/cover.jpg"
                    }], utils.cookie,
                      function(res) {
                          res.body.should.have.property('authStatus', true);
                          res.body.should.not.have.property('error');
                          res.body.should.have.property('asset');
                          res.body.asset.should.have.property('id');
                          res.body.asset.should.have.property('name');
                          completeAssetId = res.body.asset.id;
                          cleanupAssets.push(completeAssetId);
                          done();
                      });
        });
    });


    describe('Updates', function(){
        it('works with incomplete assets', function(done){
            postFiles(server.server,
                      'asset/update/' + incompleteAssetId,
                      [{
                          "name" : "info",
                          "filename" : "sampleasset/sample-info-update1.json"
                      }, {
                          "name" : "cover.jpg",
                          "filename" : "sampleasset/cover.jpg"
                      }, {
                          "name" : "sample-1.png",
                          "filename" : "sampleasset/sample-1.png"
                      }], utils.cookie,
                      function(res) {
                          res.body.should.have.property('authStatus', true);
                          res.body.should.not.have.property('error');
                          res.body.should.have.property('asset');
                          res.body.asset.should.have.property('id');
                          done();
                      });
        });
    });

    describe('Listing assets', function(){
        it('lists published by default', function(done){
            utils.getUrl('asset/list',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(25);
                    done();
                },
                utils.cookie);
        });
        it('lists published when asked', function(done){
            utils.getUrl('asset/list/published',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(25);
                    done();
                },
                utils.cookie);
        });
        it('lists incoming when asked', function(done){
            utils.getUrl('asset/list/incoming',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(2);
                    done();
                },
                utils.cookie);
        });
        it('lists all when asked', function(done){
            utils.getUrl('asset/list/all',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(27);
                    done();
                },
                utils.cookie);
        });
    });

    describe('Deletion', function(){
        it('should work a complete assets', function(done){
            utils.getUrl('asset/delete/' + completeAssetId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('id',
                                                        completeAssetId);
                    done();
                },
                utils.cookie);
        });
        it('should work with incomplete assets', function(done){
            utils.getUrl('asset/delete/' + incompleteAssetId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('id',
                                                        incompleteAssetId);
                    done();
                },
                utils.cookie);
        });
        it('should not work with already delete assets', function(done){
            utils.getUrl('asset/delete/' + incompleteAssetId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type', 'AssetMissing');
                    done();
                },
                utils.cookie);
        });

        it('listing incoming after deletion shouldnt return any', function(done){
            utils.getUrl('asset/list/incoming',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(0);
                    done();
                },
                utils.cookie);
        });
    });

    describe('Posting', function(){
        before(function(done){
            var finished = 0;
            postFiles(server.server,
                    'asset/create',
                    [{
                        "name" : "info",
                        "filename" : "sampleasset/sample-info-incomplete.json"
                    }, {
                        "name" : "asset",
                        "filename" : "sampleasset/sample.pdf"
                    }], utils.cookie,
                      function(res) {
                          res.body.should.have.property('authStatus', true);
                          res.body.should.not.have.property('error');
                          res.body.should.have.property('asset');
                          res.body.asset.should.have.property('id');
                          incompleteAssetId = res.body.asset.id;
                          cleanupAssets.push(incompleteAssetId);
                          ++finished;
                          if (finished === 2) {
                              done();
                          }
                      });
            postFiles(server.server,
                    'asset/create',
                    [{
                        "name" : "info",
                        "filename" : "sampleasset/sample-info.json"
                    }, {
                        "name" : "asset",
                        "filename" : "sampleasset/sample.pdf"
                    },{
                        "name" : "sample-0.png",
                        "filename" : "sampleasset/sample-0.png"
                    },{
                        "name" : "sample-1.png",
                        "filename" : "sampleasset/sample-1.png"
                    },{
                        "name" : "cover.jpg",
                        "filename" : "sampleasset/cover.jpg"
                    }], utils.cookie,
                      function(res) {
                          res.body.should.have.property('authStatus', true);
                          res.body.should.not.have.property('error');
                          res.body.should.have.property('asset');
                          res.body.asset.should.have.property('id');
                          res.body.asset.should.have.property('name');
                          completeAssetId = res.body.asset.id;
                          cleanupAssets.push(completeAssetId);
                          ++finished;
                          if (finished === 2) {
                              done();
                          }
                      });
        });
        it('should work with a complete asset', function(done){
            utils.postUrl('asset/post/' + completeAssetId, null,
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    deleteCompleteAsset([completeAssetId], 0, function(){});
                    done();
                },
                utils.cookie);
        });
    });

    /* Make sure that even after an error we delete the assets
     *  that we created for the test */
    after(function(done) {
        var i;
        var deleted = 0;
        var numToDelete = cleanupAssets.length;
        var funcs = [function(cb) {
            cb(null, cleanupAssets, 0);
        }];
        if (!server || !numToDelete) {
            done();
            return;
        }
        for (i = 0; i < numToDelete; ++i) {
            funcs.push(deleteAsset);
        }

        async.waterfall(funcs, function() {
            utils.dbSnapshot(server, null, function(err, res) {
                var dbSnapshotAfter = res;
                if (err) {
                    console.log("Couldn't snapshot the db!");
                }
                dbSnapshotAfter.should.eql(dbSnapshotBefore);
                done();
            });
        });
    });
});

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
var fs = require('fs');
var http = require('http');
var async = require('async');
var request = require('request');
var Cookie = require('cookie-jar');

function postFiles(server, dst, files, cookie, fn)
{
    var url = 'http://' + server.address().address + ':' +
            server.address().port + dst;
    var obj = {
        url : url,
        cookie: cookie
    };
    var r = request.post(obj, function(err, res, body) {
        res.body = JSON.parse(body);
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
describe('Asset manipulation', function(){
    var cookie;
    var incompleteAssetId;
    var completeAssetId;
    var cleanupAssets = [];
    describe('Authentication', function(){
        it('should succeed.', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=null',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    cookie = res.headers['set-cookie'];
                    var j = request.jar();
                    request = request.defaults({jar :j });
                    j.add(new Cookie(cookie[0]));
                    res.body.should.have.property('authStatus', true);
                    done();
                });
        });
    });


    function deleteAsset(assets, i, cb)
    {
        var asset = assets[i];
        utils.getUrl(
            server,
            '/bodega/v1/json/asset/delete/' + asset,
            function(res) {
                ++i;
                cb(null, assets, i);
            },
            cookie);
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
                    '/bodega/v1/json/asset/create',
                    [{
                        "name" : "info",
                        "filename" : "sampleasset/sample-info-incomplete.json"
                    }, {
                        "name" : "asset",
                        "filename" : "sampleasset/sample.pdf"
                    }], cookie,
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
                    '/bodega/v1/json/asset/create',
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
                    }], cookie,
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
                      '/bodega/v1/json/asset/update/' + incompleteAssetId,
                      [{
                          "name" : "info",
                          "filename" : "sampleasset/sample-info-update1.json"
                      }, {
                          "name" : "cover.jpg",
                          "filename" : "sampleasset/cover.jpg"
                      }, {
                          "name" : "sample-1.png",
                          "filename" : "sampleasset/sample-1.png"
                      }], cookie,
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
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/list',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(25);
                    done();
                },
                cookie);
        });
        it('lists published when asked', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/list/published',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(25);
                    done();
                },
                cookie);
        });
        it('lists incoming when asked', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/list/incoming',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(2);
                    done();
                },
                cookie);
        });
        it('lists all when asked', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/list/all',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(27);
                    done();
                },
                cookie);
        });
    });

    describe('Deletion', function(){
        it('should work a complete assets', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/delete/' + completeAssetId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('id',
                                                        completeAssetId);
                    done();
                },
                cookie);
        });
        it('should work with incomplete assets', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/delete/' + incompleteAssetId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('id',
                                                        incompleteAssetId);
                    done();
                },
                cookie);
        });
        it('should not work with already delete assets', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/delete/' + incompleteAssetId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type', 'AssetMissing');
                    done();
                },
                cookie);
        });

        it('listing incoming after deletion shouldnt return any', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/list/incoming',
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    res.body.should.have.property('assets');
                    res.body.assets.length.should.be.equal(0);
                    done();
                },
                cookie);
        });
    });

    describe('Posting', function(){
        before(function(done){
            var finished = 0;
            postFiles(server.server,
                    '/bodega/v1/json/asset/create',
                    [{
                        "name" : "info",
                        "filename" : "sampleasset/sample-info-incomplete.json"
                    }, {
                        "name" : "asset",
                        "filename" : "sampleasset/sample.pdf"
                    }], cookie,
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
                    '/bodega/v1/json/asset/create',
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
                    }], cookie,
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
            utils.postUrl(
                server,
                '/bodega/v1/json/asset/post/' + completeAssetId, null,
                function(res) {
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    deleteCompleteAsset([completeAssetId], 0, function(){});
                    done();
                },
                cookie);
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
        async.waterfall(funcs, function(){ done(); });
    });
});

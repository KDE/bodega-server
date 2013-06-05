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


function encodeFilePart(boundary, name, filename)
{
    var type = mime.lookup(filename);
    var str = "--" + boundary + "\r\n";
    str += "Content-Disposition: form-data; name=\"" +
        name + "\"; filename=\"" + filename + "\"\r\n";
    str += "Content-Type: " + type + "\r\n\r\n";

    str += fs.readFileSync(filename);

    str += '\r\n';

    return str;
}


function postFiles(server, url, files, cookie, fn)
{
    var boundary = Math.random();

    var data = "";

    for (var i = 0; i < files.length; ++i) {
        data += encodeFilePart(boundary, files[i].name,
                               __dirname + '/' + files[i].filename);
    }
    data += "--" + boundary + "--\r\n";

    var options = {
        host: server.address().address,
        port: server.address().port,
        path: url,
        method: 'POST',
        headers : {
            'Content-Type' : 'multipart/form-data; boundary=' + boundary,
            'Content-Length' : Buffer.byteLength(data),
            'Cookie': cookie
        }
    };

    var postReq = http.request(options, function(response){
        response.setEncoding('utf8');
        var buf = '';
        response.on('data', function(chunk){
            //console.log(chunk);
            buf += chunk;
        });
        response.on("end", function() {
            response.body = JSON.parse(buf);
            fn(response);
        });
    });

    postReq.write(data);
    postReq.end();

    //console.log(data);
}

describe('Asset manipulation', function(){
    var cookie;
    var incompleteAssetId;
    var completeAssetId;
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
                    res.body.should.have.property('authStatus', true);
                    done();
                });
        });
    });

    describe('Creation', function(){
        it('allow incomplete assets', function(done){
            postFiles(server.server,
                    '/bodega/v1/json/create',
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
                          done();
                      });
        });

        it('of a simple asset', function(done){
            postFiles(server.server,
                    '/bodega/v1/json/create',
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
                        "name" : "icon.jpg",
                        "filename" : "sampleasset/icon.jpg"
                    }], cookie,
                      function(res) {
                          res.body.should.have.property('authStatus', true);
                          res.body.should.not.have.property('error');
                          res.body.should.have.property('asset');
                          res.body.asset.should.have.property('id');
                          res.body.asset.should.have.property('name');
                          completeAssetId = res.body.asset.id;
                          done();
                      });
        });
    });


    describe('Updates', function(){
        it('works with incomplete assets', function(done){
            postFiles(server.server,
                      '/bodega/v1/json/update?assetId='+incompleteAssetId,
                      [{
                          "name" : "info",
                          "filename" : "sampleasset/sample-info-update1.json"
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
                '/bodega/v1/json/listAssets',
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
                '/bodega/v1/json/listAssets?type=published',
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
                '/bodega/v1/json/listAssets?type=incoming',
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
                '/bodega/v1/json/listAssets?type=all',
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
                '/bodega/v1/json/delete?assetId='+completeAssetId,
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
                '/bodega/v1/json/delete?assetId='+incompleteAssetId,
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
                '/bodega/v1/json/delete?assetId='+incompleteAssetId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property(
                        'type', 'DeleteAssetMissing');
                    done();
                },
                cookie);
        });

        it('listing incoming after deletion shouldnt return any', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/listAssets?type=incoming',
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

    /* Make sure that even after an error we delete the assets
     *  that we created for the test */
    after(function(done) {
        if (!server || (!completeAssetId && !incompleteAssetId)) {
            done();
            return;
        }
        utils.getUrl(
            server,
            '/bodega/v1/json/delete?assetId='+completeAssetId,
            function(res) {
            },
            cookie);
        utils.getUrl(
            server,
            '/bodega/v1/json/delete?assetId='+incompleteAssetId,
            function(res) {
                done();
            },
            cookie);
    });
});

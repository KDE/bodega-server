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
        host: 'localhost',
        port: app.config.port,
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

describe('Asset creation', function(){
    var cookie;
    describe('needs to authorize first', function(){
        it('authorize correctly.', function(done){
            var expected = {
                "store":"VIVALDI-1",
                "authStatus":true,
                "points" : 10000,
                "imageUrls": {
                    "tiny":"http://0.0.0.0:3000/images/22",
                    "small":"http://0.0.0.0:3000/images/32",
                    "medium":"http://0.0.0.0:3000/images/64",
                    "large":"http://0.0.0.0:3000/images/128",
                    "huge":"http://0.0.0.0:3000/images/512",
                    "previews":"http://0.0.0.0:3000/images/previews"
                }
            };
            utils.getUrl(
                app,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=VIVALDI-1',
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

    describe('Basic fetch', function(){
        it('should show info for an asset', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/6',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('id', 6);
                    res.body.asset.should.have.property('partnerId');
                    res.body.asset.should.have.property('license');
                    res.body.asset.should.have.property('version');
                    res.body.asset.should.have.property('filename');
                    res.body.asset.should.have.property('image');
                    res.body.asset.should.have.property('name');
                    res.body.asset.should.have.property('description');
                    done();
                },
                cookie);
        });
        it('should fetch tags', function(done){
            postFiles(server,
                    '/bodega/v1/json/create',
                    [{
                        "name" : "info",
                        "filename" : "mocha.opts"
                    }, {
                        "name" : "mocha",
                        "filename" : "mocha.opts"
                    }], cookie,
                      function(res) {
                          console.log(res.body);
                          console.log('done');
                          done();
                      });
        });
    });
});

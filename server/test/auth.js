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

describe('Authentication', function(){
    describe('when arguments are missing', function(){
        it('should report error', function(done){
            var expected = {
                "device":0,
                "authStatus":false,
                "points":0,
                "error": {"type": "MissingParameters"}
            };
            utils.getUrl(server,
                         '/bodega/v1/json/auth',
                         function(res) {
                             res.statusCode.should.equal(200);
                             res.headers.should.have.property(
                                 'content-type',
                                 'application/json; charset=utf-8');
                             res.body.should.eql(expected);
                             done();
                         });
        });
    });

     describe('when arguments are empty', function(){
        it('should report error', function(done){
            var expected = {
                "device":0,
                "authStatus":false,
                "points":0,
                "error": {"type" : "MissingParameters"}
            };
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=&auth_password=&auth_device=',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.eql(expected);
                    done();
                });
        });
    });

    describe('when username is wrong', function(){
        it('should report error', function(done){
            var expected = {
                "device":0,
                "authStatus":false,
                "points":0,
                "error": {"type" : "MissingParameters"}};
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=&auth_password=&auth_device=',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.eql(expected);
                    done();
                });
        });
    });

    describe('when password is wrong', function(){
        it('should report error', function(done){
            var expected = {
                "device":0,
                "authStatus":false,
                "points":0,
                "error": {"type" : "NoMatch"}};
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=bad_password&auth_device=2',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.eql(expected);
                    done();
                });
        });
    });

    describe('when device is wrong', function(){
        it('should report error', function(done){
            var expected = {
                "device":0,
                "authStatus":false,
                "points":0,
                "error": {"type" : "NoMatch" }};
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_device=5',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.eql(expected);
                    done();
                });
        });
    });

    describe('proper authorization', function(){
        it('authorize correctly.', function(done){
            var expected = {
                "userId": 1,
                "device":"VIVALDI-1",
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
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_device=VIVALDI-1',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.eql(expected);
                    done();
                });
        });
    });
});

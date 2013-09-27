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

describe('Authentication', function(){
    describe('when arguments are missing', function(){
        it('should report error', function(done){
            var expected = {
                "authStatus":false,
                "device":0,
                "store":0,
                "points":0,
                "success": false,
                "error": {"type": "MissingParameters"}
            };
            utils.getUrl('auth',
                         function(res) {
                             res.statusCode.should.equal(200);
                             res.headers.should.have.property('content-type');
                             res.body.should.eql(expected);
                             done();
                         },
                         { noAuth: true });
        });
    });

     describe('when arguments are empty', function(){
        it('should report error', function(done){
            var expected = {
                "authStatus":false,
                "device":0,
                "store":0,
                "points":0,
                "success": false,
                "error": {"type" : "MissingParameters"}
            };
            utils.getUrl('auth?auth_user=&auth_password=&auth_store=',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                },
                { noAuth: true });
        });
    });

    describe('when username is wrong', function(){
        it('should report error', function(done){
            var expected = {
                "authStatus":false,
                "device":0,
                "store":0,
                "points":0,
                "success":false,
                "error": {"type" : "MissingParameters"}};
            utils.getUrl('auth?auth_user=&auth_password=&auth_store=',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                },
                { noAuth: true });
        });
    });

    describe('when password is wrong', function(){
        it('should report error', function(done){
            var expected = {
                "authStatus":false,
                "device":0,
                "store":0,
                "points":0,
                "success":false,
                "error": {"type" : "NoMatch"}};
            utils.getUrl('auth?auth_user=zack@kde.org&auth_password=bad_password&auth_store=2',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                },
                { noAuth: true });
        });
    });

    describe('when store is wrong', function(){
        it('should report error', function(done){
            var expected = {
                "authStatus":false,
                "device":0,
                "store":0,
                "points":0,
                "success":false,
                "error": {"type" : "NoMatch" }};
            utils.getUrl('auth?auth_user=zack@kde.org&auth_password=zack&auth_store=5',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                },
                { noAuth: true });
        });
    });

    describe('proper authorization', function(){
        it('authorize correctly.', function(done){
            var hostname = 'http://' + app.config.host + ':' + app.config.port;
            var expected = {
                "authStatus":true,
                "device":"VIVALDI-1",
                "store":"VIVALDI-1",
                "points": 10000,
                "success": true,
                "imageUrls": {
                        "tiny": hostname + "/icons/22",
                       "small": hostname + "/icons/32",
                      "medium": hostname + "/icons/64",
                         "big": hostname + "/icons/128",
                       "large": hostname + "/icons/256",
                        "huge": hostname + "/icons/512",
                    "previews": hostname + "/previews"
                },
                "active": true
            };
            utils.getUrl('auth?auth_user=zack@kde.org&auth_password=zack&auth_store=VIVALDI-1',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.eql(expected);
                    done();
                },
                { noAuth: true });
        });
    });
});

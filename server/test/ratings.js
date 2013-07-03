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

describe('Ratings', function() {
    var cookie;
    describe('needs to authorize first', function(){
        it('authorize correctly.', function(done){
            var expected = {
                "store":"VIVALDI-1",
                "authStatus":true,
                "points" : 10000,
                "imageUrls": {
                    "tiny":"http://0.0.0.0:3000/icons/22",
                    "small":"http://0.0.0.0:3000/icons/32",
                    "medium":"http://0.0.0.0:3000/icons/64",
                    "large":"http://0.0.0.0:3000/icons/128",
                    "huge":"http://0.0.0.0:3000/icons/512",
                    "previews":"http://0.0.0.0:3000/previews"
                }
            };
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=KDE-1',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.headers.should.have.property('set-cookie');
                    cookie = res.headers['set-cookie'];
                    res.body.should.have.property('authStatus', true);
                    done();
                });
        });
    });

    describe('List Attributes', function() {
        it('it should failed due to invalid asset', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/ratingattributes/1000',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('ratingAttributes');
                    res.body.ratingAttributes.should.have.length(0);
                    done();
                },
                cookie);
        });
        it('it should succeed', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/ratingattributes/2',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('ratingAttributes');
                    var ratingAttributes = res.body.ratingAttributes;
                    ratingAttributes.should.be.an.instanceOf(Array);
                    ratingAttributes.length.should.be.above(0);
                    done();
                },
                cookie);
        });
    });
});


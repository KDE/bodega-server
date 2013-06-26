/*
    Copyright 2013 Coherent Theory LLC

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

var pg = require('pg');
var server = require('../app.js');
var utils = require('./support/http');
var querystring = require('querystring');


describe('Tags manipulation', function(){
    var cookie;
    describe('initialization', function() {
        it('authorize correctly.', function(done) {
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

    function listTags(asset, store, type, cb) {
        utils.getUrl(
            server,
            '/bodega/v1/json/tag/list',
            function(res) {
                cb(res);
            },
            cookie);
    }

    describe('Tags', function() {
        it('List all tags', function(done) {
            var cb = function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('tags');

                res.body.tags.length.should.equal(27);
                res.body.tags[0].id.should.be.eql(1);
                res.body.tags[0].type.should.be.eql(7);
                res.body.tags[0].typename.should.be.eql('mimetype');
                res.body.tags[0].title.should.be.eql('application/x-plasma');
                done();
            }
            listTags(null, null, null, cb);
        });
    });
});

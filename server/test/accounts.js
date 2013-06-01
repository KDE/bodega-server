/*
    Copyright 2012 Antonis Tsiapaliokas <kok3rs@gmail.com>

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
var utils = require('./support/http.js');
var assert = require('assert');
var queryString = require('querystring');

describe('Create user', function() {
    var userInfo;
    it('register successful', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/register?firstname=antonis&lastname=tsiapaliokas&email=kok3rs@gmail.com&password=123456789',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('userId');
                res.body.should.have.property('confirmationCode');
                userInfo = {
                    'email' : 'kok3rs@gmail.com',
                    'id' : res.body.userId,
                    'code': res.body.confirmationCode
                };
                done();
            });
    });
    describe('needs to activate', function() {
        it('should activate', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/register/confirm?' + queryString.stringify(userInfo),
                function(res) {
                    var activationState = res.body.indexOf('Success!') > -1;

                    assert.equal(activationState, true);
                    done();
                });
        });
    });
});

describe('Deactivate user', function() {
    var cookie;
    describe('needs to authorize first', function() {
        it('authotize correctly', function(done) {
            utils.getUrl(server,
            '/bodega/v1/json/auth?auth_user=kok3rs@gmail.com&auth_password=123456789&auth_device=VIVALDI-1',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.headers.should.have.property('set-cookie');
                cookie = res.headers['set-cookie'];
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('device', 'VIVALDI-1');
                res.body.should.have.property('store', 'VIVALDI-1');
                res.body.should.have.property('points');
                res.body.should.have.property('success', true);
                res.body.should.have.property('active', true);
                done();
            });
        });
    });

    describe('disable account', function() {
        it('disable successfuly', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/participant/changeAccountDetails&active=false',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('device', 'VIVALDI-1');
                    res.body.should.have.property('store', 'VIVALDI-1');
                    res.body.should.have.property('points');
                    res.body.should.have.property('success');
                    done();
                },
                cookie);
         });
    });
});


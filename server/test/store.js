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

var server = require('../app.js');
var utils = require('./support/http');
var queryString = require('querystring');

describe('Store management', function(){
    var cookie;

    describe('Creating a store without authenticating', function(){
        it('should fail', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/store/create',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'Unauthorized');
                    done();
                },
                cookie);
        });
    });

    describe('Create a store with someone who is not authorized to do so', function(){
        it('Authorize with a person who is NOT a Store Manager', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=aseigo@kde.org&auth_password=aseigo&auth_store=VIVALDI-1',
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
        it('Creation request should fail', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/store/create',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'StorePartnerInvalid');
                    done();
                },
                cookie);
        });
    });

    describe('Authorize as a person who is a Store Manager', function(){
        it('authorize correctly.', function(done){
            utils.getUrl(
                server,
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

    describe('create a store', function(){
        it('should fail with an invalid partner', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/store/create?partner=3',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'StorePartnerInvalid');
                    done();
                },
                cookie);
        });

        it('should fail without a name', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/store/create?partner=2',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'StoreNameInvalid');
                    done();
                },
                cookie);
        });

        it('should succeed with a valid partner and name', function(done){
            var query =
                { 'partner' : 2,
                  'name': 'Fun Times With Clowns',
                  'desc': 'Clowns are actually scary'
                };
            utils.getUrl(
                server,
                '/bodega/v1/json/store/create?' + queryString.stringify(query),
                function(res) {
                    var expected = [ {
                        'id': '2_FUN_TIMES_WITH_CLOWNS',
                        'name': 'Fun Times With Clowns',
                        'desc': 'Clowns are actually scary',
                        'partner': { 'id': 2, 'name': 'KDE' },
                        'markups': { 'min': 0, 'max': 0,
                                     'flat': false, 'markup': 0 }
                    } ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('storeInfo');
                    res.body.storeInfo.should.eql(expected);
                    done();
                },
                cookie);
        });

        it('should succeed with a name and no partner explicitly specified', function(done){
            var query =
                { 'id': 'somethingcrazy',
                  'name': 'More Fun',
                  'desc': ''
                };
            utils.getUrl(
                server,
                '/bodega/v1/json/store/create?' + queryString.stringify(query),
                function(res) {
                    var expected = [ {
                        'id': 'somethingcrazy',
                        'name': 'More Fun',
                        'desc': '',
                        'partner': { 'id': 2, 'name': 'KDE' },
                        'markups': { 'min': 0, 'max': 0,
                                     'flat': false, 'markup': 0 }
                    } ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('storeInfo');
                    res.body.storeInfo.should.eql(expected);
                    done();
                },
                cookie);
        });

        it('should fail with an id that exists', function(done){
            var query =
                { 'partner' : 2,
                  'name': 'Fun Times With Clowns',
                };
            utils.getUrl(
                server,
                '/bodega/v1/json/store/create?' + queryString.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'StoreIdExists');
                    done();
                },
                cookie);
        });

    });

    describe('list stores', function() {
        it('should list all stores associated with the authentication person',
           function(done) {
                utils.getUrl(
                    server,
                    '/bodega/v1/json/store/list',
                    function(res) {
                        var expected = [
                        {
                            'id': '2_FUN_TIMES_WITH_CLOWNS',
                            'name': 'Fun Times With Clowns',
                            'desc': 'Clowns are actually scary',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 0, 'max': 0,
                            'flat': false, 'markup': 0 }
                        },
                        {
                            'id': 'KDE-1',
                            'name': 'Plasma Workspace',
                            'desc': 'KDE Plasma user interfaces',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 0, 'max': 0,
                            'flat': true, 'markup': 0 }
                        },
                        {
                            'id': 'somethingcrazy',
                            'name': 'More Fun',
                            'desc': '',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 0, 'max': 0,
                            'flat': false, 'markup': 0 }
                        },
                        {
                            'id': 'VIVALDI-1',
                            'name': 'MPL',
                            'desc': 'Usage of PA',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 0, 'max': 0,
                            'flat': true, 'markup': 0 }
                        }
                        ];

                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json; charset=utf-8');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('success', true);
                        res.body.storeInfo.should.eql(expected);
                        done();
                    },
                    cookie);
           });
    });

    describe('delete a store', function() {
        it('should succeed with a valid store', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/store/delete?id=2_FUN_TIMES_WITH_CLOWNS',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });

        it('should succeed with another valid store', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/store/delete?id=somethingcrazy',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });
    });

    describe('list stores after deletion of new stores', function() {
        it('should list all stores associated with the authentication person',
           function(done) {
                utils.getUrl(
                    server,
                    '/bodega/v1/json/store/list',
                    function(res) {
                        var expected = [
                        {
                            'id': 'KDE-1',
                            'name': 'Plasma Workspace',
                            'desc': 'KDE Plasma user interfaces',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 0, 'max': 0,
                            'flat': true, 'markup': 0 }
                        },
                        {
                            'id': 'VIVALDI-1',
                            'name': 'MPL',
                            'desc': 'Usage of PA',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 0, 'max': 0,
                            'flat': true, 'markup': 0 }
                        }
                        ];

                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json; charset=utf-8');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('success', true);
                        res.body.storeInfo.should.eql(expected);
                        done();
                    },
                    cookie);
           });
    });
});

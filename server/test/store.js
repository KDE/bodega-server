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
var queryString = require('qs');

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

    describe('Store creation', function(){
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

    describe('Store listing', function() {
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

    describe('Setting markups', function() {
        it('should fail on a non-existant store', function(done) {
            var query = {
                'id': 'does_not_exist',
                'maxmarkup': 100,
                'minmarkup': 10,
                'flatmarkup': true,
                'markup': 20
            };

            utils.getUrl(
                server,
                '/bodega/v1/json/store/setMarkups?' + queryString.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type',
                                                     'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property('type', 'StoreIdInvalid');
                    done();
                },
                cookie);
        });

        it('should fail on a store that exists, but we are not authorized to manage', function(done) {
            var query = {
                'id': 'DD-2',
                'maxmarkup': 100,
                'minmarkup': 10,
                'flatmarkup': true,
                'markup': 20
            };

            utils.getUrl(
                server,
                '/bodega/v1/json/store/setMarkups?' + queryString.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type',
                                                     'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property('type', 'StoreIdInvalid');
                    done();
                },
                cookie);
        });

        it('should succeed on an existing store', function(done) {
            var query = {
                'id': '2_FUN_TIMES_WITH_CLOWNS',
                'maxmarkup': 100,
                'minmarkup': 10,
                'flatmarkup': true,
                'markup': 20
            };

            utils.getUrl(
                server,
                '/bodega/v1/json/store/setMarkups?' + queryString.stringify(query),
                function(res) {
                    var expected = [
                        {
                            'id': '2_FUN_TIMES_WITH_CLOWNS',
                            'name': 'Fun Times With Clowns',
                            'desc': 'Clowns are actually scary',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 10, 'max': 100,
                                         'flat': true, 'markup': 20 }
                        }
                    ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type',
                                                     'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.storeInfo.should.eql(expected);
                    done();
                },
                cookie);
        });

        it('partial updates work as well', function(done) {
            var query = {
                'id': '2_FUN_TIMES_WITH_CLOWNS',
                'maxmarkup': 200,
                'markup': 15
            };

            utils.getUrl(
                server,
                '/bodega/v1/json/store/setMarkups?' + queryString.stringify(query),
                function(res) {
                    var expected = [
                        {
                            'id': '2_FUN_TIMES_WITH_CLOWNS',
                            'name': 'Fun Times With Clowns',
                            'desc': 'Clowns are actually scary',
                            'partner': { 'id': 2, 'name': 'KDE' },
                            'markups': { 'min': 10, 'max': 200,
                                         'flat': true, 'markup': 15 }
                        }
                    ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type',
                                                     'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.storeInfo.should.eql(expected);
                    done();
                },
                cookie);
        });
    });

    describe('Channel manipulation', function() {
        var newChannelId = 0;
        it('should allow adding a new channel', function(done) {
            var query = {
                'id': 'VIVALDI-1',
                'channel': {
                    'name': 'Test Channel',
                    'parent': 2,
                    'description': 'A test channel',
                    'addTags': [130, 131]
                }
            };

            utils.getUrl(
                server,
                '/bodega/v1/json/store/updateChannel?' + queryString.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type',
                                                     'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('channel');
                    res.body.channel.should.have.property('id');
                    res.body.channel.should.have.property('store', 'VIVALDI-1');
                    res.body.channel.should.have.property('parent', 2);
                    res.body.channel.should.have.property('image');
                    res.body.channel.should.have.property('name', 'Test Channel');
                    res.body.channel.should.have.property('description', 'A test channel');
                    res.body.channel.should.have.property('active', true);
                    res.body.channel.should.have.property('assetcount');
                    newChannelId = res.body.channel.id;

                    done();
                },
                cookie);
            });

        it('should be possible to delete that channel', function(done) {
            var query = { 'id': 'VIVALDI-1',
                          'channelId': newChannelId };

            utils.getUrl(
                server,
                '/bodega/v1/json/store/deleteChannel?' + queryString.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type',
                                                     'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });
    });

    describe('Store deletion', function() {
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

        it('listing should reflect deletions',
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

    // always delete the two stores we made, even on error
    after(function(done) {
        var connectionString = app.config.database.protocol + "://" +
                               app.config.database.user + ":" + app.config.database.password +
                               "@" + app.config.database.host + "/" +
                               app.config.database.name;

        pg.connect(connectionString, function(err, client, finis) {
                   client.query("delete from stores where id = '2_FUN_TIMES_WITH_CLOWNS' or id = 'somethingcrazy'", [],
                   function(err, result) {
                       client.query("delete from channels where name = 'Test Channel';", [],
                       function(err, result) {
                           done();
                       });
                   });
        });
    });

});

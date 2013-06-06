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

var pg = require('pg');

var server = require('../app.js');
var utils = require('./support/http');

describe('Collections', function(){
    var cookie;
    var collectionId;
    var collectionName = 'favorites1';
    var assets = [3, 4, 5, 6];
    var assetsToRemove = [4, 5];
    var numCollections = 0;
    describe('without authentication', function(){
        it('shouldnt allow listing collections', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/list',
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
                });
        });
        it('shouldnt allow creating collections', function(done) {
            var params = { name: 'hello' };
            utils.postUrl(
                server,
                '/bodega/v1/json/collections/create',
                params,
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
                });
        });
        it('shouldnt allow deleting collections', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/delete/hello',
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
                });
        });
    });
    describe('authenticate', function(){
        it('should succeed', function(done){
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

    describe('After authentication', function(){
        it('should create', function(done){
            var params = { name: collectionName };
            utils.postUrl(
                server,
                '/bodega/v1/json/collections/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.equal(1);
                    res.body.collections[0].should.have.property('name', collectionName);
                    done();
                },
                cookie);
        });
        it('should list', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/list',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.above(0);
                    numCollections = res.body.collections.length;
                    var collections = res.body.collections;
                    for (var i = 0; i < numCollections; ++i) {
                        collections[i].should.have.property('id');
                        if (collections[i].name === collectionName) {
                            collections[i].should.have.property('name', collectionName);
                            collections[i].should.have.property('public', false);
                            collections[i].should.have.property('wishlist', false);
                            collectionId = res.body.collections[i].id;
                        }
                    }
                    done();
                },
                cookie);
        });

        it('should allow adding assets', function(done){
            var addedAssets = 0;
            /*jshint loopfunc:true */
            for (var i = 0; i < assets.length; ++i) {
                utils.getUrl(
                    server,
                    '/bodega/v1/json/collections/' + collectionId + '/add/' + assets[i],
                    function(res) {
                        res.should.have.status(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json; charset=utf-8');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('collection');
                        res.body.collection.should.have.property('id', collectionId);
                        res.body.collection.should.have.property('name', collectionName);
                        res.body.collection.should.have.property('public', false);
                        res.body.collection.should.have.property('wishlist', false);
                        ++addedAssets;
                        if (addedAssets === assets.length) {
                            done();
                        }
                    },
                    cookie);
            }
        });

        it('should list added assets', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/list/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collection');
                    res.body.collection.should.have.property('id', collectionId);
                    res.body.collection.should.have.property('name', collectionName);
                    res.body.collection.should.have.property('assets');
                    res.body.collection.assets.length.should.be.equal(4);
                    done();
                },
                cookie);
        });

        it('should allow removing 2 assets', function(done){
            var removedAssets = 0;
            /*jshint loopfunc:true */
            for (var i = 0; i < assetsToRemove.length; ++i) {
                utils.getUrl(
                    server,
                    '/bodega/v1/json/collections/' + collectionId + '/remove/' + assetsToRemove[i],
                    function(res) {
                        res.should.have.status(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json; charset=utf-8');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('collection');
                        res.body.collection.should.have.property('id', collectionId);
                        res.body.collection.should.have.property('name', collectionName);
                        res.body.collection.should.have.property('public', false);
                        res.body.collection.should.have.property('wishlist', false);
                        ++removedAssets;
                        if (removedAssets === assetsToRemove.length) {
                            done();
                        }
                    },
                    cookie);
            }
        });

        it('should list assets after removal', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/list/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collection');
                    res.body.collection.should.have.property('id', collectionId);
                    res.body.collection.should.have.property('name', collectionName);
                    res.body.collection.should.have.property('assets');
                    res.body.collection.assets.length.should.be.equal(2);
                    done();
                },
                cookie);
        });

        it('should allow readding assets', function(done){
            var addedAssets = 0;
            /*jshint loopfunc:true */
            for (var i = 0; i < assetsToRemove.length; ++i) {
                utils.getUrl(
                    server,
                    '/bodega/v1/json/collections/' + collectionId + '/add/' + assetsToRemove[i],
                    function(res) {
                        res.should.have.status(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json; charset=utf-8');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('collection');
                        res.body.collection.should.have.property('id', collectionId);
                        res.body.collection.should.have.property('name', collectionName);
                        res.body.collection.should.have.property('public', false);
                        res.body.collection.should.have.property('wishlist', false);
                        ++addedAssets;
                        if (addedAssets === assetsToRemove.length) {
                            done();
                        }
                    },
                    cookie);
            }
        });

        it('should list assets after readding', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/list/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collection');
                    res.body.collection.should.have.property('id', collectionId);
                    res.body.collection.should.have.property('name', collectionName);
                    res.body.collection.should.have.property('assets');
                    res.body.collection.assets.length.should.be.equal(4);
                    done();
                },
                cookie);
        });

        it('should allow deletion of a collection', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/delete/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    done();
                },
                cookie);
        });

        it('should not list collection after deletion', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/collections/list',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.equal(numCollections - 1);
                    done();
                },
                cookie);
        });
    });

    // always delete the two collection we made, even on error
    after(function(done) {
        var connectionString = app.config.database.protocol + "://" +
                               app.config.database.user + ":" + app.config.database.password +
                               "@" + app.config.database.host + "/" +
                               app.config.database.name;

        pg.connect(connectionString, function(err, client, finis) {
                   client.query('delete from cllections where name = $1', [ collectionName ],
                   function(err, result) {
                           done();
                   });
        });
    });
});

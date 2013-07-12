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

var utils = require('./support/utils');

describe('Collections', function(){
    var collectionId;
    var collectionName = 'favorites1';
    var assets = [3, 4, 5, 6];
    var assetsToRemove = [4, 5];
    var numCollections = 0;
    describe('without authentication', function(){
        it('shouldnt allow listing collections', function(done) {
            utils.getUrl('collection/list',
                function(res){
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'Unauthorized');
                    done();
                },
                { noAuth: true });
        });
        it('shouldnt allow creating collections', function(done) {
            var params = { name: 'hello' };
            utils.postUrl('collection/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'Unauthorized');
                    done();
                },
                { noAuth: true });
        });
        it('shouldnt allow deleting collections', function(done) {
            utils.getUrl('collection/delete/hello',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'Unauthorized');
                    done();
                },
                { noAuth: true });
        });
    });

    utils.auth();

    var createdId;
    describe('After authentication', function(){
        it('should create', function(done){
            var params = {
                name: collectionName,
                public: true,
                type: 'wishlist'
            };
            utils.postUrl('collection/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.equal(1);
                    res.body.collections[0].should.have.property('id');
                    res.body.collections[0].should.have.property('name', collectionName);
                    res.body.collections[0].should.have.property('public', true);
                    res.body.collections[0].should.have.property('type', 'wishlist');
                    createdId = res.body.collections[0].id;
                    done();
                });
        });
        it('should update', function(done){
            var params = {
                name: collectionName + '_renamed',
                public: false,
                type: 'wishlist'
            };
            utils.postUrl('collection/update/' + createdId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.equal(1);
                    res.body.collections[0].should.have.property('name', collectionName + '_renamed');
                    res.body.collections[0].should.have.property('public', false);
                    res.body.collections[0].should.have.property('type', 'wishlist');
                    done();
                });
        });
        it('should update to the old values', function(done){
            var params = {
                name: collectionName,
                public: true,
                type: 'wishlist'
            };
            utils.postUrl('collection/update/' + createdId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.equal(1);
                    res.body.collections[0].should.have.property('name', collectionName);
                    res.body.collections[0].should.have.property('public', true);
                    res.body.collections[0].should.have.property('type', 'wishlist');
                    done();
                });
        });
        it('should list', function(done){
            utils.getUrl('collection/list',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.above(0);
                    numCollections = res.body.collections.length;
                    var collections = res.body.collections;
                    for (var i = 0; i < numCollections; ++i) {
                        collections[i].should.have.property('id');
                        if (collections[i].name === collectionName) {
                            collections[i].should.have.property('name', collectionName);
                            collections[i].should.have.property('public', true);
                            collections[i].should.have.property('type', 'wishlist');
                            collectionId = res.body.collections[i].id;
                        }
                    }
                    done();
                });
        });

        it('should allow adding assets', function(done){
            var addedAssets = 0;
            /*jshint loopfunc:true */
            for (var i = 0; i < assets.length; ++i) {
                utils.getUrl('collection/' + collectionId + '/add/' + assets[i],
                    function(res) {
                        res.should.have.status(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('collection');
                        res.body.collection.should.have.property('id', collectionId);
                        res.body.collection.should.have.property('name', collectionName);
                        res.body.collection.should.have.property('public', true);
                        res.body.collection.should.have.property('type', 'wishlist');
                        ++addedAssets;
                        if (addedAssets === assets.length) {
                            done();
                        }
                    });
            }
        });

        it('should list added assets', function(done){
            utils.getUrl('collection/list/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collection');
                    res.body.collection.should.have.property('id', collectionId);
                    res.body.collection.should.have.property('name', collectionName);
                    res.body.collection.should.have.property('assets');
                    res.body.collection.assets.length.should.be.equal(4);
                    done();
                });
        });

        it('should allow removing 2 assets', function(done){
            var removedAssets = 0;
            /*jshint loopfunc:true */
            for (var i = 0; i < assetsToRemove.length; ++i) {
                utils.getUrl('collection/' + collectionId + '/remove/' + assetsToRemove[i],
                    function(res) {
                        res.should.have.status(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('collection');
                        res.body.collection.should.have.property('id', collectionId);
                        res.body.collection.should.have.property('name', collectionName);
                        res.body.collection.should.have.property('public', true);
                        res.body.collection.should.have.property('type', 'wishlist');
                        ++removedAssets;
                        if (removedAssets === assetsToRemove.length) {
                            done();
                        }
                    });
            }
        });

        it('should list assets after removal', function(done){
            utils.getUrl('collection/list/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collection');
                    res.body.collection.should.have.property('id', collectionId);
                    res.body.collection.should.have.property('name', collectionName);
                    res.body.collection.should.have.property('assets');
                    res.body.collection.assets.length.should.be.equal(2);
                    done();
                });
        });

        it('should allow readding assets', function(done){
            var addedAssets = 0;
            /*jshint loopfunc:true */
            for (var i = 0; i < assetsToRemove.length; ++i) {
                utils.getUrl('collection/' + collectionId + '/add/' + assetsToRemove[i],
                    function(res) {
                        res.should.have.status(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('collection');
                        res.body.collection.should.have.property('id', collectionId);
                        res.body.collection.should.have.property('name', collectionName);
                        res.body.collection.should.have.property('public', true);
                        res.body.collection.should.have.property('type', 'wishlist');
                        ++addedAssets;
                        if (addedAssets === assetsToRemove.length) {
                            done();
                        }
                    });
            }
        });

        it('should list assets after readding', function(done){
            utils.getUrl('collection/list/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collection');
                    res.body.collection.should.have.property('id', collectionId);
                    res.body.collection.should.have.property('name', collectionName);
                    res.body.collection.should.have.property('assets');
                    res.body.collection.assets.length.should.be.equal(4);
                    done();
                });
        });

        it('should allow deletion of a collection', function(done){
            utils.getUrl('collection/delete/' + collectionId,
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.not.have.property('error');
                    done();
                });
        });

        it('should not list collection after deletion', function(done){
            utils.getUrl('collection/list',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('collections');
                    res.body.collections.length.should.be.equal(numCollections - 1);
                    done();
                });
        });
    });

    // always delete the two collection we made, even on error
    after(function(done) {
        pg.connect(utils.dbConnectionString, function(err, client, finis) {
                   client.query('delete from collections where name = $1', [ collectionName ],
                   function(err, result) {
                           done();
                   });
        });
    });
});

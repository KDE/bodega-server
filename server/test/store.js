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
var queryString = require('qs');

var utils = require('./support/utils');

describe('Store management', function(){
    var dbSnapshotBefore;
    describe('Creating a store without authenticating', function(){
        it('should fail', function(done) {
            utils.postUrl('store/create', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
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

    utils.auth({
                   user: 'aseigo@kde.org',
                   password: 'aseigo',
                   store: 'null'
               });

    describe('Create a store with someone who is not authorized to do so', function(){
        it('Creation request should fail', function(done) {
            utils.postUrl('store/create', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'PartnerInvalid');
                    done();
                });
        });
    });

    utils.auth(               {
                   store: 'null'
               });

    describe('Store creation', function(){
        it('should fail with an invalid partner', function(done){
            utils.postUrl('store/create',
                { partner: 1003 },
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'PartnerInvalid');
                    done();
                });
        });

        it('should fail without a name', function(done){
            utils.postUrl('store/create',
                { partner: 1002 },
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'StoreNameInvalid');
                    done();
                });
        });

        it('should succeed with a valid partner and name', function(done){
            var query =
                {
                  'partner' : 1002,
                  'name': 'Fun Times With Clowns',
                  'desc': 'Clowns are actually scary'
                };
            utils.postUrl('store/create',
                query,
                function(res) {
                    var expected = [ {
                        id: '1002_FUN_TIMES_WITH_CLOWNS',
                        name: 'Fun Times With Clowns',
                        desc: 'Clowns are actually scary',
                        partner: { 'id': 1002, 'name': 'KDE' },
                        markups: { 'min': 0, 'max': 0, 'markup': 0 },
                        assetSummary: [ ]
                    } ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('storeInfo');
                    res.body.storeInfo.should.eql(expected);
                    done();
                });
        });

        it('should succeed with a name and no partner explicitly specified', function(done){
            var query =
                { 'id': 'somethingcrazy',
                  'name': 'More Fun',
                  'desc': ''
                };
            utils.postUrl('store/create',
                query,
                function(res) {
                    var expected = [ {
                        id: 'somethingcrazy',
                        name: 'More Fun',
                        desc: '',
                        partner: { 'id': 1002, 'name': 'KDE' },
                        markups: { 'min': 0, 'max': 0, 'markup': 0 },
                        assetSummary: []
                    } ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('storeInfo');
                    res.body.storeInfo.should.eql(expected);
                    done();
                });
        });

        it('should fail with an id that exists', function(done){
            var query =
                {
                  'partner' : 1002,
                  'name': 'Fun Times With Clowns'
                };
            utils.postUrl('store/create',
                query,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'StoreIdExists');
                    done();
                });
        });

    });

    describe('Store listing', function() {
        it('should list all stores associated with the authentication person',
           function(done) {
                utils.getUrl('store/list',
                    function(res) {
                        var expected = [
                        {
                            id: '1002_FUN_TIMES_WITH_CLOWNS',
                            name: 'Fun Times With Clowns',
                            desc: 'Clowns are actually scary',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 0, 'max': 0, 'markup': 0 },
                            assetSummary: [ ]
                        },
                        {
                            id: 'KDE-1',
                            name: 'Plasma Workspace',
                            desc: 'KDE Plasma user interfaces',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 0, 'max': 0, 'markup': 0 },
                            assetSummary: [
                                { type: 'game', total: 24 }
                            ]
                        },
                        {
                            id: 'KDE-2',
                            name: 'KDE Applications',
                            desc: 'Variety of tools',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 0, 'max': 0, 'markup': 0 },
                            assetSummary: []
                        },
                        {
                            id: 'somethingcrazy',
                            name: 'More Fun',
                            desc: '',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 0, 'max': 0, 'markup': 0 },
                            assetSummary: []
                        }
                        ];

                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('success', true);
                        res.body.storeInfo.should.eql(expected);
                        done();
                    });
           });
    });

    describe('Updating store information', function() {
        it('should fail on a non-existant store', function(done) {
            var query = {
                'maxmarkup': 100,
                'minmarkup': 10,
                'markup': 20
            };

            utils.postUrl('store/update/does_not_exist',
                query,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property('type', 'StoreIdInvalid');
                    done();
                });
        });

        it('should fail on a store that exists, but we are not authorized to manage', function(done) {
            var query = {
                'maxmarkup': 100,
                'minmarkup': 10,
                'markup': 20
            };

            utils.postUrl('store/update/does_not_exist',
                query,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property('type', 'StoreIdInvalid');
                    done();
                });
        });

        it('should succeed on an existing store', function(done) {
            var query = {
                'maxmarkup': 100,
                'minmarkup': 10,
                'markup': 20,
                'desc': 'Clowns are not scary'
            };

            utils.postUrl('store/update/1002_FUN_TIMES_WITH_CLOWNS',
                query,
                function(res) {
                    var expected = [
                        {
                            id: '1002_FUN_TIMES_WITH_CLOWNS',
                            name: 'Fun Times With Clowns',
                            desc: 'Clowns are not scary',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 10, 'max': 100, 'markup': 20 },
                            assetSummary: [ ]
                        }
                    ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.storeInfo.should.eql(expected);
                    done();
                });
        });

        it('partial updates work as well', function(done) {
            var query = {
                'maxmarkup': 200,
                'markup': 15
            };

            utils.postUrl('store/update/1002_FUN_TIMES_WITH_CLOWNS',
                query,
                function(res) {
                    var expected = [
                        {
                            id: '1002_FUN_TIMES_WITH_CLOWNS',
                            name: 'Fun Times With Clowns',
                            desc: 'Clowns are not scary',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 10, 'max': 200, 'markup': 15 },
                            assetSummary: []
                        }
                    ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.storeInfo.should.eql(expected);
                    done();
                });
        });
    });

    describe('Channel manipulation', function() {
        var newChannelId = 0;
        it('should allow adding a new channel', function(done) {
            var query = {
                'name': 'Test Channel',
                'parent': 2,
                'description': 'A test channel',
                'tags': [1, 26, 130]
            };

            utils.postUrl('store/channel/create/KDE-1',
                query,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('channel');
                    res.body.channel.should.have.property('id');
                    res.body.channel.should.have.property('store', 'KDE-1');
                    res.body.channel.should.have.property('parent', 2);
                    res.body.channel.should.have.property('image');
                    res.body.channel.should.have.property('name', 'Test Channel');
                    res.body.channel.should.have.property('description', 'A test channel');
                    res.body.channel.should.have.property('active', true);
                    res.body.channel.should.have.property('assetcount');
                    newChannelId = res.body.channel.id;

                    done();
                });
            });

        it('fetch the structure of the store', function(done) {
           utils.getUrl('store/structure/KDE-1',
                function(res) {
                    var channel2 =
                        { "id": 2,
                          "name": "Games",
                          "description": "Fun and amusements",
                          "image": "games.png",
                          "active": true,
                          "tags": [
                            {
                              "id": 12,
                              "title": "game",
                              "type": 'assetType',
                              "typeid": 9
                            },
                            {
                              "id": 33,
                              "title": "application/x-plasma",
                              "type": 'mimetype',
                              "typeid": 7
                            }
                            ],
                            "channels": [
                              {
                                "id": 3,
                                "name": "Card Games",
                                "description": "Bust out the deck of 52!",
                                "image": "cardgames.png",
                                "active": true,
                                "tags": [
                                    {
                                      "id": 12,
                                      "title": "game",
                                      "type": 'assetType',
                                      "typeid": 9
                                    },
                                    {
                                      "id": 30,
                                      "title": "Card Game",
                                      "type": 'category',
                                      "typeid": 4
                                    },
                                    {
                                      "id": 33,
                                      "title": "application/x-plasma",
                                      "type": 'mimetype',
                                      "typeid": 7
                                    }
                                ],
                                "channels": []
                              }
                            ]
                        };
                    channel2.channels.push(
                                    {
                                        "id": newChannelId,
                                        "name": "Test Channel",
                                        "description": "A test channel",
                                        "image": null,
                                        "active": true,
                                        "tags": [
                                        {
                                            "id": 1,
                                            "title": "Early Childhood",
                                            "type": 'contentrating',
                                            "typeid": 8
                                        },
                                        {
                                            "id": 26,
                                            "title": "Creative Commons Attribution-NonCommercial-ShareAlike",
                                            "type": 'license',
                                            "typeid": 23
                                        }
                                        ],
                                        "channels": []
                                    });
                    var expected = [ channel2 ];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', true);
                    res.body.channels.should.eql(expected);
                    done();
                });
        });

        it('should allow adding of tags', function(done) {
            var params = {
                    tags: [1, 22, 15]
                };
            utils.postUrl('store/channel/update/KDE-1/' + newChannelId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('channel');
                    res.body.channel.should.have.property('tags');
                    res.body.channel.tags.length.should.eql(params.tags.length);
                    done();
                });
        });

        it('should allow removal of tags', function(done) {
            var params = {
                    tags: [1, 15]
                };
            utils.postUrl('store/channel/update/KDE-1/' + newChannelId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('channel');
                    res.body.channel.should.have.property('tags');
                    res.body.channel.tags.length.should.eql(params.tags.length);
                    done();
                });
        });

        it('should allow simultaneous adding and removal of tags', function(done) {
            var params = {
                    tags: [1, 22]
                };
            utils.postUrl('store/channel/update/KDE-1/' + newChannelId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('channel');
                    res.body.channel.should.have.property('tags');
                    res.body.channel.tags.length.should.eql(params.tags.length);
                    done();
                });
        });

        it('should be possible to delete that channel', function(done) {
            utils.getUrl('store/channel/delete/KDE-1/' + newChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                });
        });
    });

    describe('Store deletion', function() {
        it('should succeed with a valid store', function(done) {
            utils.getUrl('store/delete/1002_FUN_TIMES_WITH_CLOWNS',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                });
        });

        it('should succeed with another valid store', function(done){
            utils.getUrl('store/delete/somethingcrazy',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                });
        });

        it('listing should reflect deletions',
           function(done) {
                utils.getUrl('store/list',
                    function(res) {
                        var expected = [
                        {
                            id: 'KDE-1',
                            name: 'Plasma Workspace',
                            desc: 'KDE Plasma user interfaces',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 0, 'max': 0, 'markup': 0 },
                            assetSummary: [
                                { type: 'game', total: 24 }
                            ]
                        },
                        {
                            id: 'KDE-2',
                            name: 'KDE Applications',
                            desc: 'Variety of tools',
                            partner: { 'id': 1002, 'name': 'KDE' },
                            markups: { 'min': 0, 'max': 0, 'markup': 0 },
                            assetSummary: []
                        }
                        ];

                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('authStatus', true);
                        res.body.should.have.property('success', true);
                        res.body.storeInfo.should.eql(expected);
                        done();
                    });
           });
    });

    before(function(done) {
        utils.dbSnapshot(null, function(err, res) {
            if (err) {
                console.log("Couldn't snapthot db!");
            }
            dbSnapshotBefore = res;
            done();
        });
    });
    // always delete the two stores we made, even on error
    after(function(done) {
        pg.connect(utils.dbConnectionString, function(err, client, finis) {
                   client.query("delete from stores where id = '1002_FUN_TIMES_WITH_CLOWNS' or id = 'somethingcrazy'", [],
                   function(err, result) {
                       client.query("delete from channels where name = 'Test Channel';", [],
                       function(err, result) {
                           utils.dbSnapshot(client, function(err, res) {
                               var dbSnapshotAfter = res;
                               if (err) {
                                   console.log("Couldn't snapthot db!");
                               }
                               dbSnapshotAfter.should.eql(dbSnapshotBefore);
                               finis();
                               done();
                           });
                       });
                   });
        });
    });

});

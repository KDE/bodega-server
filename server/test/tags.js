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
var utils = require('./support/utils');
var querystring = require('querystring');


describe('Tags manipulation', function(){
    var createdTagId;

    utils.auth({ store: 'null' });

    function listTags(asset, channel, type, cb) {
        var query = '/bodega/v1/json';
        if (asset) {
            query += '/asset/tags/' + asset;
        } else if (channel) {
            query += '/store/channel/tags/' + channel;
        } else if (type) {
            query += '/tag/list/' + type;
        } else {
            query += '/tag/list';
        }

        utils.getUrl(query,
            function(res) {
                cb(res);
            });
    }

    function createTag(title, type, cb) {
        utils.postUrl('tag/create', {'title': title, 'type': type},
            function(res) {
                cb(res);
            });
    }

    function updateTag(id, title, type, cb) {
        utils.postUrl('tag/update/' + id, {'title': title, 'type': type},
            function(res) {
                cb(res);
            });
    }

    function deleteTag(tag, cb) {
        utils.getUrl('tag/delete/' + tag,
            function(res) {
                cb(res);
            });
    }

    describe('Tags', function() {
        it('List all tags', function(done) {
            var cb = function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('tags');

                res.body.tags.length.should.be.above(10);
                done();
            };
            listTags(null, null, null, cb);
        });

        it('List all tags of asset 2', function(done) {
            var cb = function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('tags');

                res.body.tags.length.should.equal(3);
                res.body.tags[0].id.should.be.eql(1);
                res.body.tags[0].typeid.should.be.eql(8);
                res.body.tags[0].type.should.be.eql('contentrating');
                res.body.tags[0].title.should.be.eql('Early Childhood');
                done();
            };
            listTags(2, null, null, cb);
        });

        it('List all tags of channel 2', function(done) {
            var cb = function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('tags');

                res.body.tags.length.should.equal(2);
                res.body.tags[0].id.should.be.eql(12);
                res.body.tags[0].typeid.should.be.eql(9);
                res.body.tags[0].type.should.be.eql('assetType');
                res.body.tags[0].title.should.be.eql('game');
                done();
            };
            listTags(null, 2, null, cb);
        });

        it('List all tags of type contentrating', function(done) {
            var cb = function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('tags');

                res.body.tags.length.should.equal(6);
                res.body.tags[0].id.should.be.eql(6);
                res.body.tags[0].typeid.should.be.eql(8);
                res.body.tags[0].type.should.be.eql('contentrating');
                res.body.tags[0].title.should.be.eql('Adults Only');
                done();
            };
            listTags(null, null, 'contentrating', cb);
        });

        it('create a tag', function(done) {
            createTag('test', 'contentrating', function(res) {
                createdTagId = res.body.id;

                listTags(null, null, 'contentrating', function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('tags');

                    res.body.tags.length.should.equal(7);
                    res.body.tags[6].typeid.should.be.eql(8);
                    res.body.tags[6].type.should.be.eql('contentrating');
                    res.body.tags[6].title.should.be.eql('test');
                    done();
                });
            });
        });

        it('edit the created tag', function(done) {
            updateTag(createdTagId, 'new title', 'assetType', function(res) {

                listTags(null, null, 'assetType', function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('tags');

                    res.body.tags.length.should.equal(11);
                    res.body.tags[8].typeid.should.be.eql(9);
                    res.body.tags[8].type.should.be.eql('assetType');
                    res.body.tags[8].title.should.be.eql('new title');
                    done();
                });
            });
        });

        it('delete the created tag', function(done) {
            deleteTag(createdTagId, function(res) {
                listTags(null, null, 'contentrating', function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('tags');

                    res.body.tags.length.should.equal(6);
                    done();
                });
            });
        });

        it('edit a non existing tag', function(done) {
            var expected = {
                authStatus: true,
                device: 'null',
                store: 'null',
                points: 10000,
                success: false,
                error: { type: 'TagIdInvalid' }
            };

            updateTag(createdTagId, 'new title', 'assetType', function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.eql(expected);
                done();
            });
        });

        it('delete a non existing tag', function(done) {
            var expected = {
                authStatus: true,
                device: 'null',
                store: 'null',
                points: 10000,
                success: false,
                error: { type: 'TagNotDeleted' }
            };

            deleteTag(createdTagId, function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.eql(expected);
                done();
            });
        });
    });
});

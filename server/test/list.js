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

describe('Listing', function(){
    var cookie;
    var gamesChannelId;
    var cardsChannelId;
    var cardsChannelResponse;
    describe('needs to authorize first', function(){
        it('authorize correctly.', function(done){
            var expected = {
                "store":"VIVALDI-1",
                "authStatus":true,
                "points" : 10000,
                "imageUrls": {
                    "tiny":"http://0.0.0.0:3000/images/22",
                    "small":"http://0.0.0.0:3000/images/32",
                    "medium":"http://0.0.0.0:3000/images/64",
                    "large":"http://0.0.0.0:3000/images/128",
                    "huge":"http://0.0.0.0:3000/images/512",
                    "previews":"http://0.0.0.0:3000/images/previews"
                }
            };
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

    describe('channels', function(){
        it('should list top level channels', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/channels',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('channels');
                    var channels = res.body.channels;
                    channels.length.should.be.above(0);
                    for (var i = 0; i < channels.length; ++i) {
                        var channel = channels[i];
                        if (channel.name === 'Games') {
                            gamesChannelId = channel.id;
                        }
                    }
                    gamesChannelId.should.be.above(0);
                    done();
                },
                cookie);
        });

        it('should list sub channels of a top channel', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + gamesChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('channels');
                    var channels = res.body.channels;
                    channels.length.should.be.within(1, 25);
                    for (var i = 0; i < channels.length; ++i) {
                        var channel = channels[i];
                        if (channel.name === 'Card Games') {
                            cardsChannelId = channel.id;
                        }
                    }
                    cardsChannelId.should.be.above(0);
                    done();
                },
                cookie);
        });

        it('should list channel with assets', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + cardsChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.within(1, 25);
                    cardsChannelResponse = res.body;
                    done();
                },
                cookie);
        });

        it('should browse channels/assets with specified page size', function(done){
            // we're running all the tests here in parallel so we
            // we need to figure out when they all finish and call
            // done() only then
            var runningTests = 3;
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + cardsChannelId +  '?pageSize=1',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.equal(1);
                    --runningTests;
                    if (runningTests === 0) {
                        done();
                    }
                },
                cookie);
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + cardsChannelId + '?pageSize=10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.equal(10);
                    --runningTests;
                    if (runningTests === 0) {
                        done();
                    }
                },
                cookie);
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + cardsChannelId + '?pageSize=21',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.equal(21);
                    --runningTests;
                    if (runningTests === 0) {
                        done();
                    }
                },
                cookie);
        });
    });


    describe('Listing assets', function(){
        it('by name', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + cardsChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    res.body.should.be.eql(cardsChannelResponse);
                    done();
                },
                cookie);
        });

        it('list channels by name with pageSize', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + cardsChannelId +
                    '?listType=Channel&pageSize=10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.length.should.be.equal(10);
                    done();
                },
                cookie);
        });

        it('list channels by name with offset', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + cardsChannelId +
                    '?listType=Channel&offset=10&pageSize=10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.length.should.be.equal(10);
                    cardsChannelResponse.assets[10].should.be.eql(assets[0]);
                    done();
                },
                cookie);
        });
    });
});

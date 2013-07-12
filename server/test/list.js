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

var utils = require('./support/utils');

var authedBrowsing = !(app.config.anonAccess && app.config.anonAccess.browsing === true);
//console.log("Testing with " + (authedBrowsing ? "authenticated" : "anonymous" ) + " browsing");

describe('Listing', function(){
    var gamesChannelId;
    var cardsChannelId;
    var cardsChannelResponse;

    if (authedBrowsing) {
        utils.auth();
    } else {
        describe('Creat a session', function() {
            it('succeeds', function(done) {
                utils.getUrl('auth?auth_store=KDE-1',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.headers.should.have.property('set-cookie');
                        utils.cookie = res.headers['set-cookie'];
                        done();
                    },
                    { noAuth: true });
            });
        });
    }

    describe('channels', function(){
        it('should list top level channels', function(done){
            utils.getUrl('channels',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
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
                });
        });

        it('should list sub channels of a top channel', function(done){
            utils.getUrl('channel/' + gamesChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
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
                });
        });

        it('should list channel with assets', function(done){
            utils.getUrl('channel/' + cardsChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.within(1, 25);
                    cardsChannelResponse = res.body;
                    done();
                });
        });

        it('should browse channels/assets with specified page size', function(done){
            // we're running all the tests here in parallel so we
            // we need to figure out when they all finish and call
            // done() only then
            var runningTests = 3;
                    console.log("working with channel ... " + cardsChannelId);
            utils.getUrl('channel/' + cardsChannelId +  '?pageSize=1',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.equal(1);
                    --runningTests;
                    if (runningTests === 0) {
                        done();
                    }
                });
            utils.getUrl('channel/' + cardsChannelId + '?pageSize=10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.equal(10);
                    --runningTests;
                    if (runningTests === 0) {
                        done();
                    }
                });
            utils.getUrl('channel/' + cardsChannelId + '?pageSize=21',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
                    res.body.should.have.property('assets');
                    Object.keys(res.body.assets).length.should.be.equal(19);
                    --runningTests;
                    if (runningTests === 0) {
                        done();
                    }
                });
        });
    });


    describe('Listing assets', function(){
        it('by name', function(done){
            utils.getUrl('channel/' + cardsChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
                    res.body.should.have.property('assets');
                    res.body.should.be.eql(cardsChannelResponse);
                    done();
                });
        });

        it('list channels by name with pageSize', function(done){
            utils.getUrl('channel/' + cardsChannelId +
                    '?listType=Channel&pageSize=10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.length.should.be.equal(10);
                    done();
                });
        });

        it('list channels by name with offset', function(done){
            utils.getUrl('channel/' + cardsChannelId +
                    '?listType=Channel&offset=10&pageSize=10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    if (authedBrowsing) {
                        res.body.should.have.property('authStatus', true);
                    }
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.length.should.be.equal(9);
                    cardsChannelResponse.assets[10].should.be.eql(assets[0]);
                    done();
                });
        });
    });
});

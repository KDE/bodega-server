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

describe('Searching', function(){
    var gamesChannelId;
    var cardGamesChannelId;

    utils.auth();

    describe('initialization', function(){
        it('find the games channel', function(done){
            utils.getUrl('channels',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
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
                });
        });

        it('find the card games channel', function(done){
            utils.getUrl('channel/' + gamesChannelId,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('channels');
                    var channels = res.body.channels;
                    channels.length.should.be.within(1, 25);
                    for (var i = 0; i < channels.length; ++i) {
                        var channel = channels[i];
                        if (channel.name === 'Card Games') {
                            cardGamesChannelId = channel.id;
                        }
                    }
                    cardGamesChannelId.should.be.above(0);
                    done();
                });
        });
    });

    describe('Search', function(){
        it('should error an missing query', function(done){
            utils.getUrl('search',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'MissingParameters');
                    done();
                });
        });

        it('should error an missing channel', function(done){
            utils.getUrl('search?' +
                    '&query=\'mathematica\'',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'MissingParameters');
                    done();
                });
        });


        it('should find an asset', function(done){
            utils.getUrl('search?channelId=' + gamesChannelId +
                    '&query=\'diamond\'',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.should.be.lengthOf(1);
                    var asset = assets[0];
                    asset.name.should.be.eql(
                        'Diamond Juice');
                    done();
                });
        });

        it('work with plaintext query', function(done){
            utils.getUrl('search?channelId=' + gamesChannelId +
                    '&query=\'best+app+from+Diamond+to+date\'',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.should.be.lengthOf(1);
                    var asset = assets[0];
                    asset.name.should.be.eql(
                        'Diamond Juice');
                    done();
                });
        });

    });
});

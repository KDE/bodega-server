var server = require('../app.js');
var utils = require('./support/http');

describe('Searching', function(){
    var cookie;
    var booksChannelId;
    var scienceChannelId;
    var scienceChannelResponse;
    describe('initialization', function(){
        it('authorize correctly.', function(done){
            var expected = {
                "userId": 1,
                "device":"VIVALDI-1",
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
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_device=VIVALDI-1',
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

        it('find the books channel', function(done){
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
                        if (channel.name === 'Books') {
                            booksChannelId = channel.id;
                        }
                    }
                    booksChannelId.should.be.above(0);
                    done();
                },
                cookie);
        });

        it('find the science channel', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/channel/' + booksChannelId,
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
                        if (channel.name === 'Science') {
                            scienceChannelId = channel.id;
                        }
                    }
                    scienceChannelId.should.be.above(0);
                    done();
                },
                cookie);
        });
    });

    describe('Search', function(){
        it('should error an missing query', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/search',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'MissingParameters');
                    done();
                },
                cookie);
        });

        it('should error an missing channel', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/search?' +
                    '&query=\'mathematica\'',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                                                        'MissingParameters');
                    done();
                },
                cookie);
        });


        it('should find an asset', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/search?channelId=' + booksChannelId +
                    '&query=\'mathematica\'',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.should.be.lengthOf(1);
                    var asset = assets[0];
                    asset.name.should.be.eql(
                        'Philosophiae Naturalis Principia Mathematica');
                    done();
                },
                cookie);
        });

        it('work with plaintext query', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/search?channelId=' + booksChannelId +
                    '&query=\'principia+mathematica\'',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('assets');
                    var assets = res.body.assets;
                    assets.should.be.lengthOf(1);
                    var asset = assets[0];
                    asset.name.should.be.eql(
                        'Philosophiae Naturalis Principia Mathematica');
                    done();
                },
                cookie);
        });

    });
});

var server = require('../app.js');
var utils = require('./support/http');

describe('Asset info', function(){
    var cookie;
    describe('needs to authorize first', function(){
        it('authorize correctly.', function(done){
            var expected = {
                "userId": 2,
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
    });

    describe('Basic fetch', function(){
        it('should show info for an asset', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/16',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('id', 16);
                    res.body.asset.should.have.property('partnerId');
                    res.body.asset.should.have.property('license');
                    res.body.asset.should.have.property('version');
                    res.body.asset.should.have.property('filename');
                    res.body.asset.should.have.property('image');
                    res.body.asset.should.have.property('name');
                    res.body.asset.should.have.property('description');
                    done();
                },
                cookie);
        });
        it('should fetch tags', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/16',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('tags');
                    var tags = res.body.asset.tags;
                    tags.should.be.an.instanceof(Array);
                    tags.length.should.be.above(0);
                    done();
                },
                cookie);
        });
    });

    describe('Advanced fetch', function(){
        it('should show chanagelog', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/16?changelog=1',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('changelog');
                    done();
                },
                cookie);
        });
        it('should show previews', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/asset/16?previews=1',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('previews');
                    done();
                },
                cookie);
        });
    });
});

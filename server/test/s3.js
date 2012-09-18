var server = require('../app.js');
var utils = require('./support/http');
var should = require('should');

// you have to pay for the s3 get/put requests
//  so lets disable them by default
var skipS3Tests = true;

describe('S3 Communication', function(){
    var cookie;
    var sampleAsset = {
        name : 's3.js',
        path : __filename
    };

    if (skipS3Tests) {
        it('skips - .', function(done){
            console.log("s3 tests disabled");
            done();
        });
        return;
    }

    describe('Upload', function(){
        it('error on absent file.', function(done){
            var req = {
                files : {
                    asset : {
                        path : '/tmp/nonexistant.txt'
                    }
                }
            };
            app.assetStore.upload(req, function(err) {
                err.should.have.property('code', 'ENOENT');
                done();
            });
        });

        it('upload a file.', function(done){
            var req = {
                files : {
                    asset : sampleAsset
                }
            };
            app.assetStore.upload(req, function(err, res) {
                //console.log(res);
                should.not.exist(err);
                res.statusCode.should.be.equal(200);
                done();
            });
        });

        it('download a file.', function(done){
            var bytes = 0;
            var res = {
                header : function() {},
                attachment : function() {},
                write : function(data) { bytes += data.length;},
                end : function() { },
                close : function() { }
            };
            app.assetStore.download(res, sampleAsset.name, function(err) {
                bytes.should.be.equal(1956);
                should.not.exist(err);
                done();
            });
        });

        it('remove a file.', function(done){
            app.assetStore.remove(sampleAsset.name, function(err, res) {
                should.not.exist(err);
                //console.log(res);
                res.statusCode.should.equal(204);
                done();
            });
        });
    });
});

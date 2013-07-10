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
var should = require('should');
var fs = require('fs');

describe('Asset Store, ', function(){
    var sampleAsset = {
        id : 133,
        file : 'assetstore.js',
        incoming : true,
        posted : true
    };
    var fileSize;
    var tempFile = "temp-file.json";

    before(function(done) {
        fs.writeFileSync(tempFile, sampleAsset);
        fs.stat(tempFile, function(err, stats) {
            fileSize = stats.size;
            done();
        });
    });

    // you have to pay for the s3 get/put requests
    //  so lets disable them by default
    if (app.config.storage.system === 's3') {
        it('skips - .', function(done){
            console.log("s3 tests disabled");
            done();
        });
        return;
    }

    describe('Upload', function(){
        it('error on absent file.', function(done){
            app.assetStore.upload("/invalid/file", sampleAsset, function(err) {
                err.should.have.property('name', 'AssetFileMissing');
                done();
            });
        });

        it('upload an asset.', function(done){
            app.assetStore.upload(tempFile, sampleAsset, function(err) {
                //console.log(res);
                should.not.exist(err);
                done();
            });
        });

        it('publish an asset.', function(done){
            app.assetStore.publish(sampleAsset, function(err) {
                //console.log(res);
                should.not.exist(err);
                done();
            });
        });

        it('fail to download incoming after publishing.', function(done){
            var bytes = 0;
            var res = {
                header : function() {},
                attachment : function() {},
                write : function(data) { bytes += data.length;},
                end : function() { },
                close : function() { }
            };
            app.assetStore.download(res, sampleAsset, function(err) {
                bytes.should.be.equal(0);
                should.exist(err);
                done();
            });
        });

        it('download an asset.', function(done){
            var bytes = 0;
            var res = {
                header : function() {},
                attachment : function() {},
                write : function(data) { bytes += data.length;},
                end : function() { },
                close : function() { }
            };
            sampleAsset.incoming = false;
            app.assetStore.download(res, sampleAsset, function(err) {
                bytes.should.be.equal(fileSize);
                should.not.exist(err);
                done();
            });
        });

        it('remove an asset.', function(done){
            app.assetStore.remove(sampleAsset, function(err) {
                should.not.exist(err);
                done();
            });
        });
    });
});

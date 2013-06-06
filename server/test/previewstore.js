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

var server = require('../app.js');
var utils = require('./support/http');
var should = require('should');
var fs = require('fs');

describe('Preview Store, ', function(){
    var cookie;
    var tmpCoverFile = __dirname + "/sampleasset/tmpcover.jpg";
    var tmpIcon512 = __dirname + "/sampleasset/tmpIcon512.png";
    var tmpIcon128 = __dirname + "/sampleasset/tmpIcon128.png";
    var tmpIcon64  = __dirname + "/sampleasset/tmpIcon64.png";
    var tmpIcon32  = __dirname + "/sampleasset/tmpIcon32.png;";
    var tmpIcon22  = __dirname + "/sampleasset/tmpIcon22.png";
    var cleanupFiles = [];
    
    var sampleBookAsset = {
        id : 133,
        incoming : true,
        assetType : "book",
        previews : [
            {type : "cover", "subtype" : "front", file : tmpCoverFile }
        ]
    };
    var sampleAppAsset = {
        id : 134,
        incoming : true,
        assetType : "app",
        previews : [
            {type : "icon", "subtype" : "medium", file : tmpIcon64 },
            {type : "icon", "subtype" : "large", file : tmpIcon128 },
            {type : "icon", "subtype" : "huge", file : tmpIcon512 }
        ]
    };

    function copyFile(from, to) {
        fs.createReadStream(from).pipe(
            fs.createWriteStream(to));
    }
    
    before(function(done) {
        copyFile(__dirname + "/sampleasset/cover.jpg", tmpCoverFile);
        copyFile(__dirname + "/sampleasset/icon22.png", tmpIcon22);
        copyFile(__dirname + "/sampleasset/icon32.png", tmpIcon32);
        copyFile(__dirname + "/sampleasset/icon64.png", tmpIcon64);
        copyFile(__dirname + "/sampleasset/icon128.png", tmpIcon128);
        copyFile(__dirname + "/sampleasset/icon512.png", tmpIcon512);
        cleanupFiles.push(tmpCoverFile);
        cleanupFiles.push(tmpIcon22);
        cleanupFiles.push(tmpIcon32);
        cleanupFiles.push(tmpIcon64);
        cleanupFiles.push(tmpIcon128);
        cleanupFiles.push(tmpIcon512);
        done();
    });

    after(function(done) {
        var i;
        for (i = 0; i < cleanupFiles.length; ++i) {
            try {
                fs.unlinkSync(cleanupFiles[i]);
            } catch (err) {
                //do nothing
            }
        }
        done();
    });

    describe('Upload', function(){
        it('error on absent file.', function(done){
            //deep copy because we'll be changing it
            var sampleAsset =
                    JSON.parse(JSON.stringify(sampleBookAsset));
            sampleAsset.previews[0].file = "missing-file.jpg";
            app.previewStore.upload(sampleAsset, function(err) {
                if (!err) {
                    throw new Error('failed to detect missing file');
                }
                done();
            });
        });

        it('upload previews for book.', function(done){
            app.previewStore.upload(sampleBookAsset, function(err) {
                //console.log(res);
                should.not.exist(err);
                done();
            });
        });

        it('upload previews for an app.', function(done){
            app.previewStore.upload(sampleAppAsset, function(err) {
                //console.log(res);
                should.not.exist(err);
                done();
            });
        });

    });
});

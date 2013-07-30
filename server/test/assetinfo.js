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

describe('Asset info', function(){
    utils.auth();

    describe('Basic fetch', function(){
        it('should show info for an asset', function(done){
            utils.getUrl('asset/6',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('id', 6);
                    res.body.asset.should.have.property('partnerId');
                    res.body.asset.should.have.property('license');
                    res.body.asset.should.have.property('version');
                    res.body.asset.should.have.property('created');
                    res.body.asset.should.have.property('filename');
                    res.body.asset.should.have.property('image');
                    res.body.asset.should.have.property('name');
                    res.body.asset.should.have.property('description');
                    res.body.asset.should.have.property('points');
                    res.body.asset.should.have.property('canDownload');
                    done();
                });
        });
        it('should fetch tags', function(done){
            utils.getUrl('asset/6',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('tags');
                    var tags = res.body.asset.tags;
                    tags.should.be.an.instanceOf(Array);
                    tags.length.should.be.above(0);
                    done();
                });
        });
    });

    describe('Advanced fetch', function(){
        it('should show chanagelog', function(done){
            utils.getUrl('asset/6?changelog=1',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('changelog');
                    done();
                });
        });
        it('should show previews', function(done){
            utils.getUrl('asset/6?previews=1',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('previews');
                    done();
                });
        });
        it('should show ratings', function(done){
            utils.getUrl('asset/8?ratings=1',
                function(res) {
                    res.should.have.status(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('asset');
                    res.body.asset.should.have.property('ratings');
                    done();
                });
        });
    });
});

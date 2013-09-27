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
var utils = require('./support/utils');

describe('Forum', function() {
    utils.auth();

    describe('List Messages', function() {
        it('should fail because the asset is invalid', function(done) {
            utils.getUrl('asset/forum/1000',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.error.should.have.property("type", "NoMatch");
                    done();
                });
        });
        it('should succeed', function(done) {
            //FIXME
            this.timeout(15000);
            utils.getUrl('asset/forum/8',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('topics');
                    var topics = res.body.topics;
                    topics.should.be.an.instanceOf(Array);
                    topics.length.should.be.above(0);
                    done();
                });
        });
    });
});


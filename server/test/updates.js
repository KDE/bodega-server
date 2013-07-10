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

var utils = require('./support/utils');

describe('Asset update checks', function() {
    it('should succeed quietly with no assets member in the body', function(done) {
        var params = { };
        utils.postUrl('asset/list/updates',
            params,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type', 'application/json');
                res.body.should.not.have.property('error');
                res.body.should.have.property('success', true);
                res.body.should.have.property('assets');
                res.body.assets.should.have.property('length');
                res.body.assets.length.should.eql(0);
                done();
            });
    });

    it('should succeed quietly with no assets listed', function(done) {
        var params = { assets: [] };
        utils.postUrl('asset/list/updates',
            params,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type', 'application/json');
                res.body.should.not.have.property('error');
                res.body.should.have.property('success', true);
                res.body.should.have.property('assets');
                res.body.assets.should.have.property('length');
                res.body.assets.length.should.eql(0);
                done();
            });
    });

    it('Should reject requests for more than 500 assets', function(done) {
        var currentDate = new Date();
        var params = { assets: [] };
        for (var i = 0; i < 1000; ++i) {
            params.assets.push([ i, currentDate ]);
        }

        utils.postUrl('asset/list/updates',
            params,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type', 'application/json');
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'TooManyParameters');
                done();
            });
    });

    it('Should find updates', function(done) {
        var currentDate = new Date();
        var params = { assets: [] };
        for (var i in [1, 2, 3, 4]) {
            params.assets.push([ i, currentDate ]);
        }
        var oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 1);
        params.assets.push([ 6, oldDate ]);
        // duplicate an id
        params.assets.push([ 6, oldDate ]);
        // reduplicate with current date
        params.assets.push([ 6, currentDate]);
        // throw some garbage in there for fun
        params.assets.push({ rubbish: true });
        params.assets.push([ 6, 'alsdjfl;sadjf' ]);

        utils.postUrl('asset/list/updates',
            params,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type', 'application/json');
                res.body.should.not.have.property('error');
                res.body.should.have.property('assets');
                res.body.assets.length.should.eql(1);
                done();
            });
    });
});


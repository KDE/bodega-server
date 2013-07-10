/*
    Copyright 2012 Antonis Tsiapaliokas <kok3rs@mgmail.com>

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
var assert = require('assert');

describe('List api', function() {
    describe('Request index page', function() {
     it('should work with no trailing slash (/api)', function(done) {
        utils.getHtml('/api',
            function(res) {
                res.statusCode.should.equal(200);
                done();
            });
     });
     it('should work with  atrailing slash (/api/)', function(done) {
        utils.getHtml('/api/',
            function(res) {
                res.statusCode.should.equal(200);
                done();
            });
     });
    });

    describe('when markdown file is found', function() {
     it('should show the content', function(done) {
        utils.getHtml('/api/json_api',
            function(res) {
                res.statusCode.should.equal(200);
                done();
            });
     });

    describe('when markdown file is not found', function() {
        it('should return the 404 page', function(done) {
            utils.getHtml('/api/wrongPath',
                function(res) {
                    res.statusCode.should.equal(200);
                    var pageNotFound = res.body.indexOf('Page Not Found') > -1;
                    assert.equal(pageNotFound, true);
                    done();
                });
            });
        });
    });
});

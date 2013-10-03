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
                    var pageNotFound = res.body.indexOf('Page Not Found') > -1;
                    assert.equal(pageNotFound, false);
                    done();
                });
        });

        it('should work with atrailing slash (/api/)', function(done) {
            utils.getHtml('/api/',
                function(res) {
                    res.statusCode.should.equal(200);
                    var pageNotFound = res.body.indexOf('Page Not Found') > -1;
                    assert.equal(pageNotFound, false);
                    done();
                });
        });

        it('should work with api/index', function(done) {
            utils.getHtml('/api/index',
                function(res) {
                    res.statusCode.should.equal(200);
                    var pageNotFound = res.body.indexOf('Page Not Found') > -1;
                    assert.equal(pageNotFound, false);
                    done();
                });
        });
    });

    describe('Request content', function() {
        it('should show when file is found', function(done) {
            utils.getHtml('/api/bodega.json',
                function(res) {
                    res.statusCode.should.equal(200);
                    var pageNotFound = res.body.indexOf('Page Not Found') > -1;
                    assert.equal(pageNotFound, false);
                    done();
                });
        });

        it('should return the 404 page when the file does not exist', function(done) {
            utils.getHtml('/api/wrongPath',
                function(res) {
                    res.statusCode.should.equal(200);
                    var pageNotFound = res.body.indexOf('Page Not Found') > -1;
                    assert.equal(pageNotFound, true);
                    done();
                });
        });
    });

    describe('Easter eggs', function() {
        it('should find correct for test', function(done) {
            utils.getUrl('hunt/VIVALDI-1/test',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.body.should.have.property('egg', 'correct');
                    done();
                });
        });
    });
});

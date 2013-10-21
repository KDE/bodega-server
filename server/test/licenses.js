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

describe('License listing', function() {
    describe('unauthenticated', function() {
        it('it should fail', function(done) {
            utils.getUrl('asset/types/application/licenses',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type',
                        'Unauthorized');
                    done();
                },
                { noAuth: true });
        });
    });

    utils.auth();

    describe('authenticated', function() {
        it('should list correctly after authenticated', function(done) {
            utils.getUrl('asset/types/application/licenses',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('licenses');
                    res.body.licenses.length.should.be.equal(10);
                    res.body.licenses[0].name.should.be.equal('GPL');
                    done();
                });
        });
    });
});

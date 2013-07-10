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

var utils = require('./support/http');
var assert = require('assert');

describe('Fetch contact information', function() {
    describe('when not authenticated', function() {
        it('should return only warehouse info', function(done) {
            utils.getUrl('contact',
                function(res) {
                    var expected = {
                        name: app.config.warehouseInfo.name,
                        description: app.config.warehouseInfo.description,
                        url: app.config.warehouseInfo.url,
                        contact: app.config.warehouseInfo.contact
                    };
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property( 'content-type', 'application/json');
                    res.body.should.eql(expected);
                    done();
                });
        });
    });

     utils.auth({ store: 'VIVALDI-1' });

     describe('when authenticated', function() {
        it('should return both warehouse and store information when authenticated', function(done) {
         utils.getUrl('contact',
             function(res) {
                var warehouse = {
                    name: app.config.warehouseInfo.name,
                    description: app.config.warehouseInfo.description,
                    url: app.config.warehouseInfo.url,
                    contact: app.config.warehouseInfo.contact
                };
                var store = {
                    name: 'Vivaldi',
                    description: 'Plasma Active tablet from Make Play Live',
                    owner: 'Make Play Live',
                    contact: 'support@makeplaylive.com',
                    links: [
                         {
                             "type": "identi.ca",
                             "url": "https://identi.ca/aseigo",
                             "icon": "extern/identica.png"
                         },
                         {
                             "type": "blog",
                             "url": "http://aseigo.blogspot.com",
                             "icon": "extern/blog.png"
                         },
                         {
                             "type": "website",
                             "url": "http://makeplaylive.com",
                             "icon": ""
                         }
                  ]
                };
                res.statusCode.should.equal(200);
                res.headers.should.have.property( 'content-type', 'application/json');
                res.body.warehouse.should.eql(warehouse);
                res.body.store.should.eql(store);
                done();
             },
             utils.cookie);
        });
     });
});

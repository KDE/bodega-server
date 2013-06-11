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
var assert = require('assert');
var cookie;

describe('Fetch contact information', function() {
     it('should return only warehouse info when not authenticated', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/contact',
            function(res) {
                var expected = {
                    name: app.config.storeInfo.name,
                    description: app.config.storeInfo.description,
                    url: app.config.storeInfo.url,
                    contact: app.config.storeInfo.contact
                };
                res.statusCode.should.equal(200);
                res.headers.should.have.property( 'content-type', 'application/json; charset=utf-8');
                res.body.should.eql(expected);
                done();
            });
     });

     it('should authenticate successfully', function(done){
         utils.getUrl(
             server,
             '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=VIVALDI-1',
             function(res) {
                 res.statusCode.should.equal(200);
                 res.headers.should.have.property( 'content-type', 'application/json; charset=utf-8');
                 res.headers.should.have.property('set-cookie');
                 cookie = res.headers['set-cookie'];
                 res.body.should.have.property('authStatus', true);
                 done();
            });
     });

     it('should return both warehouse and store information when authenticated', function(done) {
         utils.getUrl(
             server,
             '/bodega/v1/json/contact',
             function(res) {
                var warehouse = {
                    name: app.config.storeInfo.name,
                    description: app.config.storeInfo.description,
                    url: app.config.storeInfo.url,
                    contact: app.config.storeInfo.contact
                };
                var store = {
                    name: 'Vivaldi',
                    description: 'Plasma Active tablet from Make Play Live',
                    owner: 'Make Play Live',
                    contact: 'support@makeplaylive.com',
                    links: [
                         {
                             "type": "Website",
                             "url": "http://makeplaylive.com",
                             "icon": ""
                         },
                         {
                             "type": "identi.ca",
                             "url": "undefinedaseigo",
                             "icon": "extern/identica.png"
                         },
                         {
                             "type": "blog",
                             "url": "http://aseigo.blogspot.com",
                         "icon": "extern/blog.png"
                         }
                  ]
                };
                res.statusCode.should.equal(200);
                res.headers.should.have.property( 'content-type', 'application/json; charset=utf-8');
                res.body.warehouse.should.eql(warehouse);
                res.body.store.should.eql(store);
                done();
             },
             cookie);
     });
});

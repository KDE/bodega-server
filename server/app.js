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
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var express = require('express');
var RedisStore = require('connect-redis')(express);
var fs = require('fs');
var https = require('https');
var http = require('http');
/*jshint -W079 */
var app = module.exports = express();
var argv = require('optimist').argv;

process.env.TZ = 'UTC';

GLOBAL.app = app;
app.config = JSON.parse(fs.readFileSync(argv.config ? argv.config : './config.json', 'utf8'));

if (argv.production) {
    app.config.stripe.secretKey = app.config.stripe.liveSecretKey;
} else {
    app.config.stripe.secretKey = app.config.stripe.testSecretKey;
}

// We require our own modules after creating a server
//    so that our config file is available to all the resources
var BodegaDb = require('./lib/bodegadb').BodegaDb;
var AssetStore = require('./lib/assetstore').AssetStore;
var ContentPartner = require('./lib/contentpartner').ContentPartner;

app.db = new BodegaDb();
app.assetStore = new AssetStore();
app.contentPartner = new ContentPartner();

// We don't want an exception to kill our app, but we don't want
//   to intercept exception in tests or during dev testing
if (argv.production) {
    app.use(express.errorHandler());
    process.on('uncaughtException', function(err) {
        console.log("Uncaught exception: ");
        console.log(err);
        console.log(err.stack);
    });
} else {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}

// Configuration
//app.use(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: app.config.cookieSecret ? app.config.cookieSecret : "love cookies",
                          store: new RedisStore(app.config.redis) }));
app.use(app.router);
app.set('views', __dirname + '/views');

app.use(function(req, res, next) {
    res.render('404.jade', {
        storeName: app.config.storeInfo.name,
        storeUrl: app.config.storeInfo.url
    });
});

require('./routes.js');

if (fs.existsSync('cert/key.pem')) {
    // https
    var privateKey = fs.readFileSync('cert/key.pem');
    var certificate = fs.readFileSync('cert/certificate.pem');
    app.server = https.createServer({key: privateKey, cert: certificate}, app);
} else {
    // ** NO ** SSL!
    console.log("WARNING: Setting up server with no ssl!");
    app.server = http.createServer(app);
}

var port = app.config.port;
var host = app.config.host ? app.config.host : null;
app.server.listen(port, host);

console.log("Bodega server listening on %s%d in %s mode",
            host ? host + ':' : '', port, argv.production ? "production" : "devel");

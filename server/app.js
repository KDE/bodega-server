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

// and now our runtime controls that are not set in config.json
app.config.printErrors = true;
app.config.defaultPageSize = 25;

if (argv.production) {
    app.config.appkeys.stripe.secretKey = app.config.appkeys.stripe.liveSecretKey;
    app.production = true;
    app.settings.env = 'production';
} else {
    app.config.appkeys.stripe.secretKey = app.config.appkeys.stripe.testSecretKey;
    app.production = false;
}

// We require our own modules after creating a server
//    so that our config file is available to all the resources
var BodegaDb = require('./lib/bodegadb').BodegaDb;
var AssetStore = require('./lib/assetstore').AssetStore;
var PreviewStore = require('./lib/previewstore').PreviewStore;
var MessageQueue = require('./lib/messagequeue.js').MessageQueue;
var Janitor = require('./lib/janitor.js').Janitor;

app.db = new BodegaDb();
app.messageQueue = new MessageQueue();
app.assetStore = new AssetStore();
app.previewStore = new PreviewStore();
app.janitor = new Janitor();

// Configuration

// We don't want an exception to kill our app, but we don't want
//   to intercept exception in tests or during dev testing
if (argv.production) {
    app.use(express.compress());
    app.use(express.errorHandler());
    process.on('uncaughtException', function(err) {
        console.log("Uncaught exception: ");
        console.log(err);
        console.log(err.stack);
    });
} else {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: app.config.cookieSecret ? app.config.cookieSecret : "love cookies",
                          store: new RedisStore(app.config.service.redis) }));
// Simple CORS middleware; we don't care where a request comes from
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    next();
});
app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('trust proxy', app.config.behindProxy);

app.use(express.favicon("public/favicon.ico"));

var utils = require('./lib/utils.js');
app.use(function(req, res, next) {
    utils.render404(res);
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
            host ? host + ':' : '', port, app.production ? "production" : "devel");

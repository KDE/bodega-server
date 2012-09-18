var express = require('express');
var RedisStore = require('connect-redis')(express);
var fs = require('fs');
var https = require('https');
var http = require('http');
var app = module.exports = express();

GLOBAL.app = app;
app.config = JSON.parse(fs.readFileSync(('./config.json'), 'utf8'));

if (app.settings.env === 'production') {
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
if (app.settings.env === 'production') {
    process.on('uncaughtException', function(err) {
        console.log("Uncaught exception: ");
        console.log(err);
        console.log(err.stack);
    });
}

// Configuration
app.configure(function() {
    //app.use(express.logger());
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({ secret: "love cookies",
                              store: new RedisStore() }));
    app.use(app.router);
    app.set('views', __dirname + '/views');
});

app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('test', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

require('./routes.js');

if (fs.existsSync('cert/key.pem')) {
    // https
    var privateKey = fs.readFileSync('cert/key.pem');
    var certificate = fs.readFileSync('cert/certificate.pem');
    https.createServer({key: privateKey, cert: certificate}, app).listen(app.config.port);
} else {
    // ** NO ** SSL!
    console.log("WARNING: Setting up server with no ssl!");
    http.createServer(app).listen(app.config.port);
}
//});

console.log("Bodega server listening on port %d in %s mode",
            app.config.port, app.settings.env);

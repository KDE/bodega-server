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

var utils = require('./lib/utils.js');
var errors = require('./lib/errors.js');
var markdown = require("marked");
var fs = require('fs');
var path = require('path');

function anonBrowsing(req, res, next)
{
    req.preAuth = app.config.anonAccess &&
                  app.config.anonAccess.browsing === true;
    next();
}

function isAuthorized(req, res, next)
{
    if (req.preAuth === true || req.session.authorized) {
        next();
    } else {
        errors.report("Unauthorized", req, res);
    }
}

function serverPath(path)
{
    //console.log(app.config.prefix + path);
    return app.config.prefix + path;
}

//********************************
// Authentication and registration
app.get(serverPath('auth'), function(req, res) {
    //console.log(req.query);
    res.header(
        'Cache-Control',
        "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
    var store = utils.authStore(req);
    if (store) {
        if (req.query.auth_user &&
            req.query.auth_password) {
            app.db.authorize(req, res);
        } else {
            if (!req.session.user) {
                var user = { "store": store };
                req.session.user = user;
            }
            res.json(utils.standardJson(req));
        }
    } else {
        errors.report('MissingParameters', req, res);
    }
});


app.get(serverPath('register'), function(req, res) {
    //console.log(req.query);
    res.header(
        'Cache-Control',
        "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
    app.db.register(req, res);
});


app.get(serverPath('register/confirm'), function(req, res) {
    //console.log(req.query);
    res.header(
        'Cache-Control',
        "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
    app.db.confirmRegistration(req, res);
});


//********************************
// Store listing
app.get(serverPath('channels'), anonBrowsing, isAuthorized, function(req, res) {
    //console.log(req.query);
    app.db.listChannels(req, res);
});

app.get(serverPath('channel/:parentChannel'), anonBrowsing, isAuthorized,
        function(req, res) {
            app.db.listChannels(req, res);
        });

app.get(serverPath('featured'), anonBrowsing, isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listFeatured(req, res);
        });

app.get(serverPath('search'), anonBrowsing, isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.search(req, res);
        });


//********************************
// Points and purchases
app.get(serverPath('points/buy'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.buyPoints(req, res);
        });

app.get(serverPath('points/price'),
        function(req, res) {
            //console.log(req.query);
            app.db.pointsPrice(req, res);
        });

app.get(serverPath('points/redeemCode/:code'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.redeemPointsCode(req, res);
        });

app.get(serverPath('download/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.download(req, res);
        });

app.get(serverPath('purchase/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.purchaseAsset(req, res);
        });


//********************************
// Collections
app.get(serverPath('collections/list/:collectionId?'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            if (req.params.collectionId) {
                app.db.collectionListAssets(req, res);
            } else {
                app.db.listCollections(req, res);
            }
        });

app.post(serverPath('collections/create'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.createCollection(req, res);
        });

app.get(serverPath('collections/delete/:collectionId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.deleteCollection(req, res);
        });

app.get(serverPath('collections/:collectionId/add/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.collectionAddAsset(req, res);
        });

app.get(serverPath('collections/:collectionId/remove/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.collectionRemoveAsset(req, res);
        });


//********************************
// Account info and management
app.get(serverPath('participant/info'), isAuthorized,
        function(req, res) {
            app.contentPartner.participantInfo(req, res);
        });

app.get(serverPath('participant/history'), isAuthorized,
        function(req, res) {
            app.db.history(req, res);
        });

app.get(serverPath('participant/resetRequest'), function(req, res) {
    //console.log(req.query);
    res.header(
        'Cache-Control',
        "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
    app.db.resetRequest(req, res);
});

app.get(serverPath('participant/resetPassword'), function(req, res) {
    res.render('passwordreset.jade',
               { layout: false,
                 resetCode: req.query.code,
                 userId: req.query.id,
                 userEmail: req.query.email,
                 storeName: app.config.storeInfo.name
               });
});

app.get(serverPath('participant/changePassword'), isAuthorized,
    function(req, res) {
        app.db.setPassword(req, res);
    }
);

app.get(serverPath('participant/changeAccountDetails'), isAuthorized,
    function(req, res) {
        app.db.changeAccountDetails(req, res);
    }
);

app.get(serverPath('participant/paymentMethod'),
    function(req, res) {
        app.db.paymentMethod(req, res);
    }
);


app.get(serverPath('participant/deletePaymentMethod'),
    function(req, res) {
        app.db.deletePaymentMethod(req, res);
    }
);

app.post(serverPath('participant/resetPassword'),
    function(req, res) {
        app.db.resetConfirm(req, res);
    }
);

/************************************************
 * Asset management
 */
app.post(serverPath('asset/create'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.createAsset(req, res);
        });

app.get(serverPath('asset/delete/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.deleteAsset(req, res);
        });

app.post(serverPath('asset/update/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.updateAsset(req, res);
        });

app.get(serverPath('asset/list/:type?*'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listAssets(req, res);
        });

app.get(serverPath('asset/:assetId'), anonBrowsing, isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.assetInfo(req, res);
        });

//*******************************
// Stats
app.get(serverPath('stats/assets'), isAuthorized,
    function(req, res) {
        app.db.assetStats(req, res);
    }
);

//********************************
// Store management
app.get(serverPath('store/list'), isAuthorized,
    function(req, res) {
        app.db.listStores(req, res);
    }
);

app.post(serverPath('store/create'), isAuthorized,
    function(req, res) {
        app.db.createStore(req, res);
    }
);

app.get(serverPath('store/:id/delete'), isAuthorized,
    function(req, res) {
        app.db.deleteStore(req, res);
    }
);

app.post(serverPath('store/:id/setMarkups'), isAuthorized,
    function(req, res) {
        app.db.setStoreMarkups(req, res);
    }
);

app.get(serverPath('store/:id/structure'), isAuthorized,
    function(req, res) {
        app.db.storeChannelStructure(req, res);
    }
);

app.post(serverPath('store/:id/channel/create'), isAuthorized,
    function(req, res) {
        app.db.updateStoreChannel(req, res);
    }
);

app.post(serverPath('store/:id/channel/update/:channel'), isAuthorized,
    function(req, res) {
        app.db.updateStoreChannel(req, res);
    }
);

app.get(serverPath('store/:id/channel/delete/:channel'), isAuthorized,
    function(req, res) {
        app.db.deleteStoreChannel(req, res);
    }
);

app.get(serverPath('store/:id/collection/add/:collection'), isAuthorized,
    function(req, res) {
//        app.db.addFeaturedCollection(req, res);
    }
);

app.get(serverPath('store/:id/collection/remove/:collection'), isAuthorized,
    function(req, res) {
//        app.db.removeFeaturedCollection(req, res);
    }
);

app.get(serverPath('contact'), function(req, res) {
    app.db.contactInfo(req, res);
});

app.get(serverPath('hunt'),
    function(req, res) {
        app.db.hunt(req, res);
    }
);

/******************************************************
 * Note: This must be the last route with a serverPath
 *       because we use to catch invalid urls.
 */
app.get(serverPath('*'), function(req, res) {
    var json = utils.standardJson(req, false);
    json.error = {
        type : "InvalidUrl",
        url : req.url,
        method : req.method
    };
    res.json(json);
});

//********************************
// Static content routes
app.get('/images/*', function(req, res) {
    res.sendfile(__dirname + '/public' + req.url);
});


app.get('/api/(*)', function(req, res) {
    var filename = path.normalize(req.params[0]);
    var filePath;

    if (filename === 'api') {
        //we are on /api/ so we are loading the /doc/index.markdown
        filePath = __dirname + '/doc/index.markdown';
    } else {
        filePath = __dirname + '/doc/' + filename + '.markdown';
    }

    fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) {
            res.render('404.jade', {
                storeName: app.config.storeInfo.name,
                storeUrl: app.config.storeInfo.url
            });
        } else {
            res.send(markdown(data));
        }
    });
});

//NOTE: Always has to be the last route
app.get('/', function(req, res) {
    res.render('index.jade', {
        storeName: app.config.storeInfo.name,
        storeUrl: app.config.storeInfo.url
    });
});


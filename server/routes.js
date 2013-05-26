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

function isAuthorized(req, res, next)
{
    if (req.session.authorized) {
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
    if (req.query.auth_user &&
        req.query.auth_password &&
        utils.authStore(req)) {
        app.db.authorize(req, res);
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
app.get(serverPath('channels'), isAuthorized, function(req, res) {
    //console.log(req.query);
    app.db.listChannels(req, res);
});

app.get(serverPath('channel/:parentChannel'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listChannels(req, res);
        });

app.post(serverPath('create'), isAuthorized,
         function(req, res) {
             //console.log(req.query);
             app.db.createAsset(req, res);
         });


app.get(serverPath('asset/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.assetInfo(req, res);
        });

app.get(serverPath('featured'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listFeatured(req, res);
        });

app.get(serverPath('search'), isAuthorized,
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

app.post(serverPath('upload'), isAuthorized,
         function(req, res) {
             //console.log(req.query);
             app.db.upload(req, res);
         });


//********************************
// Collections
app.get(serverPath('collections/list'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listCollections(req, res);
        });

app.get(serverPath('collections/create'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.createCollection(req, res);
        });

app.get(serverPath('collections/delete'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.deleteCollection(req, res);
        });

app.get(serverPath('collections/listAssets'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.collectionListAssets(req, res);
        });

app.get(serverPath('collections/addAsset'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.collectionAddAsset(req, res);
        });

app.get(serverPath('collections/removeAsset'), isAuthorized,
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


//********************************
// Store management
app.get(serverPath('store/create'), isAuthorized,
    function(req, res) {
        app.db.createStore(req, res);
    }
);

app.get(serverPath('store/info'), isAuthorized,
    function(req, res) {
//        app.db.storeInfo(req, res);
    }
);

app.get(serverPath('store/delete'), isAuthorized,
    function(req, res) {
        app.db.deleteStore(req, res);
    }
);

app.get(serverPath('store/updateChannel'), isAuthorized,
    function(req, res) {
//        app.db.updateStoreChannel(req, res);
    }
);

app.get(serverPath('store/removeChannel'), isAuthorized,
    function(req, res) {
//        app.db.removeStoreChannel(req, res);
    }
);

app.get(serverPath('store/addFeaturedCollection'), isAuthorized,
    function(req, res) {
//        app.db.addFeaturedCollection(req, res);
    }
);

app.get(serverPath('store/removeFeaturedCollection'), isAuthorized,
    function(req, res) {
//        app.db.removeFeaturedCollection(req, res);
    }
);

//********************************
// Static content routes
app.get(serverPath('hunt'),
    function(req, res) {
        app.db.hunt(req, res);
    }
);

app.get('/images/*', function(req, res) {
    res.sendfile(__dirname + '/public' + req.url);
});

//NOTE: Always has to be the last route
app.get('/', function(req, res) {
    res.render('index.jade', {
        storeName: app.config.storeInfo.name,
        storeUrl: app.config.storeInfo.url
    });
});

app.get('/contact', function(req, res) {
    res.json({
        name: app.config.storeInfo.name,
        desciption: app.config.storeInfo.desciption,
        url: app.config.storeInfo.url,
        contact: app.config.storeInfo.contact
    });
});

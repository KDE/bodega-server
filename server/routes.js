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
var roles = require('./lib/roles.js');
var assetRules = require('./assetRules.js');

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
    if (req.preAuth === true || (req.session.user && req.session.authorized)) {
        next();
    } else {
        errors.report("Unauthorized", req, res);
    }
}

function isBodegaManager(req, res, next)
{
    app.db.dbQuery(
        function(db, req, res) {
            roles.isBodegaManager(db, req, res,
                function(err) {
                    if (err) {
                        errors.report("Unauthorized", req, res);
                    } else {
                        next();
                    }
                });
        }, req, res);
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

app.get(serverPath('search'), anonBrowsing, isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.search(req, res);
        });


//********************************
// Points and purchases
app.post(serverPath('points/buy'), isAuthorized,
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

//********************************
// Collections
app.get(serverPath('collection/list/:collectionId?'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            if (req.params.collectionId) {
                app.db.collectionListAssets(req, res);
            } else {
                app.db.listCollections(req, res);
            }
        });

app.post(serverPath('collection/create'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.createCollection(req, res);
        });

app.post(serverPath('collection/update/:collectionId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.updateCollection(req, res);
        });

app.get(serverPath('collection/delete/:collectionId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.deleteCollection(req, res);
        });

app.get(serverPath('collection/:collectionId/add/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.collectionAddAsset(req, res);
        });

app.get(serverPath('collection/:collectionId/remove/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.collectionRemoveAsset(req, res);
        });

//********************************
// Account info and management
app.get(serverPath('participant/info'), isAuthorized,
        function(req, res) {
            app.db.participantInfo(req, res);
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
                 storeName: app.config.warehouseInfo.name
               });
});

app.post(serverPath('participant/resetPassword'),
    function(req, res) {
        app.db.resetConfirm(req, res);
    }
);

app.get(serverPath('participant/changePassword'), isAuthorized,
    function(req, res) {
        app.db.setPassword(req, res);
    }
);

app.post(serverPath('participant/changeAccountDetails'), isAuthorized,
    function(req, res) {
        app.db.changeAccountDetails(req, res);
    }
);

app.get(serverPath('participant/paymentMethod'),
    function(req, res) {
        app.db.paymentMethod(req, res);
    }
);

app.post(serverPath('participant/paymentMethod/update'),
    function(req, res) {
        app.db.updatePaymentMethod(req, res);
    }
);

app.post(serverPath('participant/paymentMethod/delete'),
    function(req, res) {
        app.db.deletePaymentMethod(req, res);
    }
);

// deprecated, use participant/paymentMethod/delete
app.get(serverPath('participant/deletePaymentMethod'),
    function(req, res) {
        app.db.deletePaymentMethod(req, res);
    }
);

app.get(serverPath('participant/ratings/:assetId?'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            if (req.params.assetId) {
                app.db.assetParticipantRatings(req, res);
            } else {
                app.db.participantRatings(req, res);
            }
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

app.get(serverPath('asset/download/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.download(req, res);
        });

// deprecated by above route
app.get(serverPath('download/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.download(req, res);
        });

app.get(serverPath('asset/purchase/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.purchaseAsset(req, res);
        });

// deprecated by above route
app.get(serverPath('purchase/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.purchaseAsset(req, res);
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

app.post(serverPath('asset/post/:assetId'), isAuthorized,
         function(req, res) {
             //console.log(req.query);
             app.db.postAsset(req, res);
         });

app.post(serverPath('asset/publish/:assetId'), isAuthorized,
         function(req, res) {
             //console.log(req.query);
             app.db.publishAsset(req, res);
         });

app.get(serverPath('asset/tags/:assetId'), isAuthorized,
    function(req, res) {
        app.db.listAssetTags(req, res);
    }
);

app.post(serverPath('asset/list/updates'),
        function(req, res) {
            app.db.checkUpdates(req, res);
        });

app.post(serverPath('asset/list/briefs'), anonBrowsing, isAuthorized,
        function(req, res) {
            app.db.listAssetBriefs(req, res);
        });

app.get(serverPath('asset/list/:partnerId/:type?*'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listAssets(req, res);
        });

app.get(serverPath('asset/:assetId'), anonBrowsing, isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.assetInfo(req, res);
        });

app.post(serverPath('asset/ratings/create/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.createAssetRating(req, res);
        });

app.get(serverPath('asset/ratings/delete/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.deleteAssetRating(req, res);
        });

app.get(serverPath('asset/ratings/attributes/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listRatingAttributtes(req, res);
        });

app.get(serverPath('asset/ratings/list/:assetId'), isAuthorized,
        function(req, res) {
            //console.log(req.query);
            app.db.listAssetRatings(req, res);
        }
);

//*******************************
// Stats
app.get(serverPath('stats/assets/?:metric?'), isAuthorized,
    function(req, res) {
        app.db.assetStats(req, res);
    }
);

app.get(serverPath('stats/stores/?:metric?'), isAuthorized,
    function(req, res) {
        app.db.storeStats(req, res);
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

app.get(serverPath('store/delete/:store'), isAuthorized,
    function(req, res) {
        app.db.deleteStore(req, res);
    }
);

app.post(serverPath('store/update/:store'), isAuthorized,
    function(req, res) {
        app.db.updateStore(req, res);
    }
);

app.get(serverPath('store/structure/:store'), isAuthorized,
    function(req, res) {
        app.db.storeChannelStructure(req, res);
    }
);

app.post(serverPath('store/channel/create/:store'), isAuthorized,
    function(req, res) {
        app.db.updateStoreChannel(req, res);
    }
);

app.post(serverPath('store/channel/update/:store/:channel'), isAuthorized,
    function(req, res) {
        app.db.updateStoreChannel(req, res);
    }
);

app.get(serverPath('store/channel/tags/:channel'), isAuthorized,
    function(req, res) {
        app.db.listChannelTags(req, res);
    }
);

app.get(serverPath('store/channel/delete/:store/:channel'), isAuthorized,
    function(req, res) {
        app.db.deleteStoreChannel(req, res);
    }
);

app.get(serverPath('store/collection/add/:store/:collection'), isAuthorized,
    function(req, res) {
//        app.db.addFeaturedCollection(req, res);
    }
);

app.get(serverPath('store/collection/remove/:store/:collection'), isAuthorized,
    function(req, res) {
//        app.db.removeFeaturedCollection(req, res);
    }
);

/******************************************************
 * Tags management
 */
app.get(serverPath('tag/types'), isAuthorized,
    function(req, res) {
        app.db.listTagTypes(req, res);
    }
);

app.get(serverPath('tag/search/:query'), isAuthorized,
    function(req, res) {
        app.db.searchTags(req, res);
    }
);

app.get(serverPath('tag/list/?:type?'), isAuthorized,
    function(req, res) {
        app.db.listTags(req, res);
    }
);

app.get(serverPath('tag/list/forAssetType/:assetType'), isAuthorized,
    function(req, res) {
        app.db.listRelatedTags(req, res);
    }
);

app.post(serverPath('tag/create'), isAuthorized,
    function(req, res) {
        app.db.createTag(req, res);
    }
);

app.post(serverPath('tag/update/:tag'), isAuthorized,
    function(req, res) {
        //console.log(req.body)
        app.db.updateTag(req, res);
    }
);

app.get(serverPath('tag/delete/:tag'), isAuthorized,
    function(req, res) {
        app.db.deleteTag(req, res);
    }
);

/******************************************************
 * Partner management
 */
app.get(serverPath('partner/list'), isAuthorized,
    function(req, res) {
        app.db.listPartner(req, res);
    }
);

app.post(serverPath('partner/create'), isAuthorized,
    function(req, res) {
        app.db.createPartner(req, res);
    }
);

app.post(serverPath('partner/update/:partner'), isAuthorized,
    function(req, res) {
        app.db.updatePartner(req, res);
    }
);

app.post(serverPath('partner/:partner/link/create'), isAuthorized,
    function(req, res) {
        app.db.createPartnerLink(req, res);
    }
);

app.post(serverPath('partner/:partner/link/delete'), isAuthorized,
    function(req, res) {
        app.db.deletePartnerLink(req, res);
    }
);

app.get(serverPath('partner/:partner/banking/account/list'), isAuthorized,
    function(req, res) {
        app.db.listBankAccounts(req, res);
    }
);

app.get(serverPath('partner/:partner/banking/account/delete'), isAuthorized,
    function(req, res) {
        app.db.deleteBankAccount(req, res);
    }
);

app.post(serverPath('partner/:partner/banking/account/update'), isAuthorized,
    function(req, res) {
        app.db.updateBankAccount(req, res);
    }
);

app.get(serverPath('partner/roles/list'), isAuthorized,
    function(req, res) {
        app.db.listPersonRoles(req, res);
    }
);

app.post(serverPath('partner/roles/update/:partner'), isAuthorized,
    function(req, res) {
        app.db.setPersonRole(req, res);
    }
);

app.post(serverPath('partner/request/publisher/:partner'), isAuthorized,
    function(req, res) {
        app.db.requestPublisherStatus(req, res);
    }
);

app.post(serverPath('partner/request/distributor/:partner'), isAuthorized,
    function(req, res) {
        app.db.requestDistributorStatus(req, res);
    }
);

app.get(serverPath('partner/request/list'), isAuthorized, isBodegaManager,
    function(req, res) {
        app.db.listPartnerRequests(req, res);
    }
);

app.post(serverPath('partner/request/manage/:requestId'), isAuthorized, isBodegaManager,
    function(req, res) {
        app.db.managePartnerRequest(req, res);
    }
);

app.get(serverPath('partner/delete/:partner'), isAuthorized, isBodegaManager,
    function(req, res) {
        app.db.deletePartner(req, res);
    }
);

/****************************************************
 * get previews of incoming assets
 */

app.get(serverPath('incomingassetpreview/:assetId/:imagePath'), isAuthorized,
    function(req, res) {
        app.db.sendIncomingAssetPreview(req, res);
    }
);

app.get(serverPath('images/forAssetType/:assetType'), isAuthorized,
    function(req, res) {
        var json = utils.standardJson(req);
        json.images = assetRules.images[req.params.assetType];
        res.json(json);
    }
);

/******************************************************
 * Store and warehouse contact listing
 */
app.get(serverPath('contact'), function(req, res) {
    app.db.contactInfo(req, res);
});


/******************************************************
 * Easter egg hunting
 */
app.get(serverPath('hunt/:store/:code'),
    function(req, res) {
        app.db.hunt(req, res);
    }
);

/******************************************************
 * Note: This must be the last route with a serverPath
 *       because we use to catch invalid urls.
 */
app.all(serverPath('*'), function(req, res) {
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


app.get('/api(/?*)', function(req, res) {
    var filename = path.normalize(req.params[0]);
    var suffix = '.markdown';
    var filePath;

    if (filename === '.' || filename === '/') {
        //we are on /api/ so we are loading the /doc/index.markdown
        filePath = __dirname + '/doc/index.markdown';
    } else {
        filePath = __dirname + '/doc/' + filename;
        if (!fs.existsSync(filePath)) {
            filePath += '.markdown';
        }
    }

    fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) {
            res.render('404.jade', {
                name: app.config.warehouseInfo.name,
                url: app.config.warehouseInfo.url
            });
        } else if (filePath.substr(filePath.length - suffix.length) === suffix) {
            res.send(markdown(data));
        } else {
            res.send(data);
        }
    });
});

//NOTE: Always has to be the last route
app.all('/', function(req, res) {
    res.render('index.jade', {
        name: app.config.warehouseInfo.name,
        url: app.config.warehouseInfo.url
    });
});

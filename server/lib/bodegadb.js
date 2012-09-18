var pg = require('pg');
var utils = require('./utils.js');
var errors = require('./errors.js');
var dbAuthorize = require('./db/authorize.js');
var dbListChannels = require('./db/channels.js');
var dbAssetInfo = require('./db/assetinfo.js');
var dbListFeatured = require('./db/featured.js');
var dbRegister = require('./db/register.js');
var dbPoints = require('./db/points.js');
var dbSearch = require('./db/search.js');
var dbConfirm = require('./db/confirm.js');
var dbChangeAccountDetails = require('./db/changeAccountDetails.js');
var dbSetPassword = require('./db/setpassword.js');
var dbHistory = require('./db/history.js');
var dbResetRequest = require('./db/resetrequest.js');
var dbResetConfirm = require('./db/resetconfirm.js');
var dbDownload = require('./db/download.js');
var dbUpload = require('./db/upload.js');
var dbCollections = require('./db/collections.js');
var dbPurchaseAsset = require('./db/purchaseAsset.js');
var dbHunt = require('./db/easterEggHunt.js');
var dbCreateAsset = require('./db/createasset.js');


var BodegaDb = (function() {
    var connectionString;
    function BodegaDb() {
        connectionString =
            app.config.database.protocol + "://" +
            app.config.database.user + ":" + app.config.database.password +
            "@" + app.config.database.host + "/" +
            app.config.database.name;
    }

    BodegaDb.prototype.dbQuery = function (func, req, res) {
        pg.connect(connectionString, function(err, client) {
            if (err === null) {
                func(client, req, res);
            } else {
                errors.report('Database', req, res, err);
            }
        });
    };

    BodegaDb.prototype.authorize = function(req, res) {
        this.dbQuery(dbAuthorize, req, res);
    };

    BodegaDb.prototype.listChannels = function(req, res) {
        this.dbQuery(dbListChannels, req, res);
    };

    BodegaDb.prototype.listFeatured = function(req, res) {
        this.dbQuery(dbListFeatured, req, res);
    };

    BodegaDb.prototype.assetInfo = function(req, res) {
        this.dbQuery(dbAssetInfo, req, res);
    };

    BodegaDb.prototype.pointsPrice = function(req, res) {
        this.dbQuery(dbPoints.price, req, res);
    };

    BodegaDb.prototype.buyPoints = function(req, res) {
        this.dbQuery(dbPoints.buy, req, res);
    };

    BodegaDb.prototype.redeemPointsCode = function(req, res) {
        this.dbQuery(dbPoints.redeemCode, req, res);
    };

    BodegaDb.prototype.register = function(req, res) {
        this.dbQuery(dbRegister, req, res);
    };

    BodegaDb.prototype.confirmRegistration = function(req, res) {
        this.dbQuery(dbConfirm, req, res);
    };

    BodegaDb.prototype.resetRequest = function(req, res) {
        this.dbQuery(dbResetRequest, req, res);
    };

    BodegaDb.prototype.setPassword = function(req, res) {
        this.dbQuery(dbSetPassword, req, res);
    };

    BodegaDb.prototype.history = function(req, res) {
        this.dbQuery(dbHistory, req, res);
    };

    BodegaDb.prototype.paymentMethod = function(req, res) {
        this.dbQuery(dbChangeAccountDetails.paymentMethod, req, res);
    };

    BodegaDb.prototype.deletePaymentMethod = function(req, res) {
        this.dbQuery(dbChangeAccountDetails.deletePaymentMethod, req, res);
    };

    BodegaDb.prototype.changeAccountDetails = function(req, res) {
        this.dbQuery(dbChangeAccountDetails.changeDetails, req, res);
    };

    BodegaDb.prototype.resetConfirm = function(req, res) {
        this.dbQuery(dbResetConfirm, req, res);
    };

    BodegaDb.prototype.search = function(req, res) {
        this.dbQuery(dbSearch, req, res);
    };

    BodegaDb.prototype.download = function(req, res) {
        this.dbQuery(dbDownload, req, res);
    };

    BodegaDb.prototype.upload = function(req, res) {
        this.dbQuery(dbUpload, req, res);
    };

    BodegaDb.prototype.createAsset = function(req, res) {
        this.dbQuery(dbCreateAsset, req, res);
    };

    BodegaDb.prototype.listCollections = function(req, res) {
        this.dbQuery(dbCollections.listAll, req, res);
    };

    BodegaDb.prototype.createCollection = function(req, res) {
        this.dbQuery(dbCollections.create, req, res);
    };

    BodegaDb.prototype.deleteCollection = function(req, res) {
        this.dbQuery(dbCollections.remove, req, res);
    };

    BodegaDb.prototype.collectionListAssets = function(req, res) {
        this.dbQuery(dbCollections.listAssets, req, res);
    };

    BodegaDb.prototype.collectionAddAsset = function(req, res) {
        this.dbQuery(dbCollections.addAsset, req, res);
    };

    BodegaDb.prototype.collectionRemoveAsset = function(req, res) {
        this.dbQuery(dbCollections.removeAsset, req, res);
    };

    BodegaDb.prototype.purchaseAsset = function(req, res) {
        this.dbQuery(dbPurchaseAsset, req, res);
    };

    BodegaDb.prototype.hunt = function(req, res) {
        this.dbQuery(dbHunt, req, res);
    };

    return BodegaDb;
})();

module.exports.BodegaDb = BodegaDb;

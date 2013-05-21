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
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/

var pg = require('pg');
var utils = require('./utils.js');
var errors = require('./errors.js');
var dbAuthorize = require('./db/authorize.js');
var dbListChannels = require('./db/channels.js');
var dbAssetInfo = require('./db/assetinfo.js');
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
var dbCollections = require('./db/collections.js');
var dbPurchaseAsset = require('./db/purchaseAsset.js');
var dbHunt = require('./db/easterEggHunt.js');
var dbCreateAsset = require('./db/createasset.js');
var dbDeleteAsset = require('./db/deleteasset.js');
var dbUpdateAsset = require('./db/updateasset.js');
var dbListAssets = require('./db/listassets.js');
var dbStats = require('./db/stats.js');
var dbStores = require('./db/stores.js');
var dbContactInfo = require('./db/contactInfo.js');
var dbRatings = require('./db/ratings.js');

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
        pg.connect(connectionString, function(err, client, done) {
            if (err === null) {
                func(client, req, res);
            } else {
                errors.report('Database', req, res, err);
            }
            done();
        });
    };

    BodegaDb.prototype.authorize = function(req, res) {
        this.dbQuery(dbAuthorize, req, res);
    };

    BodegaDb.prototype.listChannels = function(req, res) {
        this.dbQuery(dbListChannels, req, res);
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

    BodegaDb.prototype.createAsset = function(req, res) {
        this.dbQuery(dbCreateAsset, req, res);
    };

    BodegaDb.prototype.deleteAsset = function(req, res) {
        this.dbQuery(dbDeleteAsset, req, res);
    };

    BodegaDb.prototype.updateAsset = function(req, res) {
        this.dbQuery(dbUpdateAsset, req, res);
    };

    BodegaDb.prototype.listAssets = function(req, res) {
        this.dbQuery(dbListAssets, req, res);
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

    BodegaDb.prototype.listStores = function(req, res) {
        this.dbQuery(dbStores.list, req, res);
    };

    BodegaDb.prototype.createStore = function(req, res) {
        this.dbQuery(dbStores.create, req, res);
    };

    BodegaDb.prototype.deleteStore = function(req, res) {
        this.dbQuery(dbStores.remove, req, res);
    };

    BodegaDb.prototype.setStoreMarkups = function(req, res) {
        this.dbQuery(dbStores.setMarkups, req, res);
    };

    BodegaDb.prototype.storeChannelStructure = function(req, res) {
        this.dbQuery(dbStores.channelStructure, req, res);
    };

    BodegaDb.prototype.updateStoreChannel = function(req, res) {
        this.dbQuery(dbStores.updateChannel, req, res);
    };

    BodegaDb.prototype.deleteStoreChannel = function(req, res) {
        this.dbQuery(dbStores.deleteChannel, req, res);

    BodegaDb.prototype.listRatings = function(req, res) {
        this.dbQuery(dbRatings.listAll, req, res);
    };

    BodegaDb.prototype.createRating = function(req, res) {
        this.dbQuery(dbRatings.create, req, res);
    };

    BodegaDb.prototype.deleteRating = function(req, res) {
        this.dbQuery(dbRatings.remove, req, res);
    };

    BodegaDb.prototype.ratingAsset = function(req, res) {
        this.dbQuery(dbRatings.asset, req, res);
    };

    BodegaDb.prototype.ratingPerson = function(req, res) {
        this.dbQuery(dbRatings.person, req, res);
    };

    BodegaDb.prototype.ratingAddAsset = function(req, res) {
        this.dbQuery(dbRatings.addAsset, req, res);
    };

    BodegaDb.prototype.ratingRemoveAsset = function(req, res) {
        this.dbQuery(dbRatings.removeAsset, req, res);
    };

    BodegaDb.prototype.hunt = function(req, res) {
        this.dbQuery(dbHunt, req, res);
    };

    BodegaDb.prototype.assetStats = function(req, res) {
        this.dbQuery(dbStats.assetStats, req, res);
    };

    BodegaDb.prototype.contactInfo = function(req, res) {
        this.dbQuery(dbContactInfo, req, res);
    };

    return BodegaDb;
})();

module.exports.BodegaDb = BodegaDb;

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

var utils = require("./utils.js");

var ErrorType = {
    "Connection"             : 1,//reserved for client side connection errors
    "Unknown"                : 2,//unexpected problem
    "Database"               : 3,//db communication problem
    "Unauthorized"           : 4,//unauthorized access
    "MissingParameters"      : 5,//username/password/store id missing
    "NoMatch"                : 6,//no or incorrect result
    "AccountInactive"        : 7,//account is inactive
    "AccountExists"          : 8,//collection/asset already exists
    "PurchaseFailed"         : 9,//failed to purchase item
    "MailerFailure"          : 10,//failed to generate an email
    "AccountUpdateFailed"    : 11,//account update failed
    "EncryptionFailure"      : 12,//couldn't encrypt text
    "PasswordTooShort"       : 13,//password has to be at least 8 characters
    "Download"               : 14,//problem with the download
    "AccessDenied"           : 15,//access denied to the requested asset
    "RedeemCodeFailure"      : 16,//could not redeem points code.
    "InvalidEmailAddress"    : 1000,//email address not valid
    "InvalidAsset"           : 1001,//The asset doesn't exist in this store
    "InvalidRole"            : 1002,//The account lacks the necessary person role
    "InvalidAccount"         : 1003,//The account does not exist
    "TooManyParameters"      : 1004,//Too many parameters were passed in to a call
    "AccountNotEnoughPoints" : 1005,//Not enough points to complete an asset purchase

    "PurchaseMethodCreation" : 17,//could not link credit card to customer
    "PurchaseMethodDeletion" : 18,//delete card details
    "PurchaseMethodDetails"  : 19,//problem updating customer card details
    "PurchaseMethodMissing"  : 20,//customer card details missing
    "CustomerRetrieval"      : 21,//problems retrieving card details
    "CustomerDatabase"       : 22,//db error while querying for customer id
    "CustomerCharge"         : 23,//unable to charge the customers card
    "CustomerRefund"         : 24,//unable to charge the customers card
    "ChargeNotRecorded"      : 25,//charged the customer but couldn't record it
    "PurchaseNotEnoughPoints": 26,//not enough points for a purchase
    "PurchaseTooManyPoints"  : 27,//tried to buy too many points at once
    "CollectionExists"       : 28,//collection/asset already exists
    "AssetExists"            : 29,//collection/asset already exists

    "CardDeclined"           : 30,//credit card was declined
    "CardIncorrectNumber"    : 31,//incorrect credit card number
    "CardInvalidNumber"      : 32,//invalid credit card number
    "CardInvalidExpiryMonth" : 33,//invalid credit card expiry month
    "CardInvalidExpiryYear"  : 34,//invalid credit card expiry year
    "CardInvalidCVC"         : 35,//invalid credit card cvs
    "CardExpired"            : 36,//card expired
    "CardInvalidAmount"      : 37,//invalid payment amount
    "CardDuplicateTransaction" : 38,//same transaction was just submitted
    "CardProcessingError"    : 39,//error occurred while processing the card

    "PartnerInvalid"         : 40, //the partner ID provided is invalid for the request
    "UploadFailed"           : 41, //the uploading of the file did not succeed
    "UploadInvalidJson"      : 42, //asset info data was malformed
    "UploadTagError"         : 43, //one of the required tags is missing
    "UploadPreviewError"     : 44, //the asset is missing a preview
    "UploadIconError"        : 45, //the asset is missing an icon
    "AssetMissing"           : 46, //the given asset doesn't exist'
    "InvalidUrl"             : 47, //the requested url is invalid

    "PreviewFileMissing"     : 48, //one of the preview files is missing
    "IconWrongSize"          : 49, //one of the icons is of the wrong size
    "CoverWrongSize"         : 50, //one of the covers is of the wrong size
    "ScreenshotWrongSize"    : 51, //one of the screenshots is of the wrong size
    "AssetMissingIcons"      : 52, //asset is missing the required icons
    "AssetMissingScreenshot" : 53, //asset is missing required screenshot
    "AssetMissingCover"      : 54, //asset is missing required screenshot
    "AssetInfoMissing"       : 55, //asset info is missing
    "AssetFileMissing"       : 56, //the specified asset file doesn't exist
    "AssetPosted"            : 57, //can't edit a posted asset!
    "InvalidAssetListing"    : 58, //the specified asset listing is invalid
    "PartnerRoleMissng"      : 59, //person is not a validator

    "StoreIdExists"          : 60,//on creating a store, the store id already exists
    "StoreNameInvalid"       : 62,//an invalid (e.g. missing) store name
    "StoreNotDeleted"        : 63,//deleting a store failed
    "StoreIdInvalid"         : 64,//the provided store id is not valid for this user
    "StoreChannelIdInvalid"  : 65,//the requested channel id for editting is invalid
    "StoreCreateChannelFailed": 66,//could not create the requested channel
    "PublishingFailed"       : 67,//wasn't able to publish an asset

    "PartnerNameExists"      : 80,//the partner already exists in the database
    "InvalidLinkService"     : 81,//the service requested for use as a link does not exist

    "TagIdInvalid"           : 90,//The tag that has been requested doesn't exist
    "TagNotDeleted"          : 91,//The tag that has been requested to be deleted is still there
    "TagExists"              : 92,//The tag that has been requested to be created already exists
    "TagTypeInvalid"         : 93,//The tag that has been requested doesn't exist
    "RatingExists"           : 94,//rating already exists
    "UploadMissingTag"       : 95, //The asset doesn't have a required tag
    "AssetIconMissing"       : 96 //The asset Doesn't have any icon
};

var DbErrorType = {
    UniqueKey: '23505'
};

module.exports.Type = ErrorType;

module.exports.DbErrorType = DbErrorType;

module.exports.dbErrorType = function(err, type)
{
    return err && err.code === DbErrorType[type];
};

module.exports.create = function(name, msg)
{
    var e = new Error();
    if (ErrorType[name]) {
        e.type = name;
    }
    e.name = name;
    e.message = msg;
    return e;
};

module.exports.log = function(err)
{
    if (app.config.printErrors && err && err.message) {
        console.warn('-- Error:');
        console.warn(err);
        console.trace();
        console.warn('-- end --');
    }
};

module.exports.report = function(type, req, res, err)
{
    if (!ErrorType[type] || ErrorType[type] < 0) {
        console.warn("Unknown error type " + type);
        type = "Unknown";
    }

    var json = utils.standardJson(req, false);
    json.error = {
        'type' : type
    };

    if (err && err.message) {
        json.message = err.message;
    }

    module.exports.log(err);
    res.json(json);
};

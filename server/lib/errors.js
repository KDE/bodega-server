
var ErrorType = {
    "Connection"             : 1,//reserved for client side connection errors
    "Unknown"                : 2,//unexpected problem
    "Database"               : 3,//db communication problem
    "Unauthorized"           : 4,//unauthorized access
    "MissingParameters"      : 5,//username/password/device id missing
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
};

module.exports.Type = ErrorType;


module.exports.create = function(name, msg)
{
    var e = new Error();
    e.name = name;
    e.message = msg;
    return e;
};

module.exports.report = function(type, req, res, err)
{
    if (!ErrorType[type] || ErrorType[type] < 0) {
        console.warn("Unknown error type " + type);
        type = "Unknown";
    }

    var obj = {};
    obj.device = 0;
    obj.authStatus = false;
    obj.points = 0;
    obj.error = {
        'type' : type
    };

    if (req && req.session && req.session.authorized &&
        req.session.user) {
        obj.authStatus = req.session.authorized;
        obj.device = req.session.user.device;
        obj.points = req.session.user.points;
    }

    if (err && err.message) {
        console.warn('-- Error:');
        console.trace();
        console.warn(err);
        console.warn('-- end --');
    }

    res.json(obj);
};


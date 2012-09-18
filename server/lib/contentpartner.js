var utils = require('./utils.js');
var dbParticipantInfo = require('./db/participantInfo.js');

var ContentPartner = (function()
{
    function ContentPartner()
    {
    }

    ContentPartner.prototype.participantInfo = function(req, res) {
        app.db.dbQuery(dbParticipantInfo, req, res);
    };

    ContentPartner.prototype.listAssets = function(req, res) {

    };

    return ContentPartner;
})();

module.exports.ContentPartner = ContentPartner;

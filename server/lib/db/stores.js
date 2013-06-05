/* 
    Copyright 2013 Coherent Theory LLC

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

var errors = require('../errors.js');
var utils = require('../utils.js');

function defaultPartnerId(db, req, res, fn)
{
    db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Store Manager';",
            [req.session.user.id],
            function(err, result) {
                if (err || !result.rows || result.rows.length === 0) {
                    errors.report('StorePartnerInvalid', req, res);
                    return -1;
                }

                fn(result.rows[0].partner, db, req, res);
            });
}

function partnerId(db, req, res, fn)
{
    var partner = utils.parseNumber(req.body.partner ? req.body.partner : req.query.partner);
    if (partner < 1) {
        defaultPartnerId(db, req, res, fn);
    } else {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Store Manager';",
                [partner, req.session.user.id],
                function(err, result) {
                    if (err || !result.rows || result.rows.length === 0) {
                        errors.report('StorePartnerInvalid', req, res);
                        return;
                    }

                    fn(partner, db, req, res);
                });
    }
}

function sendStoreJson(id, db, req, res)
{
    var query = "select s.id, s.name, s.description, s.partner as partnerId, p.name as partnerName, s.minMarkup, s.maxMarkup, s.flatMarkup, s.markup \
                 from stores s join partners p on (s.partner = p.id) \
                 where p.id in (select distinct partner from affiliations where person = $1)";
    var params = [req.session.user.id];
    if (typeof id === 'string' && id.length > 0) {
        query += " and s.id = $2";
        params.push(id);
    }
    query += " order by s.id";

    db.query(query, params, function(err, result) {
                 if (err || !result.rows || result.rows.length < 1) {
                     errors.report('Database', req, res, err);
                     return;
                 }

                 var storeInfo = [];

                 for (var i = 0; i < result.rows.length; ++i) {
                     var r = result.rows[i];
                     storeInfo.push(
                         { 'id': r.id,
                           'name': r.name,
                           'desc': r.description,
                           'partner': { 'id': r.partnerid, 'name': r.partnername },
                           'markups': { 'min': r.minmarkup, 'max': r.maxmarkup,
                           'flat': r.flatmarkup, 'markup': r.markup }
                     });
                 }

                 var json = utils.standardJson(req);
                 json.storeInfo = storeInfo;
                 res.json(json);
             });
}

function createWithPartner(partner, db, req, res)
{
    var name = req.body.name;
    if (!name || name === '') {
        errors.report('StoreNameInvalid', req, res);
        return;
    }

    var id = req.body.id;
    if (!id || id === '') {
        id = partner + '_' + name.toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
    }

    // confirm that this store ID does not exist first
    db.query("select id from stores where id = $1;", [id],
             function(err, result) {
                 if (err) {
                    errors.report('Database', req, res, err);
                    return;
                 }

                 if (result.rows && result.rows.length > 0) {
                    errors.report('StoreIdExists', req, res);//, errors.create("Store id exists", "Attempted to create " + id + " for " + partner));
                    return;
                 }

                 var minMarkup = utils.parseNumber(req.body.minMarkup);
                 var maxMarkup = utils.parseNumber(req.body.maxMarkup);
                 var flatMarkup = utils.parseBool(req.body.flatMarkup);
                 var markup = utils.parseNumber(req.body.markup);
                 db.query("insert into stores (id, partner, name, description, minMarkup, maxMarkup, flatMarkup, markup) values ($1, $2, $3, $4, $5, $6, $7, $8);",
                          [id, partner, name, req.body.desc, minMarkup, maxMarkup, flatMarkup, markup],
                          function(err, result) {
                            if (err) {
                                errors.report('Database', req, res, err);
                                return;
                            }

                            sendStoreJson(id, db, req, res);
                         });
            });
}

function deleteWithPartner(partner, db, req, res)
{
    var id = req.params.id;
    if (!id || id === '') {
        errors.report('StoreIdInvalid', req, res, errors.create("Invalid Store Id", "Invalid store passed into store deletion: " + id));
        return;
    }

    db.query("delete from stores where id = $1 and partner = $2", [id, partner],
             function(err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                if (result.rowCount < 1) {
                    errors.report('StoreNotDeleted', req, res);
                    return;
                }

                res.json(utils.standardJson(req));
             });
}

function ifCanManageStore(db, req, res, fn)
{
    partnerId(db, req, res,
              function(partner, db, req, res) {
                  db.query("select id from stores where id = $1 and partner = $2", [req.query.id, partner],
                        function(err, result) {
                            if (err || !result) {
                                errors.report('Database', req, res, err);
                                return;
                            }

                            if (result.rowCount < 1) {
                                errors.report('StoreIdInvalid', req, res);
                                return;
                            }

                            fn(partner, result.rows[0].id, db, req, res);
                        });
              });
}

function setMarkups(partner, store, db, req, res)
{
    var query = "update stores set ";
    var updates = [];
    var params = [];
    var count = 0;

    var min = utils.parseNumber(req.query.minmarkup, -1);
    if (min >= 0) {
        updates.push("minMarkup = $" + ++count);
        params.push(min);
    }

    var max = utils.parseNumber(req.query.maxmarkup, -1);
    if (max >= 0) {
        updates.push("maxMarkup = $" + ++count);
        params.push(max);
    }

    var flat = req.query.flatmarkup;
    if (flat) {
        flat = utils.parseBool(flat);
        updates.push("flatMarkup = $" + ++count);
        params.push(flat);
    }

    var markup = utils.parseNumber(req.query.markup, -1);
    if (markup >= 0) {
        updates.push("markup = $" + ++count);
        params.push(markup);
    }

    if (count > 0) {
        query += updates.join(', ') + ' where id = $' + ++count;
        params.push(store);
        db.query(query, params,
                 function(err, result) {
                     if (err) {
                         errors.report('Database', req, res, err);
                         return;
                     }

                     sendStoreJson(store, db, req, res);
                 });
    } else {
        sendStoreJson(store, db, req, res);
    }
}

function createChannel(partner, store, db, req, res)
{
    var channelParent = utils.parseNumber(req.query.channel.parent);
    var channelName = req.query.channel.name;
    var channelDescription = req.query.channel.description;
    db.query("select ct_addChannel($1, $2, $3, $4) as channel;", [store, channelParent, channelName, channelDescription],
             function(err, results) {
                 if (err) {
                     errors.report('Database', req, res, err);
                     return;
                 }

                 if (results.rows[0].channel < 1) {
                     errors.report('StoreCreateChannelFailed', req, res);
                     return;
                 }

                 sendChannelInfo(results.rows[0].channel, db, req, res);
             });
}

function sendChannelInfo(channelId, db, req, res)
{
    var query = "SELECT id, store, parent, image, name, description, active, assetcount FROM channels WHERE id = $1;";
    db.query(query, [channelId],
            function(err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                if (result.rowCount < 1) {
                    errors.report('StoreChannelIdInvalid', req, res);
                    return;
                }

                var json = utils.standardJson(req);
                json.channel = result.rows[0];
                res.json(json);
            });
}

function addChannelTags(partner, store, channelId, db, req, res)
{
    var immediateRm = true;
    if (req.query.addTags && Array.isArray(req.query.addTags)) {
        var addTags = [];
        req.query.addTags.each(function(val) { var tag = utils.parseNumber(val); if (tag > 0) { addTags.push(tag); } });
        if (addTags.length > 0) {
            immediateRm = false;
            db.query("select ct_addTagsToChannel($1, $2, '{" + addTags.join(', ') + "}'::INT);", [channelId, partner],
                     function(err, res) {
                         if (error) {
                             errors.report('Database', req, res, err);
                             return;
                         }

                         rmChannelTags(partner, store, channelId, db, req, res);
                     });
        }
    }

    if (immediateRm) {
        rmChannelTags(partner, store, channelId, db, req, res);
    }
}

function rmChannelTags(partner, store, channelId, db, req, res)
{
    var immediateSend = true;
    if (req.query.rmTags && Array.isArray(req.query.rmTags)) {
        var rmTags = [];
        req.query.rmTags.each(function(val) { var tag = utils.parseNumber(val); if (tag > 0) { rmTags.push(tag); } });
        if (rmTags.length > 0) {
            immediateSend = false;
            db.query("select ct_rmTagsFromChannel($1, $2, '{" + rmTags.join(', ') + "}'::INT);", [channelId, partner],
                     function(err, res) {
                         if (error) {
                             errors.report('Database', req, res, err);
                             return;
                         }

                         sendChannelInfo(channelId, db, req, res);
                     });
        }
    }

    if (immediateSend) {
        sendChannelInfo(channelId, db, req, res);
    }
}

function updateChannel(partner, store, db, req, res)
{
    var channelId = utils.parseNumber(req.query.channel.id);

    if (channelId > 0) {
        var channelParent = utils.parseNumber(req.query.channel.parent);
        var channelName = req.query.channel.name;
        var channelDescription = req.query.channel.description;
        db.query("select partner, parent, toplevel from channels where id = $1;", [ channelId ],
                 function(err, result) {
                     if (err) {
                         errors.report('Database', req, res, err);
                         return;
                     }

                     if (!result || !result.rows || result.rowCount < 1) {
                         errors.report('StoreChannelIdInvalid', req, res);
                         return;
                     }

                     // check that the parent is not going to create a loop
                     // check that the parent exists, associated with this partner?
                     // set the name
                     db.query('select ct_updateChannel($1, $2, $3, $4);', [channelId, channelParent, channelName, channelDescription],
                              function(err, result) {
                                  // the next two blocks will be process async, but we return right away
                                  // if a tagging fails, we don't both to send an error to the client
                                  addChannelTags(partner, store, channel, db, req, res);
                              });

                 });
    } else {
        createChannel(partner, store, db, req, res);
    }
}

function deleteChannel(partner, store, db, req, res)
{
    var channelId = utils.parseNumber(req.query.channelId);

    if (channelId > 0) {
        db.query('delete from channels where id = $1 and store = $2;', [channelId, store],
                 function(err, results) {
                     if (err) {
                         errors.report('Database', req, res, err);
                         return;
                     }

                     res.json(utils.standardJson(req));
                 });
    } else {
        res.json(utils.standardJson(req));
    }
}

function channelStructureFetch(json, leafObj, parent, db, req, res)
{
    db.query('select t.id as id, t.title as title, t.type as type from channelTags ct left join tags t on (ct.tag = t.id) where ct.channel = $1',
             [parent],
    function(err, results) {
    if (err) {
        errors.report('Database', req, res, err);
        return;
    }

    for (var i = 0; i < results.rowCount; ++i) {
        leafObj.tags.push(results.rows[i]);
    }

    db.query('select id, parent, image, name, description, active, assetCount from channels where parent = $1 order by id',
             [parent],
             function(err, results) {
                if (err) {
                    errors.report('Databsae', req, res, err);
                    return;
                }

                channelStructureLaunch(results, json, leafObj, db, req, res);

                --json.remaining;
                if (json.remaining < 1) {
                    delete json.remaining;
                    //console.log(JSON.stringify(json, undefined, 2));
                    res.json(json);
                }
            });
    });
}

function channelStructureLaunch(results, json, leafObj, db, req, res)
{
    if (results.rowCount < 1) {
        return;
    }

    json.remaining += results.rowCount;
    for (var i = 0; i < results.rowCount; ++i) {
        var row = results.rows[i];
        var channel = { 'id': row.id,
                        'name': row.name,
                        'description': row.description,
                        'image': row.image,
                        'active': row.active,
                        'assetCount': row.assetCount,
                        'tags': [],
                        'channels': []
        };
        leafObj.channels.push(channel);
        channelStructureFetch(json, channel, channel.id, db, req, res);
    }
}

function channelStructure(partner, store, db, req, res)
{
    db.query('select id, parent, image, name, description, active, assetCount from channels where parent is null and store = $1 order by id', [store],
             function(err, results) {
                 if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                var json = utils.standardJson(req);
                json.channels = [];

                if (results.rowCount < 1) {
                    res.json(json);
                    return;
                }

                json.remaining = 0;
                channelStructureLaunch(results, json, json, db, req, res);
            });
}

/********************* PUBLIC API *********************/

/**
 * No arguments taken, returns an array containing all stores associated to this
 * person's partner organizations
 */
module.exports.list = function(db, req, res) {
    sendStoreJson(null, db, req, res);
}

/**
 * + int partner
 * + string name
 * * string id
 * * string description
 * * int minmarkup
 * * int maxmarkup
 * * int flatmarkup
 * * int markup
 *
 * Returns a store info structure
 **/
module.exports.create = function(db, req, res) {
    partnerId(db, req, res, createWithPartner);
};

/**
 * + string id
 */
module.exports.delete = function(db, req, res) {
    partnerId(db, req, res, deleteWithPartner);
};

/**
 * + string id
 * + int minMarkup
 * + int maxMarkup
 * + bool flatMarkup
 * + markup
 *
 * Returns a channel info structure
 */
module.exports.setMarkups = function(db, req, res) {
    ifCanManageStore(db, req, res, setMarkups);
}

/**
 * + string id
 * + channel {
 *      * int id; if < 1 (or missing) a new channel will be created
 *      * int parent; the parent channel for this one
 *      * string name; the name for the channel
 *      * string description
 *      at least one of id or name must be provided
 *      * Array[int] addTags
 *      * Array[int] rmTags
 *
 * Returns a channel info structure
 */
module.exports.updateChannel = function(db, req, res) {
    ifCanManageStore(db, req, res, updateChannel);
}

/**
 * + string id
 * + int channelId
 */
module.exports.deleteChannel = function(db, req, res) {
    ifCanManageStore(db, req, res, deleteChannel);
}

/**
 * + string id
 *
 * Returns a JSON object reflecting the channel structure of the store
 */
module.exports.channelStructure = function(db, req, res) {
    ifCanManageStore(db, req, res, channelStructure);
}

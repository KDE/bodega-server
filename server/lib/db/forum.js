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
var async = require('async');
var utils = require('../utils.js');
var url = require('url');

var TOPICS_PER_PAGE = 29;
var DEFAULT_PAGESIZE = 50;

function findCategory(db, req, res, cb) {
    var assetId = utils.parseNumber(req.params.assetId);

    if (assetId <= 0) {
        errors.report('MissingParameters', req, res);
        return;
    }

    req.query.pagesize = utils.parseNumber(req.query.pagesize);
    req.query.pagesize = req.query.pagesize === 0 ? DEFAULT_PAGESIZE : req.query.pagesize;
    req.query.offset = utils.parseNumber(req.query.offset);

    var forumQuery = 'SELECT categoryName FROM discourseLinks WHERE assetId = $1;';
    var categoryUrl = '';
    var json = utils.standardJson(req);

    json.topics = [];
    db.query(forumQuery, [assetId], function(err, result) {
        if (err) {
            var e = errors.create('Database', err.message);
            cb(e, db, req, res, json, categoryUrl);
            return;
        }

        if (result && result.rowCount > 0) {
            categoryUrl =  app.config.service.discourse.externalUrl + 'category/' + url.format(result.rows[0].categoryname+ '.json');
            categoryUrl = ~~(req.query.offset / TOPICS_PER_PAGE) > 0 ?
                          categoryUrl + '?page=' + ~~(req.query.offset / TOPICS_PER_PAGE) : categoryUrl;

            cb(null, req, res, json, categoryUrl);
        }
    });
}

function findTopics(req, res, json, categoryUrl, cb) {
    var ok;
    async.whilst(
        function() { return json.topics.length < req.query.pagesize && categoryUrl !== null },
        function(callback) {
            utils.get(categoryUrl, function(error, info) {
                if (error === null) {
                    var forumTopics = info.topic_list.topics;
                    // Q: Why a custom limit and not the entire array?
                    // A: Each discourse page has 29 assets.so if we have 3
                    //    as a pagesize without the `var end` it will
                    //    parse 29 instead of 3. But if our pagesize is 50
                    //    then we want to parse the entire array and also
                    //    we will need another page.
                    var end = req.query.pagesize > TOPICS_PER_PAGE ? forumTopics.length : req.query.pagesize;

                    var begin = 0;
                    if (req.query.offset > 0) {
                        if (req.query.offset < TOPICS_PER_PAGE) {
                            begin = req.query.offset - 1;
                        } else {
                            begin = req.query.offset % TOPICS_PER_PAGE;
                        }
                        end += begin;
                    }

                    // we are about to access a javascript array
                    // which may have a end > length. So if this
                    // is the case our server will crash. Instead
                    // we will put it in a try-catch block and if
                    // it fails a nice error will appear.
                    try {
                        for (begin; begin < end; begin++) {
                            var topic = {
                                title: forumTopics[begin].fancy_title,
                                slug: forumTopics[begin].slug,
                                id: forumTopics[begin].id,
                                message: ''
                            };
                            json.topics.push(topic);
                        }
                    } catch(err) {
                        callback(err);
                    }

                    categoryUrl = info.topic_list.hasOwnProperty('more_topics_url') ?
                                    (app.config.service.discourse.externalUrl + info.topic_list.more_topics_url) : null;
                    callback(null);
                } else {
                    callback(error);
                }
            });
        },
        function(err) {
            cb(err, req, res, json);
        }
    );
}

function findPost (req, res, json, cb) {
    var tmpJson = [];
    async.whilst(
       function() { return json.topics.length > 0 },
       function(callback) {
            topic = json.topics.shift();
            var url = app.config.service.discourse.externalUrl + 't/' + topic.slug + '/' + topic.id + '.json';
            utils.get(url, function(error, info) {
                // clean the json
                delete topic.id;
                delete topic.slug;
                if (error === null) {
                    topic.message = info.post_stream.posts[0].cooked;
                    tmpJson.push(topic);
                    callback(null);
                } else {
                    callback(error);
                }
            });
       },
       function(err) {
            json.topics = tmpJson;
            cb(null, req, res, json);
       }
    );
}

module.exports.forum = function(db, req, res) {
    var funcs = [ function(cb) {
        cb(null, db, req, res)
    }];
    funcs.push(findCategory);
    funcs.push(findTopics);
    funcs.push(findPost);

    async.waterfall(funcs, function(err, req, res, json) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }
        res.json(json);
    });
};


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
var request = require('request');
var TOPICS_PER_PAGE = 29;
var DEFAULT_PAGESIZE = 50;

function get(url, cb) {
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            cb(null, JSON.parse(body));
        } else {
            cb(error, null);
            console.log(error);
        }
    });
}

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
        var e = null;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, json, categoryUrl);
            return;
        }

        if (result && result.rowCount > 0) {
            categoryUrl =  app.config.service.discourse.httpLocation + 'category/' + url.format(result.rows[0].categoryname+ '.json');
            //jshint -W052
            categoryUrl = ~~(req.query.offset / TOPICS_PER_PAGE) > 0 ?
                          categoryUrl + '?page=' + ~~(req.query.offset / TOPICS_PER_PAGE) : categoryUrl;

            cb(null, req, res, json, categoryUrl);
        } else {
             e = errors.create('NoMatch');
            cb(e, req, res, json);
        }
    });
}

function findPost (topicSlug, topicId) {
    var url = app.config.service.discourse.httpLocation + 't/' + topicSlug + '/' + topicId + '.json';
    get(url, function(error, info) {
        if (error === null) {
            return info.post_stream.posts[0].cooked;
        } else {
            console.log(error);
        }
    });
}

function findTopics(req, res, json, categoryUrl, cb) {
    var ok;
    async.whilst(
        function() { return json.topics.length < req.query.pagesize && categoryUrl !== null; },
        function(callback) {
            get(categoryUrl, function(error, info) {
                if (error === null) {
                    var forumTopics = info.topic_list.topics;
                    categoryUrl = info.topic_list.hasOwnProperty('more_topics_url') ?
                                   (app.config.service.discourse.httpLocation + info.topic_list.more_topics_url) : null;


                    if (forumTopics.length !== 0 && categoryUrl !== null) {
                        // we have more topics, so lets continue

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

                        for (begin; begin < end; begin++) {
                            var topic = {
                                title: forumTopics[begin].fancy_title,
                                slug: forumTopics[begin].slug,
                                id: forumTopics[begin].id,
                                message: findPost(forumTopics[begin].slug, forumTopics[begin].id)
                            };
                            json.topics.push(topic);
                        }
                    }
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

module.exports.forum = function(db, req, res) {
    var funcs = [ function(cb) {
        cb(null, db, req, res);
    }];
    funcs.push(findCategory);
    funcs.push(findTopics);

    async.waterfall(funcs, function(err, req, res, json) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }
        res.json(json);
    });
};


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

var async = require('async');
var pg = require('pg');
var mailer = require('nodemailer');

var MessageQueue = (function() {
    var dbClient;
    var processDelay = app.production ? 5000 : 100;
    var processChunkSize = 10;
    var emailsPending = false;
    var emailQueueQuery = 'select q.process, q.recipient, p.email, p.fullname, hstore_to_matrix(q.data) as data, q.template from emailQueue q left join people p on (q.recipient = p.id) where process = $1';

    function processEmailRequests(err, res)
    {
        if (err || res.rowCount < 1) {
            return;
        }

        var processId = res.rows[0].process;
        var transport = mailer.createTransport("SMTP", app.config.service.smtp);

        var queue = async.queue(function(task, cb) {
            try {
                // since we can have no recipient in some cases (the email may be in the hstore data)
                // we do a check here for whether or not we have a valid person only when we have a recipient
                if (task.data.recipient && !task.data.email) {
                    cb();
                    return;
                }

                var template = require('./messengers/' + task.template);
                try {
                    var assoc = {};
                    for (var i in task.data) {
                        assoc[task.data[i][0]] = task.data[i][1];
                    }

                    task.data = assoc;
                    template.sendEmail(transport, dbClient, task, cb);
                } catch (e) {
                    console.log('Error in messenger ' + task.template  + ': ');
                    console.warn(e);
                }
            } catch (e) {
                console.log('Failed to load messenger for template ' + task.template);
                console.warn(e);
                cb(e);
            }
        });

        queue.drain = function() {
            dbClient.query("select ct_markEmailQueueProcessed('" + processId + "')", [],
                           function() {
                               setTimeout(processEmails, processDelay);
                           });
            transport.close();
        };


        queue.push(res.rows);
    }

    function processEmails()
    {
        //console.log('processing emails');
        emailsPending = false;

        dbClient.query("select ct_reserveEmailQueue(" + processChunkSize + ") as processid", [],
                function(err, res) {
                    if (err) {
                        return;
                    }

                    var processId = res.rows[0].processid;
                    if (processId === '') {
                        return;
                    }

                    dbClient.query(emailQueueQuery, [processId], processEmailRequests);
            });
    }

    function scheduleEmailRun(msg)
    {
        if (msg.payload === 'email') {
            if (!emailsPending) {
                emailsPending = true;
                setTimeout(processEmails, processDelay);
            }

        }
    }

    function MessageQueue()
    {
        var connectionString =
            app.config.service.database.protocol + "://" +
            app.config.service.database.user + ":" + app.config.service.database.password +
            "@" + app.config.service.database.host + "/" +
            app.config.service.database.name;

        dbClient = new pg.Client(connectionString);
        dbClient.connect();
        dbClient.on('notification', scheduleEmailRun);

        dbClient.query("LISTEN messageQueued");

        scheduleEmailRun( { payload: 'email' } );
    }

    return MessageQueue;
})();

module.exports.MessageQueue = MessageQueue;


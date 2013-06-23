
var async = require('async');
var pg = require('pg');
var mailer = require('nodemailer');

var MessageQueue = (function() {
    var dbClient;
    var processDelay = 5000;
    var processChunkSize = 10;
    var emailsPending = false;
    var emailQueueQuery = 'select q.process, q.recipient, p.email, p.fullname, q.template from emailQueue q join people p on (q.recipient = p.id) where process = $1';

    function processEmailRequests(err, res)
    {
        if (err || res.rowCount < 1) {
            return;
        }

        var processId = res.rows[0].process;
        var transport = mailer.createTransport("SMTP", app.config.service.smtp);

        var queue = async.queue(function(task, cb) {
            try {
                var template = require('./messengers/' + task.template);
                template.sendEmail(transport, task, cb);
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
            app.config.database.protocol + "://" +
            app.config.database.user + ":" + app.config.database.password +
            "@" + app.config.database.host + "/" +
            app.config.database.name;

        dbClient = new pg.Client(connectionString);
        dbClient.connect();
        dbClient.on('notification', scheduleEmailRun);

        dbClient.query("LISTEN messageQueued");

        scheduleEmailRun( { payload: 'email' } );
    }

    return MessageQueue;
})();

module.exports.MessageQueue = MessageQueue;


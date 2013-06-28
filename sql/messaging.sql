
--DROP SEQUENCE seq_queueIds;
CREATE SEQUENCE seq_queueIds;

--DROP TABLE emailQueue;
CREATE TABLE emailQueue
(
    id          int         primary key default(nextval('seq_queueIds')),
    recipient   int         references people(id) on delete cascade,
    queued      timestamp   default(current_timestamp),
    data        hstore,
    process     text,
    completed   timestamp,
    template    text        not null
);


CREATE OR REPLACE FUNCTION ct_notifyOfEmailQueuing() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    NOTIFY messageQueued, 'email';
    RETURN NEW;
END
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_notifyOfEmailQueuing ON emailQueue;
CREATE TRIGGER trg_ct_notifyOfEmailQueuing AFTER INSERT ON emailQueue
FOR EACH ROW EXECUTE PROCEDURE ct_notifyOfEmailQueuing();


-- DROP SEQUENCE seq_requestIds;
CREATE SEQUENCE seq_requestIds;

-- DROP TABLE partnerRequests;
CREATE TABLE partnerRequests
(
    id          int         primary key default(nextval('seq_requestIds')),
    partner     int         not null references partners(id) on delete cascade,
    person      int         references people(id) on delete cascade,
    type        text        not null,
    reason      text
);

CREATE OR REPLACE FUNCTION ct_notifyOfPartnerRequest() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    INSERT INTO emailQueue (recipient, data, template)
                    VALUES (NEW.person,
                            hstore(Array[['message', NEW.reason], ['partner', NEW.partner::text]]),
                            'partner_' || NEW.type);
    RETURN NEW;
END
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_ct_notifyOfPartnerRequest ON partnerRequests;
CREATE TRIGGER trg_ct_notifyOfPartnerRequest AFTER INSERT ON partnerRequests
FOR EACH ROW EXECUTE PROCEDURE ct_notifyOfPartnerRequest();

CREATE OR REPLACE FUNCTION ct_reserveEmailQueue(int) RETURNS TEXT AS $$
DECLARE
    rv text := random_string(20);
BEGIN
    --rv := random_string(20);
    UPDATE emailqueue SET process = rv
        WHERE id in (SELECT id FROM emailqueue WHERE process IS NULL LIMIT $1 FOR UPDATE);
    IF NOT FOUND THEN
        RETURN null;
    END IF;
    return rv;
END
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_markEmailQueueProcessed(text) RETURNS VOID AS $$
DECLARE
BEGIN
    UPDATE emailqueue SET completed = current_timestamp WHERE process = $1;
END
$$ LANGUAGE 'plpgsql';


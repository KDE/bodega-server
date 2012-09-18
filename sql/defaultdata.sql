INSERT INTO languages (code, name) VALUES('C', 'English');
INSERT INTO languages (code, name) VALUES ('fr', 'French');
INSERT INTO languages (code, name) VALUES ('de', 'German');
INSERT INTO languages (code, name) VALUES ('es', 'Spanish');
INSERT INTO languages (code, name) VALUES ('it', 'Italian');

INSERT INTO tagTypes (type) VALUES ('partnership');
INSERT INTO tagTypes (type) VALUES ('signoff');
INSERT INTO tagTypes (type) VALUES ('market');
INSERT INTO tagTypes (type) VALUES ('category');
INSERT INTO tagTypes (type) VALUES ('descriptive');
INSERT INTO tagTypes (type) VALUES ('user');
INSERT INTO tagTypes (type) VALUES ('mimetype');
INSERT INTO tagTypes (type) VALUES ('contentrating');
INSERT INTO tagTypes (type) VALUES ('easter eggs');

INSERT INTO tags (type, title) VALUES (7, 'application/x-plasma');

INSERT INTO tags (type, title) VALUES (8, 'Early Childhood');
INSERT INTO tags (type, title) VALUES (8, 'Everyone');
INSERT INTO tags (type, title) VALUES (8, 'Everyone 10+');
INSERT INTO tags (type, title) VALUES (8, 'Teen');
INSERT INTO tags (type, title) VALUES (8, 'Mature');
INSERT INTO tags (type, title) VALUES (8, 'Adults Only');

INSERT INTO licenses (name, text) VALUES ('GPL', '');
INSERT INTO licenses (name, text) VALUES ('LGPL', '');
INSERT INTO licenses (name, text) VALUES ('BSD', '');
INSERT INTO licenses (name, text) VALUES ('Proprietary', '');

-- create a partner for the owner (e.g. CT)
INSERT INTO partners (id, name, developer, distributor) VALUES (0, 'Make Play Live', true, true);

-- a "NULL" device for use with e.g. the bodegamarket log ins
INSERT INTO devices (partner, name, partNumber) VALUES (0, 'No Device', 'null');


-- default roles for the accounts
INSERT INTO personRoles (description) VALUES ('Content Creator');
INSERT INTO personRoles (description) VALUES ('Validator');
INSERT INTO personRoles (description) VALUES ('Accounts');

INSERT INTO batchJobsInProgress (job, dowork) VALUES ('gutenberg', false);


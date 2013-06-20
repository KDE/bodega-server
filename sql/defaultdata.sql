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
INSERT INTO tagTypes (type) VALUES ('assetType');
INSERT INTO tagTypes (type) VALUES ('created');
INSERT INTO tagTypes (type) VALUES ('author');
INSERT INTO tagTypes (type) VALUES ('contributor');
INSERT INTO tagTypes (type) VALUES ('genre');
INSERT INTO tagTypes (type) VALUES ('publisher');
INSERT INTO tagTypes (type) VALUES ('url');
INSERT INTO tagTypes (type) VALUES ('isbn');
INSERT INTO tagTypes (type) VALUES ('platform');

INSERT INTO tags (type, title) VALUES (7, 'application/x-plasma');

INSERT INTO tags (type, title) VALUES (8, 'Early Childhood');
INSERT INTO tags (type, title) VALUES (8, 'Everyone');
INSERT INTO tags (type, title) VALUES (8, 'Everyone 10+');
INSERT INTO tags (type, title) VALUES (8, 'Teen');
INSERT INTO tags (type, title) VALUES (8, 'Mature');
INSERT INTO tags (type, title) VALUES (8, 'Adults Only');


INSERT INTO tags (type, title) SELECT id, 'article' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'application' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'audio' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'audiobook' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'book' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'game' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'magazine' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'movie' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'tvshow' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECt id, 'wallpaper' FROM tagtypes WHERE type = 'assetType';

INSERT INTO licenses (name, text) VALUES ('GPL', '');
INSERT INTO licenses (name, text) VALUES ('LGPL', '');
INSERT INTO licenses (name, text) VALUES ('BSD', '');
INSERT INTO licenses (name, text) VALUES ('Creative Commons Attribution', '');
INSERT INTO licenses (name, text) VALUES ('Creative Commons Attribution-ShareAlike', '');
INSERT INTO licenses (name, text) VALUES ('Creative Commons Attribution-NoDerivs', '');
INSERT INTO licenses (name, text) VALUES ('Creative Commons Attribution-NonCommercial', '');
INSERT INTO licenses (name, text) VALUES ('Creative Commons Attribution-NonCommercial-ShareAlike', '');
INSERT INTO licenses (name, text) VALUES ('Creative Commons Attribution-NonCommercial-NoDerivs', '');
INSERT INTO licenses (name, text) VALUES ('Proprietary', '');

-- a "NULL" store for use with e.g. the bodegamarket log ins
SELECT setval('seq_partnerIds', 1000);
INSERT INTO partners (id, name, developer, distributor) VALUES (0, 'Management Group', true, true);
INSERT INTO stores (partner, name, id) VALUES (0, 'No Store', 'null');
INSERT INTO warehouses VALUES ('main', 15, 10000, false, 15);

-- some social media contact end points
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('facebook', 'extern/facebook.png', 'https://www.facebook.com/pages/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('twitter', 'extern/twitter.png', 'https://www.twitter.com/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('identi.ca', 'extern/identica.png', 'https://identi.ca/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('google+', 'extern/googleplus.png', 'https://plus.google.com/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('blog', 'extern/blog.png', null);
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('website', null, null);

-- default roles for the accounts
INSERT INTO personRoles (description) VALUES ('Store Manager');
INSERT INTO personRoles (description) VALUES ('Content Creator');
INSERT INTO personRoles (description) VALUES ('Validator');
INSERT INTO personRoles (description) VALUES ('Accounts');
INSERT INTO personRoles (description) VALUES ('Partner Manager');

INSERT INTO batchJobsInProgress (job, dowork) VALUES ('gutenberg', false);


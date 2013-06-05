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

INSERT INTO tags (type, title) VALUES (7, 'application/x-plasma');

INSERT INTO tags (type, title) VALUES (8, 'Early Childhood');
INSERT INTO tags (type, title) VALUES (8, 'Everyone');
INSERT INTO tags (type, title) VALUES (8, 'Everyone 10+');
INSERT INTO tags (type, title) VALUES (8, 'Teen');
INSERT INTO tags (type, title) VALUES (8, 'Mature');
INSERT INTO tags (type, title) VALUES (8, 'Adults Only');


INSERT INTO tags (type, title) VALUES (9, 'article');
INSERT INTO tags (type, title) VALUES (9, 'application');
INSERT INTO tags (type, title) VALUES (9, 'audio');
INSERT INTO tags (type, title) VALUES (9, 'audiobook');
INSERT INTO tags (type, title) VALUES (9, 'book');
INSERT INTO tags (type, title) VALUES (9, 'game');
INSERT INTO tags (type, title) VALUES (9, 'magazine');
INSERT INTO tags (type, title) VALUES (9, 'movie');
INSERT INTO tags (type, title) VALUES (9, 'tvshow');
INSERT INTO tags (type, title) VALUES (9, 'wallpaper');

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
insert into partners (id, name, developer, distributor)
       values (0, 'Management Group', true, true);
INSERT INTO stores (partner, name, id) VALUES (0, 'No Store', 'null');


-- default roles for the accounts
INSERT INTO personRoles (description) VALUES ('Store Manager');
INSERT INTO personRoles (description) VALUES ('Content Creator');
INSERT INTO personRoles (description) VALUES ('Validator');
INSERT INTO personRoles (description) VALUES ('Accounts');

INSERT INTO batchJobsInProgress (job, dowork) VALUES ('gutenberg', false);


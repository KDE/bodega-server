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
INSERT INTO tagTypes (type) VALUES ('grouping');
INSERT INTO tagTypes (type) VALUES ('easter eggs');
INSERT INTO tagTypes (type) VALUES ('language');

INSERT INTO tags (type, title) SELECT id, 'Early Childhood' FROM tagtypes WHERE type = 'contentrating';
INSERT INTO tags (type, title) SELECT id, 'Everyone' FROM tagtypes WHERE type = 'contentrating';
INSERT INTO tags (type, title) SELECT id, 'Everyone 10+' FROM tagtypes WHERE type = 'contentrating';
INSERT INTO tags (type, title) SELECT id, 'Teen' FROM tagtypes WHERE type = 'contentrating';
INSERT INTO tags (type, title) SELECT id, 'Mature' FROM tagtypes WHERE type = 'contentrating';
INSERT INTO tags (type, title) SELECT id, 'Adults Only' FROM tagtypes WHERE type = 'contentrating';


-- IMPORTANT NOTE: if you add to the assetType set you MUST also add an entry in the
--                 mandatoryTags object in assetRules.js
INSERT INTO tags (type, title) SELECT id, 'application' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'article' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'audio' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'audiobook' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'book' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'game' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'magazine' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'movie' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'tvshow' FROM tagtypes WHERE type = 'assetType';
INSERT INTO tags (type, title) SELECT id, 'wallpaper' FROM tagtypes WHERE type = 'assetType';

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
INSERT INTO partners (id, name, publisher, distributor) VALUES (0, 'Management Group', true, true);
INSERT INTO stores (partner, name, id) VALUES (0, 'No Store', 'null');
INSERT INTO warehouses (id, minMarkup, maxMarkup, markup) VALUES ('main', 15, 10000, 15);

-- some social media contact end points
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('facebook', 'extern/facebook.png', 'https://www.facebook.com/pages/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('twitter', 'extern/twitter.png', 'https://www.twitter.com/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('identi.ca', 'extern/identica.png', 'https://identi.ca/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('google+', 'extern/googleplus.png', 'https://plus.google.com/');
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('blog', 'extern/blog.png', null);
INSERT INTO partnerContactServices (service, icon, baseUrl) VALUES ('website', null, null);

-- default asset rating attributes
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Usability', 'Clumsy', 'Elegant', id FROM tags
        WHERE title = 'application' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Features', 'Critical gaps', 'Everything needed', id FROM tags
        WHERE title = 'application' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Performance', 'Slow and unstable', 'Fast and reliable', id FROM tags
        WHERE title = 'application' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');

INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Theme', 'Critical gaps', 'Comprehensive', id FROM tags
        WHERE (title = 'application' OR title = 'magazine') AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Writing', 'Clumsy', 'Powerful', id FROM tags
        WHERE (title = 'application' OR title = 'magazine') AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Layout', 'Poorly arranged', 'Beautiful', id FROM tags
        WHERE (title = 'application' OR title = 'magazine') AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');

INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Creativity', 'Uninspired', 'Highly unique', id FROM tags
        WHERE title = 'wallpaper' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Beauty', 'Ugly', 'Gorgeous', id FROM tags
        WHERE title = 'wallpaper' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');

INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Art', 'Poor quality', 'Amazing', id FROM tags
        WHERE title = 'game' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Playability', 'Clumsy', 'Smooth', id FROM tags
        WHERE title = 'game' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Performance', 'Slow and unstable', 'Smooth and reliable', id FROM tags
        WHERE title = 'game' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT 'Enjoyability', 'Boring', 'Could play all day', id FROM tags
        WHERE title = 'game' AND
              type IN (SELECT id FROM tagTypes WHERE type = 'assetType');

-- default roles for the accounts
INSERT INTO personRoles (description) VALUES ('Store Manager');
INSERT INTO personRoles (description) VALUES ('Content Creator');
INSERT INTO personRoles (description) VALUES ('Validator');
INSERT INTO personRoles (description) VALUES ('Accounts');
INSERT INTO personRoles (description) VALUES ('Partner Manager');


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


INSERT INTO languages (code, name)
    VALUES
        ('C', 'English'),
        ('fr', 'French'),
        ('de', 'German'),
        ('es', 'Spanish'),
        ('it', 'Italian');

INSERT INTO tagTypes (type, listPublicly)
    VALUES
        ('partnership', false),
        ('signoff', false),
        ('market', false),
        ('category', true),
        ('descriptive', true),
        ('user', false),
        ('mimetype', true),
        ('contentrating', true),
        ('assetType', true),
        ('created', true),
        ('author', true),
        ('contributor', true),
        ('genre', true),
        ('publisher', true),
        ('url', true),
        ('isbn', true),
        ('platform', false),
        ('grouping', false),
        ('easter eggs', false),
        ('language', true),
        ('servicetype', true),
        ('resolution', true);

INSERT INTO tags (type, title)
    SELECT id, titles.*  FROM tagtypes,
        (VALUES
            ('Early Childhood'),
            ('Everyone'),
            ('Everyone 10+'),
            ('Teen'),
            ('Mature'),
            ('Adults Only')
        ) AS titles
        WHERE type = 'contentrating';

-- IMPORTANT NOTE: if you add to the assetType set you MUST also add an entry in the
--                 mandatoryTags object in assetRules.js
INSERT INTO tags (type, title)
    SELECT id, titles.* FROM tagTypes,
        (VALUES
            ('application'),
            ('article'),
            ('audio'),
            ('audiobook'),
            ('book'),
            ('game'),
            ('magazine'),
            ('movie'),
            ('tvshow'),
            ('wallpaper'),
            ('widget')
        ) AS titles
        WHERE type = 'assetType';

INSERT INTO licenses (name, text)
    VALUES
        ('GPL', ''),
        ('LGPL', ''),
        ('BSD', ''),
        ('Creative Commons Attribution', ''),
        ('Creative Commons Attribution-ShareAlike', ''),
        ('Creative Commons Attribution-NoDerivs', ''),
        ('Creative Commons Attribution-NonCommercial', ''),
        ('Creative Commons Attribution-NonCommercial-ShareAlike', ''),
        ('Creative Commons Attribution-NonCommercial-NoDerivs', ''),
        ('Proprietary', '');

-- a "NULL" store for use with e.g. the bodegamarket log ins
SELECT setval('seq_partnerIds', 1000);
INSERT INTO partners (id, name, publisher, distributor) VALUES (0, 'Management Group', true, true);
INSERT INTO stores (partner, name, id) VALUES (0, 'No Store', 'null');
INSERT INTO warehouses (id, minMarkup, maxMarkup, markup) VALUES ('main', 0, 10000, 15);

-- some social media contact end points
INSERT INTO partnerContactServices (service, icon, baseUrl)
    VALUES
        ('facebook', 'extern/facebook.png', 'https://www.facebook.com/pages/'),
        ('twitter', 'extern/twitter.png', 'https://www.twitter.com/'),
        ('identi.ca', 'extern/identica.png', 'https://identi.ca/'),
        ('google+', 'extern/googleplus.png', 'https://plus.google.com/'),
        ('blog', 'extern/blog.png', null),
        ('website', null, null);

-- default asset rating attributes
INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT details.*, id FROM tags,
        (VALUES
            ('Usability', 'Clumsy', 'Elegant'),
            ('Features', 'Critical gaps', 'Everything needed'),
            ('Performance', 'Slow and unstable', 'Fast and reliable')
        ) AS details
        WHERE type IN (SELECT id FROM tagTypes WHERE type = 'assetType') AND
              title IN ('application', 'widget');

INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT details.*, id FROM tags,
        (VALUES
            ('Content', 'Critical gaps', 'Exceptional'),
            ('Writing', 'Clumsy', 'Powerful'),
            ('Layout', 'Poorly arranged', 'Beautiful')
        ) AS details
        WHERE type IN (SELECT id FROM tagTypes WHERE type = 'assetType') AND
              title IN ('book', 'magazine');

INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT details.*, id FROM tags,
        (VALUES
            ('Creativity', 'Uninspired', 'Highly unique'),
            ('Beauty', 'Ugly', 'Gorgeous')
        ) AS details
        WHERE type IN (SELECT id FROM tagTypes WHERE type = 'assetType') AND
              title = 'wallpaper';

INSERT INTO assetRatingAttributes (name, lowDesc, highDesc, assetType)
    SELECT details.*, id FROM tags,
        (VALUES
            ('Graphics', 'Poor quality', 'Amazing'),
            ('Playability', 'Clumsy', 'Smooth'),
            ('Performance', 'Slow and unstable', 'Smooth and reliable'),
            ('Enjoyability', 'Boring', 'Could play all day')
        ) AS details
        WHERE type IN (SELECT id FROM tagTypes WHERE type = 'assetType') AND
              title = 'game';

-- default roles for the accounts
INSERT INTO personRoles (description)
    VALUES
        ('Store Manager'),
        ('Content Creator'),
        ('Validator'),
        ('Account Manager'),
        ('Partner Manager');


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


--begin;

INSERT INTO partners (id, name, publisher, distributor, supportEmail)
    VALUES
        (1, 'Make·Play·Live', true, true, 'support@makeplaylive.com'),
        (100, 'Project Gutenberg', true, false, null);
INSERT INTO partnercontacts (partner, service, url)
    VALUES
        (1, 'website', 'http://makeplaylive.com'),
        (100, 'website', 'http://http://www.gutenberg.org');

INSERT INTO stores (id, partner, name, description)
       values ('VIVALDI-1', 1, 'Vivaldi', 'Plasma Active tablet from Make·Play·Live');


INSERT INTO tags (type, title) SELECT id, 'application/x-plasma' FROM tagtypes WHERE type = 'mimetype';
INSERT INTO tags (type, title) SELECT id, 'Vivaldi' FROM tagTypes WHERE type = 'platform';
INSERT INTO tags (type, title) SELECT id, titles.*
    FROM tagTypes,
        (VALUES
            ('Plasma/Applet'),
            ('Plasma/Wallpaper')
        ) AS titles
    WHERE type = 'servicetype';

INSERT INTO tags (type, title)
    SELECT id, titles.*  FROM tagtypes,
        (VALUES
            ('800x600 (4:3)'),
            ('1024x768 (4:3)'),
            ('1152x864 (4:3)'),
            ('1280x960 (4:3)'),
            ('1400x1050 (4:3)'),
            ('1600x1200 (4:3)'),
            ('1920x1440 (4:3)'),
            ('1280x800 (Wide)'),
            ('1440x900 (Wide)'),
            ('1680x1050 (Wide)'),
            ('1920x1200 (Wide)'),
            ('2560x1600 (Wide)'),
            ('1280x1024 (5:4)'),
            ('852x480 (HD)'),
            ('1280x720 (HD)'),
            ('1366x768 (HD)'),
            ('1920x1080 (HD)')
        ) AS titles
        WHERE type = 'resolution';

INSERT INTO relatedTags (tag, related)
    SELECT w.id, r.id FROM tags w, tags r
        WHERE (w.title = 'wallpaper' AND w.type IN (SELECT id FROM tagTypes WHERE type = 'assetType')) AND
              (r.type IN (SELECT id FROM tagTypes WHERE type = 'resolution'));

-- wallpaper channels
CREATE OR REPLACE FUNCTION vivaldi_generateWallpaperStore() RETURNS VOID AS $$
DECLARE
    wallpaperTag int;
    descTag int;
    wallpaperChannel int;
    tagRec record;
BEGIN
    SELECT INTO wallpaperTag id FROM tags
        WHERE title = 'wallpaper' AND type IN (SELECT id FROM tagTypes WHERE type = 'assetType');

    INSERT INTO channels (image, name, store)
        VALUES ('default/wallpaper.png', 'Wallpapers', 'VIVALDI-1');
    SELECT INTO wallpaperChannel id FROM channels WHERE store = 'VIVALDI-1' AND
                                                        parent IS NULL AND
                                                        name = 'Wallpapers';

    FOR descTag IN
    INSERT INTO tags (type, title) SELECT id, names.*
        FROM tagTypes,
            (VALUES
                ('Abstract'),
                ('Animal'),
                ('Astronomical'),
                ('Celebrities'),
                ('Cartoon'),
                ('Dark'),
                ('Humor'),
                ('Food'),
                ('Film & TV'),
                ('Nature'),
                ('People'),
                ('Technology'),
                ('Vehicles')
            ) AS names
        WHERE type = 'descriptive'
        RETURNING id
    LOOP
        INSERT INTO relatedTags (tag, related) VALUES (wallpaperTag, descTag);
    END LOOP;


    FOR tagRec IN SELECT id, title FROM relatedTags rt JOIN tags t ON (rt.related = t.id)
                        WHERE tag = wallpaperTag AND
                              t.type IN (SELECT id FROM tagTypes WHERE type = 'descriptive')
    LOOP
        INSERT INTO channels (parent, name)
            VALUES (wallpaperChannel, tagRec.title);
        INSERT INTO channelTags (channel, tag) VALUES
            (currval('seq_channelIds'), tagRec.id),
            (currval('seq_channelIds'), wallpaperTag);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT vivaldi_generateWallpaperStore();

DROP FUNCTION vivaldi_generateWallpaperStore();

-- application channels
CREATE OR REPLACE FUNCTION vivaldi_generateApplicationStore() RETURNS VOID AS $$
DECLARE
    platformTag int;
    applicationTag int;
    widgetTag int;
    descTag int;
    applicationChannel int;
    widgetChannel int;
    gameTag int;
    appGameChannel int;
    tagRec record;
BEGIN
    -- find the various tags: platform, app, widget and games
    SELECT INTO platformTag id FROM tags
        WHERE title = 'Vivaldi' AND type IN (SELECT id FROM tagTypes WHERE type = 'platform');
    SELECT INTO applicationTag id FROM tags
        WHERE title = 'application' AND type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
    SELECT INTO widgetTag id FROM tags
        WHERE title = 'application' AND type IN (SELECT id FROM tagTypes WHERE type = 'assetType');
    SELECT INTO gameTag id FROM tags
        WHERE title = 'game' AND type IN (SELECT id FROM tagTypes WHERE type = 'assetType');

    -- create the top level Application and Widgets channels
    INSERT INTO channels (image, name, store)
        VALUES ('default/application.png', 'Apps', 'VIVALDI-1');
    SELECT INTO applicationChannel id FROM channels WHERE store = 'VIVALDI-1' AND
                                                          parent IS NULL AND
                                                          name = 'Apps';
    INSERT INTO channels (image, name, store)
        VALUES ('default/application.png', 'Widgets', 'VIVALDI-1');
    SELECT INTO widgetChannel id FROM channels WHERE store = 'VIVALDI-1' AND
                                                     parent IS NULL AND
                                                     name = 'Widgets';

    -- associate the vivaldi platform tag with the app and widget tags
    INSERT INTO relatedTags (tag, related) VALUES (applicationTag, platformTag);
    INSERT INTO relatedTags (tag, related) VALUES (widgetTag, platformTag);

    -- set up the top level application tags
    FOR descTag IN
    INSERT INTO tags (type, title) SELECT id, names.*
        FROM tagTypes,
            (VALUES
                ('Books & Reference'),
                ('Business'),
                ('Comics'),
                ('Communication'),
                ('Education'),
                ('Entertainment'),
                ('Finance'),
                ('Health & Fitness'),
                ('Lifestyle'),
                ('Medical'),
                ('Music & Audio'),
                ('News & Magazines'),
                ('Photography'),
                ('Productivity'),
                ('Shopping'),
                ('Social'),
                ('Sports'),
                ('Tools'),
                ('Transportation'),
                ('Travel & Local'),
                ('Weather')
            ) AS names
        WHERE type = 'descriptive'
        RETURNING id
    LOOP
        INSERT INTO relatedTags (tag, related) VALUES (applicationTag, descTag);
        INSERT INTO relatedTags (tag, related) VALUES (widgetTag, descTag);
    END LOOP;

    -- create channels for the apps and widgets channels based on the tags just created above
    FOR tagRec IN SELECT distinct id, title FROM relatedTags rt JOIN tags t ON (rt.related = t.id)
                        WHERE tag = applicationTag AND
                              t.type IN (SELECT id FROM tagTypes WHERE type = 'descriptive')
    LOOP
        INSERT INTO channels (parent, name)
            VALUES (applicationChannel, tagRec.title);
        INSERT INTO channelTags (channel, tag) VALUES
            (currval('seq_channelIds'), tagRec.id),
            (currval('seq_channelIds'), platformTag),
            (currval('seq_channelIds'), applicationTag);

        INSERT INTO channels (parent, name)
            VALUES (widgetChannel, tagRec.title);
        INSERT INTO channelTags (channel, tag) VALUES
            (currval('seq_channelIds'), tagRec.id),
            (currval('seq_channelIds'), platformTag),
            (currval('seq_channelIds'), widgetTag);
    END LOOP;

    -- set up the game channel for widgets area
    INSERT INTO channels (parent, name) VALUES (widgetChannel, 'Games');
    INSERT INTO tags (type, title) SELECT id, 'Games' FROM tagTypes WHERE type = 'descriptive';
    INSERT INTO relatedTags (tag, related) VALUES (widgetTag, currval('seq_tagIds'));
    INSERT INTO channelTags (channel, tag) VALUES
           (currval('seq_channelIds'), currval('seq_tagIds')),
           (currval('seq_channelIds'), widgetTag);

    -- set up the game channel for applications area
    INSERT INTO channels (parent, name) VALUES (applicationChannel, 'Games');
    appGameChannel = currval('seq_channelIds');

    FOR tagRec IN
    INSERT INTO tags (type, title) SELECT id, names.*
        FROM tagTypes,
            (VALUES
                ('Arcade & Action'),
                ('Cards & Casino'),
                ('Board Games'),
                ('Puzzle'),
                ('Racing'),
                ('Role Playing'),
                ('Strategy'),
                ('Sports')
            ) AS names
        WHERE type = 'descriptive'
        RETURNING id, title
    LOOP
        INSERT INTO  channels (parent, name)
            VALUES (appGameChannel, tagRec.title);
        INSERT INTO channelTags (channel, tag) VALUES
            (currval('seq_channelIds'), tagRec.id),
            (currval('seq_channelIds'), platformTag),
            (currval('seq_channelIds'), gameTag);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT vivaldi_generateApplicationStore();

DROP FUNCTION vivaldi_generateApplicationStore();

--end;

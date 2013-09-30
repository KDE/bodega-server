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
    SELECT t.id, d.*
    FROM tags AS t,
    (
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
    ) AS d
    WHERE t.title= 'wallpaper' AND
          t.type IN (SELECT id FROM tagTypes WHERE type = 'assetType');

--end;

INSERT INTO tagTypes (type, listpublicly) VALUES ('license', true);

ALTER TABLE tags ADD COLUMN url text;

INSERT INTO tags (type, title, url)
    SELECT id, titles.* FROM tagTypes,
    (VALUES
        ('GPL', 'http://www.gnu.org/copyleft/gpl.html'),
        ('LGPL', 'http://www.gnu.org/copyleft/lgpl.html'),
        ('BSD', 'http://opensource.org/licenses/BSD-2-Clause'),
        ('Creative Commons Attribution', 'http://creativecommons.org/licenses/by/3.0/deed.en_US'),
        ('Creative Commons Attribution-ShareAlike', 'http://creativecommons.org/licenses/by-sa/3.0/deed.en_US'),
        ('Creative Commons Attribution-NoDerivs', 'http://creativecommons.org/licenses/by-nd/3.0/deed.en_US'),
        ('Creative Commons Attribution-NonCommercial', 'http://creativecommons.org/licenses/by-nc/3.0/deed.en_US'),
        ('Creative Commons Attribution-NonCommercial-ShareAlike', 'http://creativecommons.org/licenses/by-nc-sa/3.0/deed.en_US'),
        ('Creative Commons Attribution-NonCommercial-NoDerivs', 'http://creativecommons.org/licenses/by-nc-nd/3.0/deed.en_US'),
        ('Proprietary / All rights reserved', null)) as titles
    WHERE type = 'license';

INSERT INTO assetTags (asset, tag)
    SELECT a.id, t.id FROM assets a JOIN licenses l ON (a.license = l.id)
                                    JOIN tags t ON (l.name = t.title);

ALTER TABLE assets DROP COLUMN license;
DROP TABLE licenses;

INSERT INTO relatedTags (tag, related)
    SELECT t.id, r.id FROM tags t JOIN tagTypes ttt ON (t.type = ttt.id AND ttt.type = 'assetType'), tags r JOIN tagTypes rtt ON (r.type = rtt.id and rtt.type = 'license');

\i core.plsql


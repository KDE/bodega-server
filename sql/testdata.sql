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


begin;

-- create some handy functions

CREATE OR REPLACE FUNCTION ct_testing_favoriteBooksByAuthor(email text, author text) RETURNS void
AS
$$
DECLARE
    personId    int;
    authorTagId int;
    favoriteCollectionId int;
    foundAsset  RECORD;
    foundTag    RECORD;
BEGIN
    SELECT id into authorTagId FROM tagTypes WHERE type = 'author';
    SELECT id into personId FROM people WHERE people.email = $1;
    SELECT id into favoriteCollectionId FROM collections WHERE person = personId AND name = 'Authors' and type = 'favorites';
    IF NOT FOUND THEN
       INSERT INTO collections (person, name, public, type)
            VALUES (personId, 'Authors', false, 'favorites');
       SELECT id into favoriteCollectionId FROM collections WHERE person = personId AND name = 'Authors' and type = 'favorites';
    END IF;

    FOR foundTag IN SELECT tags.id, tags.title
            FROM tags WHERE tags.type = authorTagId AND tags.en_index @@ plainto_tsquery('english', $2)
    LOOP
        -- RAISE NOTICE 'tag is %', foundTag;
        FOR foundAsset IN SELECT atags.asset
                          FROM assetTags atags WHERE atags.tag=foundTag.id
        LOOP
            INSERT INTO collectionscontent (collection, asset)
                                    VALUES (favoriteCollectionId, foundAsset.asset);
        END LOOP;
    END LOOP;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_testing_downloadBooksByAuthor(email text, author text) RETURNS void
AS
$$
DECLARE
    personId    int;
    authorTagId int;
    favoriteCollectionId int;
    foundAsset  RECORD;
    foundTag    RECORD;
BEGIN
    SELECT id into authorTagId FROM tagTypes WHERE type='author';
    SELECT id into personId FROM people WHERE people.email=$1;

    FOR foundTag IN SELECT tags.id, tags.title
            FROM tags WHERE tags.type=authorTagId AND tags.en_index @@ plainto_tsquery('english', $2)
    LOOP
        -- RAISE NOTICE 'tag is %', foundTag;
        FOR foundAsset IN SELECT atags.asset
            FROM assetTags atags WHERE atags.tag=foundTag.id
        LOOP
            INSERT INTO downloads (asset, person, address)
                           VALUES (foundAsset.asset, personId, '68.63.112.46');
        END LOOP;
    END LOOP;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_testing_tagByName(text) RETURNS INT AS $$
DECLARE
    tagId int := -1;
BEGIN
    SELECT into tagId id FROM tags WHERE title = $1 limit 1;
    RETURN tagId;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_testing_licenseByName(text) RETURNS INT AS $$
DECLARE
    licenseId int := -1;
BEGIN
    SELECT into licenseId id FROM licenses WHERE name = $1 limit 1;
    RETURN licenseId;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_testing_assetByName(text) RETURNS INT AS $$
DECLARE
    assetId int := -1;
BEGIN
    SELECT into assetId id FROM assets WHERE name = $1 limit 1;
    RETURN assetId;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_testing_personByEmail(text) RETURNS INT AS $$
DECLARE
    personId int := -1;
BEGIN
    SELECT into personId id FROM people WHERE email = $1 limit 1;
    RETURN personId;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE function ct_testing_partnerId(text) RETURNS INT
AS
$$
DECLARE
    partnerId   int;
BEGIN
    SELECT INTO partnerId id FROM partners WHERE name = $1;
    IF NOT FOUND THEN
        RETURN null;
    END IF;

    RETURN partnerId;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE function ct_testing_removePriorTestingTags() RETURNS VOID
AS
$$
DECLARE
    tagId int;
BEGIN
    SELECT INTO tagId ct_testing_tagByName('wallpaper');
    IF tagId > -1 THEN
        DELETE FROM tags WHERE id > tagId;
        PERFORM setval('seq_tagids', tagId);
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_testing_ratingAttributeByName(text) RETURNS INT AS $$
DECLARE
    ratingAttributeId int := -1;
BEGIN
    SELECT INTO ratingAttributeId id FROM assetRatingAttributes WHERE name = $1 limit 1;
    RETURN ratingAttributeId;
END;
$$ LANGUAGE plpgsql;

-- reset the database
DELETE FROM pointtransactions;
DELETE FROM people;
DELETE FROM purchases;
DELETE FROM downloads;
DELETE FROM channels;
DELETE FROM stores;
DELETE FROM assets;
DELETE FROM partners;
DELETE FROM affiliations;
DELETE FROM languages;
DELETE FROM assetprices WHERE ending is not null;
DELETE FROM assetRatings;
DELETE FROM assetRatingAverages;
DELETE FROM easterEggs;
DELETE FROM relatedTags;
SELECT ct_testing_removePriorTestingTags();

SELECT setval('seq_assetsids', 1);
SELECT setval('seq_channelids', 1);
SELECT setval('seq_languageids', 1);
SELECT setval('seq_peopleids', 1);
SELECT setval('seq_partnerids', 1005);
SELECT setval('seq_purchaseids', 1);
SELECT setval('seq_tagids', 20);
SELECT setval('seq_assetratingsIds', 1);

INSERT INTO relatedTags (tag, related)
    SELECT t.id, r.id FROM tags t, tags r
        WHERE t.title = 'application'
              AND r.type IN (SELECT id FROM tagTypes WHERE type = 'contentrating');

-- now start setting up the data
INSERT INTO people (lastname, firstname, email, points, password, active)
    VALUES ('Rusin', 'Zack', 'zack@kde.org', 10000, '$2a$10$Iejk3uw6uGFCGR5OKaOOZO2tmnlIhPCsCvw7G1pLa81QH4fonDC.C', true);

INSERT INTO people (lastname, firstname, email, points, password, active)
    VALUES ('Seigo', 'Aaron', 'aseigo@kde.org', 10000, '$2a$10$h6oIz3q1suZ5ncy7HS7UcutdJtwI7WBQ9Nd7cpd5b8hPcFbaXlzGq', true);

INSERT INTO people (lastname, firstname, email, points, password, active)
    VALUES ('Martin', 'Marco', 'mart@kde.org', 10000, '$2a$10$VYBi6invWdeT..wQ5FFXqu67HQI5Y8WVAhN5orzUIsWAeMaAItYrS', true);

INSERT INTO partners (id, name, publisher, distributor) VALUES (0, 'Management Group', true, true);
INSERT INTO partners (id, name, publisher, distributor, supportEmail) VALUES (1000, 'Make Play Live', true, true, 'support@makeplaylive.com');
INSERT INTO partnerContacts (partner, service, account, url) VALUES (1000, 'website', null, 'http://makeplaylive.com');
INSERT INTO partnerContacts (partner, service, account, url) VALUES (1000, 'identi.ca', 'aseigo', null);
INSERT INTO partnerContacts (partner, service, account, url) VALUES (1000, 'blog', '', 'http://aseigo.blogspot.com');
INSERT INTO partners (id, name, publisher, distributor, supportEmail) VALUES (1002, 'KDE', false, true, 'info@kde.org');
INSERT INTO partnerContacts (partner, service, account, url) VALUES (1002, 'blog', null, 'http://planet.kde.org');
INSERT INTO partnerContacts (partner, service, account, url) VALUES (1002, 'website', null, 'http://kde.org');
INSERT INTO partners (id, name, publisher, distributor) VALUES (1003, 'Diamond Devices', false, true);
INSERT INTO partners (id, name, publisher, distributor) VALUES (1004, 'Saphire Software', false, true);

SELECT affiliatePerson('aseigo@kde.org', 'Management Group', 'Validator');
SELECT affiliatePerson('zack@kde.org', 'KDE', 'Content Creator');
SELECT affiliatePerson('zack@kde.org', 'KDE', 'Store Manager');
SELECT affiliatePerson('zack@kde.org', 'KDE', 'Validator');
SELECT affiliatePerson('aseigo@kde.org', 'KDE', 'Partner Manager');
SELECT affiliatePerson('mart@kde.org', 'Diamond Devices', 'Content Creator');
SELECT affiliatePerson('mart@kde.org', 'Diamond Devices', 'Validator');

INSERT INTO tags (partner, type, title) SELECT ct_testing_partnerId('KDE'), id, 'Approved by KDE' FROM tagtypes WHERE type = 'signoff';
INSERT INTO tags (partner, type, title) SELECT ct_testing_partnerId('KDE'), id, 'Card Game' FROM tagtypes WHERE type = 'category';
INSERT INTO tags (partner, type, title) SELECT ct_testing_partnerId('KDE'), id, 'Util' FROM tagtypes WHERE type = 'category';
INSERT INTO tags (partner, type, title) SELECT ct_testing_partnerId('KDE'), id, 'Misc' FROM tagtypes WHERE type = 'category';

INSERT INTO tags (type, title) SELECT id, 'application/x-plasma' FROM tagtypes WHERE type = 'mimetype';
INSERT INTO tags (type, title) SELECT id, 'Zack Rusin' FROM tagtypes WHERE type = 'author';
INSERT INTO tags (type, title) SELECT id, 'Coherent Theory' FROM tagtypes WHERE type = 'publisher';
INSERT INTO tags (type, title) SELECT id, '0123456789' FROM tagtypes WHERE type = 'isbn';
INSERT INTO tags (type, title) SELECT id, '2013' FROM tagtypes WHERE type = 'created';
INSERT INTO tags (type, title) SELECT id, 'http://makeplaylive.com' FROM tagtypes WHERE type = 'url';

INSERT INTO stores (id, partner, name) VALUES ('null', ct_testing_partnerId('Management Group'), 'No Store');
INSERT INTO stores (id, partner, name, description) VALUES ('VIVALDI-1', ct_testing_partnerId('Make Play Live'), 'Vivaldi', 'Plasma Active tablet from Make Play Live');
INSERT INTO stores (id, partner, name, description, markup) VALUES ('KDE-1', ct_testing_partnerId('KDE'), 'Plasma Workspace', 'KDE Plasma user interfaces', 15);
INSERT INTO stores (id, partner, name, description) VALUES ('KDE-2', ct_testing_partnerId('KDE'), 'KDE Applications', 'Variety of tools');
INSERT INTO stores (id, partner, name, description) VALUES ('DD-1', ct_testing_partnerId('Diamond Devices'), 'Bling Media Center', 'Imaginary hifi for your home');
INSERT INTO stores (id, partner, name, description) VALUES ('DD-2', ct_testing_partnerId('Diamond Devices'), 'Affordaphone', 'Finally a phone even you can afford');

INSERT INTO channels (image, store, active, name, description)
    VALUES ('games.png', 'KDE-1', true, 'Games', 'Fun and amusements');
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('game'));

INSERT INTO channels (image, store, active, name, description, parent)
    VALUES ('cardgames.png', 'KDE-1', true, 'Card Games', 'Bust out the deck of 52!', 2);
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('game'));
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('Card Game'));


INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Aquarium', 'Grow an aqarium full of fish!', '0.1', 'org.kde.aquarium.plasmoid', 'fish.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application'));
update assets set version = '0.2' WHERE id = currval('seq_assetsids');
update assetChangelogs set changes = 'Bug fixes' WHERE asset = currval('seq_assetsids') AND version = '0.1';

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Dice', 'Roll the dice', '0.1', 'org.kde.dice.plasmoid', 'dice.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Everyone 10+'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Diamond Juice', 'Best app from Diamond to date', '0.1', 'com.diamondevices.juice.plasmoid', 'juice.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), '15 Puzzle', 'The classic puzzle game', '0.1', 'org.kde.15puzzle.plasmoid', '15puzzle.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Tetris', 'Stacking blocks', '0.1', 'org.kde.tetris.plasmoid', 'tetris.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Jewels', 'Connect the jewels', '0.1', 'org.kde.jewels.plasmoid', 'jewels.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker1', 'Poker 1', '0.1', 'org.kde.poker1.plasmoid', 'poker1.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker2', 'Poker 2', '0.2', 'org.kde.poker1.plasmoid', 'poker2.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker3', 'Poker 3', '0.3', 'org.kde.poker1.plasmoid', 'poker3.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker4', 'Poker 4', '0.4', 'org.kde.poker1.plasmoid', 'poker4.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker5', 'Poker 5', '0.5', 'org.kde.poker1.plasmoid', 'poker5.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker6', 'Poker 6', '0.6', 'org.kde.poker1.plasmoid', 'poker6.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker7', 'Poker 7', '0.7', 'org.kde.poker1.plasmoid', 'poker7.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker8', 'Poker 8', '0.8', 'org.kde.poker1.plasmoid', 'poker8.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker9', 'Poker 9', '0.9', 'org.kde.poker1.plasmoid', 'poker9.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker10', 'Poker 10', '1.0', 'org.kde.poker1.plasmoid', 'poker1.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker11', 'Poker 11', '0.1', 'org.kde.poker1.plasmoid', 'poker1.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker12', 'Poker 12', '0.2', 'org.kde.poker1.plasmoid', 'poker2.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker13', 'Poker 13', '0.3', 'org.kde.poker1.plasmoid', 'poker3.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker14', 'Poker 14', '0.4', 'org.kde.poker1.plasmoid', 'poker4.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker15', 'Poker 15', '0.5', 'org.kde.poker1.plasmoid', 'poker5.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active)
    VALUES (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker16', 'Poker 16', '0.6', 'org.kde.poker1.plasmoid', 'poker6.png', true);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active, baseprice)
    VALUES (1, ct_testing_partnerId('KDE'), 'Poker17', 'Poker 17', '0.7', 'org.kde.poker1.plasmoid', 'poker7.png', true, 500);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active, baseprice)
    VALUES (1, ct_testing_partnerId('KDE'), 'Poker18', 'Poker 18', '0.8', 'org.kde.poker1.plasmoid', 'poker8.png', true, 1000);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Everyone'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

INSERT INTO assets (license, partner, name, description, version, file, image, active, baseprice)
    VALUES (1, ct_testing_partnerId('KDE'), 'Poker19', 'Poker 19', '0.9', 'org.kde.poker1.plasmoid', 'poker9.png', true, 20000);
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('game'));
INSERT INTO assetTags (asset, tag)
    VALUES (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));


INSERT INTO assetPreviews (asset, path, mimetype, type, subtype) VALUES (2, 'fishswimming.png',
       'image/png', 'screenshot', '1');
INSERT INTO assetPreviews (asset, path, mimetype, type, subtype) VALUES (2, 'fishmultiplying.png',
       'image/png', 'screenshot', '2');


INSERT INTO channels (image, store, active, name, description)
    VALUES ('plasmoa.png', 'VIVALDI-1', true, 'Card Games', 'Bust out the deck of 52!');
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('Card Game'));

INSERT INTO channels (image, store, active, name, description)
    VALUES ('utilities.png', 'DD-1', true, 'Utilities', 'Useful tools');
INSERT INTO channelTags (channel, tag)
    VALUES (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
INSERT INTO channelTags (channel, tag) VALUES (currval('seq_channelids'), ct_testing_tagByName('Util'));

INSERT INTO channels (image, store, active, name, description)
    VALUES ('misc.png', 'DD-1', true, 'Other', 'Miscellaneous tools and toys');

INSERT INTO channels (image, store, active, name, description)
    VALUES ('loser.png', 'DD-2', true, 'Diamond Device Magic', 'Best of the best from Diamond');


--FIXME: this needs some relevant book author info in there
SELECT ct_testing_favoriteBooksByAuthor('zack@kde.org', 'Kafka');
SELECT ct_testing_downloadBooksByAuthor('zack@kde.org', 'Kafka');
SELECT ct_testing_favoriteBooksByAuthor('zack@kde.org', 'Plato');
SELECT ct_testing_downloadBooksByAuthor('zack@kde.org', 'Plato');
SELECT ct_testing_favoriteBooksByAuthor('aseigo@kde.org', 'Kafka');
SELECT ct_testing_downloadBooksByAuthor('aseigo@kde.org', 'Kafka');
SELECT ct_testing_favoriteBooksByAuthor('aseigo@kde.org', 'Dickens, Charles');
SELECT ct_testing_downloadBooksByAuthor('aseigo@kde.org', 'Dickens, Charles');
SELECT ct_testing_favoriteBooksByAuthor('aseigo@kde.org', 'Tolstoy, Leo');
SELECT ct_testing_downloadBooksByAuthor('aseigo@kde.org', 'Tolstoy, Leo');


--purchases sample data for the statistics test
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('zack@kde.org'), 'zack@kde.org', ct_testing_assetByName('Dice'), 'VIVALDI-1', 'Dice', 500, 475, 20, '2013-05-26 00:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('aseigo@kde.org'), 'aseigo@kde.org', ct_testing_assetByName('Dice'), 'VIVALDI-1', 'Dice', 500, 475, 25, '2013-05-26 01:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('mart@kde.org'), 'mart@kde.org', ct_testing_assetByName('Dice'), 'VIVALDI-1', 'Dice', 500, 475, 25, '2013-05-26 02:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('zack@kde.org'), 'zack@kde.org', ct_testing_assetByName('Diamond Juice'), 'VIVALDI-1', 'Diamond Juice', 100, 90, 10, '2013-05-25 13:26:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('aseigo@kde.org'), 'aseigo@kde.org', ct_testing_assetByName('Diamond Juice'), 'VIVALDI-1', 'Diamond Juice', 100, 90, 10, '2013-05-25 09:35:24Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('aseigo@kde.org'), 'aseigo@kde.org', ct_testing_assetByName('Dice'), 'VIVALDI-1', 'Dice', 300, 280, 15, '2013-06-02 01:02:03Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('mart@kde.org'), 'mart@kde.org', ct_testing_assetByName('Dice'), 'VIVALDI-1', 'Dice', 300, 280, 15, '2013-07-02 01:02:03Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('mart@kde.org'), 'mart@kde.org', ct_testing_assetByName('Aquarium'), 'VIVALDI-1', 'aquarium', 200, 190, 5, '2013-06-10 09:10:11Z');

INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('zack@kde.org'), 'zack@kde.org', ct_testing_assetByName('15 Puzzle'), 'KDE-1', '15 Puzzle', 500, 475, 20, '2013-05-26 00:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('aseigo@kde.org'), 'aseigo@kde.org', ct_testing_assetByName('15 Puzzle'), 'KDE-1', '15 Puzzle', 500, 475, 25, '2013-05-26 01:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('mart@kde.org'), 'mart@kde.org', ct_testing_assetByName('15 Puzzle'), 'KDE-1', '15 Puzzle', 500, 475, 25, '2013-05-26 02:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('aseigo@kde.org'), 'aseigo@kde.org', ct_testing_assetByName('Diamond Juice'), 'KDE-1', 'Diamond Juice', 300, 280, 15, '2013-06-02 01:02:03Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (ct_testing_personByEmail('mart@kde.org'), 'mart@kde.org', ct_testing_assetByName('Poker3'), 'KDE-1', 'Poker 3', 200, 190, 5, '2013-06-10 09:10:11Z');



--downloads sample data for the statistics test
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('zack@kde.org'), '2013-05-26 00:00:00Z', 'VIVALDI-1', '45.46.47.48', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('aseigo@kde.org'), '2013-05-26 01:00:00Z', 'VIVALDI-1', '58.59.56.61', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('mart@kde.org'), '2013-05-26 02:00:00Z', 'VIVALDI-1', '67.68.69.70', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Diamond Juice'), ct_testing_personByEmail('zack@kde.org'), '2013-05-25 13:26:00Z', 'VIVALDI-1', '45.46.47.48', 'Diamond Juice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Diamond Juice'), ct_testing_personByEmail('aseigo@kde.org'), '2013-05-25 09:35:24Z', 'VIVALDI-1', '58.59.56.61', 'Diamond Juice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('aseigo@kde.org'), '2013-06-02 01:02:03Z', 'VIVALDI-1', '58.59.56.61', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('mart@kde.org'), '2013-07-02 01:02:03Z', 'VIVALDI-1', '67.68.69.70', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (2, 4, '2013-06-10 09:10:11Z', 'VIVALDI-1', '67.68.69.70', 'aquarium', 1);

INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('zack@kde.org'), '2013-05-26 02:00:00Z', 'VIVALDI-1', '45.46.47.48', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('aseigo@kde.org'), '2013-05-27 03:00:00Z', 'VIVALDI-1', '58.59.56.61', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('mart@kde.org'), '2013-05-29 12:00:00Z', 'VIVALDI-1', '67.68.69.70', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Diamond Juice'), ct_testing_personByEmail('aseigo@kde.org'), '2013-06-12 19:35:24Z', 'VIVALDI-1', '58.59.56.61', 'Diamond Juice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('aseigo@kde.org'), '2013-07-23 11:02:03Z', 'VIVALDI-1', '58.59.56.61', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Dice'), ct_testing_personByEmail('mart@kde.org'), '2013-09-30 22:02:03Z', 'VIVALDI-1', '67.68.69.70', 'Dice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (2, 4, '2013-10-01 23:10:11Z', 'VIVALDI-1', '67.68.69.70', 'aquarium', 1);

INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('15 Puzzle'), ct_testing_personByEmail('zack@kde.org'), '2013-05-26 02:00:00Z', 'KDE-1', '45.46.47.48', '15 Puzzle', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('15 Puzzle'), ct_testing_personByEmail('aseigo@kde.org'), '2013-05-27 03:00:00Z', 'KDE-1', '58.59.56.61', '15 Puzzle', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Poker3'), ct_testing_personByEmail('mart@kde.org'), '2013-05-29 12:00:00Z', 'KDE-1', '67.68.69.70', 'Poker 3', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Diamond Juice'), ct_testing_personByEmail('aseigo@kde.org'), '2013-06-12 19:35:24Z', 'KDE-1', '58.59.56.61', 'Diamond Juice', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Poker10'), ct_testing_personByEmail('aseigo@kde.org'), '2013-07-23 11:02:03Z', 'KDE-1', '58.59.56.61', 'Poker 10', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Poker10'), ct_testing_personByEmail('mart@kde.org'), '2013-09-30 22:02:03Z', 'KDE-1', '67.68.69.70', 'Poker 10', 1);
INSERT INTO downloads (asset, person, downloadedOn, store, address, title, version)
     VALUES (ct_testing_assetByName('Jewels'), ct_testing_personByEmail('mart@kde.org'), '2013-10-01 23:10:11Z', 'KDE-1', '67.68.69.70', 'Jewels', 1);

--ratings
INSERT INTO assetRatings (asset, attribute, person, rating)
    VALUES (ct_testing_assetByName('Poker1'), ct_testing_ratingAttributeByName('Graphics'), ct_testing_personByEmail('aseigo@kde.org'), 1);
INSERT INTO assetRatings (asset, attribute, person, rating)
    VALUES (ct_testing_assetByName('Poker2'), ct_testing_ratingAttributeByName('Playability'), ct_testing_personByEmail('aseigo@kde.org'), 2);

INSERT INTO assetRatings (asset, attribute, person, rating)
    VALUES (ct_testing_assetByName('Poker1'), ct_testing_ratingAttributeByName('Graphics'), ct_testing_personByEmail('zack@kde.org'), 5);
INSERT INTO assetRatings (asset, attribute, person, rating)
    VALUES (ct_testing_assetByName('Aquarium'), ct_testing_ratingAttributeByName('Usability'), ct_testing_personByEmail('zack@kde.org'), 1);
INSERT INTO assetRatings (asset, attribute, person, rating)
    VALUES (ct_testing_assetByName('Poker2'), ct_testing_ratingAttributeByName('Enjoyability'), ct_testing_personByEmail('zack@kde.org'), 3);

UPDATE warehouses SET minMarkup = 15;

INSERT INTO easterEggs (phrase, store, egg) VALUES ('test', 'VIVALDI-1', 'correct');

-- now pretend all maintenance is up to date
select ct_frequentMaintenance();
select ct_hourlyMaintenance();
select ct_dailyMaintenance();

-- cleanup
DROP FUNCTION ct_testing_favoriteBooksByAuthor(email text, author text);
DROP FUNCTION ct_testing_downloadBooksByAuthor(email text, author text);
DROP FUNCTION ct_testing_tagByName(text);
DROP FUNCTION ct_testing_licenseByName(text);
DROP FUNCTION ct_testing_assetByName(text);
DROP FUNCTION ct_testing_personByEmail(text);
DROP FUNCTION ct_testing_partnerId(text);
DROP FUNCTION ct_testing_removePriorTestingTags();
DROP FUNCTION ct_testing_ratingAttributeByName(text);
commit;

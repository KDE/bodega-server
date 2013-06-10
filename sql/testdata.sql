--begin;
delete from pointtransactions;
delete from people;
delete from purchases;
delete from downloads;
delete from channels;
delete from stores;
delete from assets;
delete from partners;
delete from affiliations;
delete from languages;

select setval('seq_assetsids', 1);
select setval('seq_languageids', 1);
select setval('seq_peopleids', 1);
select setval('seq_partnerids', 1);
select setval('seq_channelids', 1);
select setval('seq_purchaseids', 1);

insert into people (lastname, firstname, email, points, password, active)
    values ('Rusin', 'Zack', 'zack@kde.org', 10000, '$2a$10$Iejk3uw6uGFCGR5OKaOOZO2tmnlIhPCsCvw7G1pLa81QH4fonDC.C', true);

insert into people (lastname, firstname, email, points, password, active)
    values ('Seigo', 'Aaron', 'aseigo@kde.org', 10000, '$2a$10$h6oIz3q1suZ5ncy7HS7UcutdJtwI7WBQ9Nd7cpd5b8hPcFbaXlzGq', true);

insert into people (lastname, firstname, email, points, password, active)
    values ('Martin', 'Marco', 'mart@kde.org', 10000, '$2a$10$VYBi6invWdeT..wQ5FFXqu67HQI5Y8WVAhN5orzUIsWAeMaAItYrS', true);

insert into partners (id, name, developer, distributor) values (0, 'Management', true, true);
insert into partners (id, name, developer, distributor, homepage, supportEmail) values (1, 'Make Play Live', true, true, 'http://makeplaylive.com', 'support@makeplaylive.com');
insert into partners (id, name, developer, distributor) values (2, 'KDE', false, true);
insert into partners (id, name, developer, distributor) values (3, 'Diamond Devices', false, true);
insert into partners (id, name, developer, distributor) values (4, 'Saphire Software', false, true);

select affiliatePerson('zack@kde.org', 'KDE', 'Content Creator');
select affiliatePerson('zack@kde.org', 'KDE', 'Store Manager');
select affiliatePerson('zack@kde.org', 'KDE', 'Validator');
select affiliatePerson('aseigo@kde.org', 'KDE', 'Content Creator');
select affiliatePerson('mart@kde.org', 'Diamond Devices', 'Content Creator');
select affiliatePerson('mart@kde.org', 'Diamond Devices', 'Validator');


insert into stores (id, partner, name) values ('null', 0, 'No Store');
insert into stores (id, partner, name, description) values ('VIVALDI-1', 1, 'Vivaldi', 'Plasma Active tablet from Make Play Live');
insert into stores (id, partner, name, description) values ('KDE-1', 2, 'Plasma Workspace', 'KDE Plasma user interfaces');
insert into stores (id, partner, name, description) values ('KDE-2', 2, 'KDE Applications', 'Variety of tools');
insert into stores (id, partner, name, description) values ('DD-1', 3, 'Bling Media Center', 'Imaginary hifi for your home');
insert into stores (id, partner, name, description) values ('DD-2', 3, 'Affordaphone', 'Finally a phone even you can afford');

insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Aquarium', 'Grow an aqarium full of fish!', '0.1', 'org.kde.aquarium.plasmoid', 'fish.png', true, 'aquarium');
insert into channels (image, store, active, name, description)
    values ('games.png', 'KDE-1', true, 'Games', 'Fun and amusements');
insert into channels (image, store, active, name, description, parent)
    values ('cardgames.png', 'KDE-1', true, 'Card Games', 'Bust out the deck of 52!', 2);
insert into channels (image, store, active, name, description)
    values ('plasmoa.png', 'VIVALDI-1', true, 'Card Games', 'Bust out the deck of 52!');
insert into channels (image, store, active, name, description)
    values ('utilities.png', 'DD-1', true, 'Utilities', 'Useful tools');
insert into channels (image, store, active, name, description)
    values ('misc.png', 'DD-1', true, 'Other', 'Miscellaneous tools and toys');
insert into channels (image, store, active, name, description)
    values ('loser.png', 'DD-2', true, 'Diamond Device Magic', 'Best of the best from Diamond');


insert into tags (partner, type, title) values (2, 2, 'Approved by KDE');
insert into tags (partner, type, title) values (2, 3, 'Game');
insert into tags (partner, type, title) values (2, 3, 'Card Game');
insert into tags (partner, type, title) values (2, 3, 'Util');
insert into tags (partner, type, title) values (2, 3, 'Misc');

insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Dice', 'Roll the dice', '0.1', 'org.kde.dice.plasmoid', 'dice.png', true, 'dice');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Diamond Juice', 'Best app from Diamond to date', '0.1', 'com.diamondevices.juice.plasmoid', 'juice.png', true, 'juice');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, '15 Puzzle', 'The classic puzzle game', '0.1', 'org.kde.15puzzle.plasmoid', '15puzzle.png', true, 'fifteenpuzzle');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Tetris', 'Stacking blocks', '0.1', 'org.kde.tetris.plasmoid', 'tetris.png', true, 'jstetris');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Jewels', 'Connect the jewels', '0.1', 'org.kde.jewels.plasmoid', 'jewels.png', true, 'jewels');

insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker1', 'Poker 1', '0.1', 'org.kde.poker1.plasmoid', 'poker1.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker2', 'Poker 2', '0.2', 'org.kde.poker1.plasmoid', 'poker2.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker3', 'Poker 3', '0.3', 'org.kde.poker1.plasmoid', 'poker3.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker4', 'Poker 4', '0.4', 'org.kde.poker1.plasmoid', 'poker4.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker5', 'Poker 5', '0.5', 'org.kde.poker1.plasmoid', 'poker5.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker6', 'Poker 6', '0.6', 'org.kde.poker1.plasmoid', 'poker6.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker7', 'Poker 7', '0.7', 'org.kde.poker1.plasmoid', 'poker7.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker8', 'Poker 8', '0.8', 'org.kde.poker1.plasmoid', 'poker8.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker9', 'Poker 9', '0.9', 'org.kde.poker1.plasmoid', 'poker9.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker10', 'Poker 10', '1.0', 'org.kde.poker1.plasmoid', 'poker1.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker11', 'Poker 11', '0.1', 'org.kde.poker1.plasmoid', 'poker1.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker12', 'Poker 12', '0.2', 'org.kde.poker1.plasmoid', 'poker2.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker13', 'Poker 13', '0.3', 'org.kde.poker1.plasmoid', 'poker3.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker14', 'Poker 14', '0.4', 'org.kde.poker1.plasmoid', 'poker4.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker15', 'Poker 15', '0.5', 'org.kde.poker1.plasmoid', 'poker5.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Poker16', 'Poker 16', '0.6', 'org.kde.poker1.plasmoid', 'poker6.png', true, 'poker1');
insert into assets (license, partner, name, description, version, path, image, active, externid, baseprice) values (1, 2, 'Poker17', 'Poker 17', '0.7', 'org.kde.poker1.plasmoid', 'poker7.png', true, 'poker1', 500);
insert into assets (license, partner, name, description, version, path, image, active, externid, baseprice) values (1, 2, 'Poker18', 'Poker 18', '0.8', 'org.kde.poker1.plasmoid', 'poker8.png', true, 'poker1', 1000);
insert into assets (license, partner, name, description, version, path, image, active, externid, baseprice) values (1, 2, 'Poker19', 'Poker 19', '0.9', 'org.kde.poker1.plasmoid', 'poker9.png', true, 'poker1', 20000);

insert into assetPreviews (asset, path, mimetype, type, subtype) values (2, 'fishswimming.png',
       'image/png', 'screenshot', '1');
insert into assetPreviews (asset, path, mimetype, type, subtype) values (2, 'fishmultiplying.png',
       'image/png', 'screenshot', '2');

update assets set version = '0.2' where id = 2;
update assetChangelogs set changes = 'Bug fixes' where asset = 1 and version = '0.1';

insert into assetTags (asset, tag) values (2, 1);
insert into assetTags (asset, tag) values (2, 2);
insert into assetTags (asset, tag) values (3, 1);
insert into assetTags (asset, tag) values (3, 4);
insert into assetTags (asset, tag) values (4, 1);
insert into assetTags (asset, tag) values (4, 2);
insert into assetTags (asset, tag) values (5, 1);
insert into assetTags (asset, tag) values (5, 2);
insert into assetTags (asset, tag) values (6, 1);
insert into assetTags (asset, tag) values (6, 2);
insert into assetTags (asset, tag) values (6, 3);
insert into assetTags (asset, tag) values (7, 1);
insert into assetTags (asset, tag) values (7, 2);
insert into assetTags (asset, tag) values (7, 3);
insert into assetTags (asset, tag) values (8, 1);
insert into assetTags (asset, tag) values (8, 2);
insert into assetTags (asset, tag) values (8, 3);
insert into assetTags (asset, tag) values (9, 1);
insert into assetTags (asset, tag) values (9, 2);
insert into assetTags (asset, tag) values (9, 3);
insert into assetTags (asset, tag) values (10, 1);
insert into assetTags (asset, tag) values (10, 2);
insert into assetTags (asset, tag) values (10, 3);
insert into assetTags (asset, tag) values (11, 1);
insert into assetTags (asset, tag) values (11, 2);
insert into assetTags (asset, tag) values (11, 3);
insert into assetTags (asset, tag) values (12, 1);
insert into assetTags (asset, tag) values (12, 2);
insert into assetTags (asset, tag) values (12, 3);
insert into assetTags (asset, tag) values (13, 1);
insert into assetTags (asset, tag) values (13, 2);
insert into assetTags (asset, tag) values (13, 3);
insert into assetTags (asset, tag) values (14, 1);
insert into assetTags (asset, tag) values (14, 2);
insert into assetTags (asset, tag) values (14, 3);
insert into assetTags (asset, tag) values (15, 1);
insert into assetTags (asset, tag) values (15, 2);
insert into assetTags (asset, tag) values (15, 3);
insert into assetTags (asset, tag) values (16, 1);
insert into assetTags (asset, tag) values (16, 2);
insert into assetTags (asset, tag) values (16, 3);
insert into assetTags (asset, tag) values (17, 1);
insert into assetTags (asset, tag) values (17, 2);
insert into assetTags (asset, tag) values (17, 3);
insert into assetTags (asset, tag) values (18, 1);
insert into assetTags (asset, tag) values (18, 2);
insert into assetTags (asset, tag) values (18, 3);
insert into assetTags (asset, tag) values (19, 1);
insert into assetTags (asset, tag) values (19, 2);
insert into assetTags (asset, tag) values (19, 3);
insert into assetTags (asset, tag) values (20, 1);
insert into assetTags (asset, tag) values (20, 2);
insert into assetTags (asset, tag) values (20, 3);
insert into assetTags (asset, tag) values (21, 1);
insert into assetTags (asset, tag) values (21, 2);
insert into assetTags (asset, tag) values (21, 3);
insert into assetTags (asset, tag) values (22, 1);
insert into assetTags (asset, tag) values (22, 2);
insert into assetTags (asset, tag) values (22, 3);
insert into assetTags (asset, tag) values (23, 1);
insert into assetTags (asset, tag) values (23, 2);
insert into assetTags (asset, tag) values (23, 3);
insert into assetTags (asset, tag) values (24, 1);
insert into assetTags (asset, tag) values (24, 2);
insert into assetTags (asset, tag) values (24, 3);
insert into assetTags (asset, tag) values (25, 1);
insert into assetTags (asset, tag) values (25, 2);
insert into assetTags (asset, tag) values (25, 3);
insert into assetTags (asset, tag) values (26, 1);
insert into assetTags (asset, tag) values (26, 2);
insert into assetTags (asset, tag) values (26, 3);

insert into channelTags (channel, tag) values (2, 1);
insert into channelTags (channel, tag) values (2, 2);
insert into channelTags (channel, tag) values (3, 1);
insert into channelTags (channel, tag) values (3, 3);
insert into channelTags (channel, tag) values (4, 1);
insert into channelTags (channel, tag) values (4, 5);
insert into channelTags (channel, tag) values (5, 1);
insert into channelTags (channel, tag) values (5, 3);

CREATE OR REPLACE FUNCTION favoriteBooksByAuthor(email text, author text) RETURNS void
AS
$$
DECLARE
    personId    int;
    authorTagId int;
    favoriteCollectionId int;
    foundAsset  RECORD;
    foundTag    RECORD;
BEGIN
    select id into authorTagId from tagTypes where type='author';
    select id into personId from people where people.email=$1;
    select id into favoriteCollectionId from collections where person=personId and name='favorites';
    IF NOT FOUND THEN
       insert into collections (person, name, public, wishlist)
                        VALUES (personId, 'favorites', false, false);
       select id into favoriteCollectionId from collections where person=personId and name='favorites';
    END IF;

    FOR foundTag IN SELECT tags.id, tags.title
            FROM tags WHERE tags.type=authorTagId AND tags.en_index @@ plainto_tsquery('english', $2)
    LOOP
        -- RAISE NOTICE 'tag is %', foundTag;
        FOR foundAsset IN SELECT atags.asset
                          from assetTags atags WHERE atags.tag=foundTag.id
        LOOP
            INSERT INTO collectionscontent (collection, asset)
                                    VALUES (favoriteCollectionId, foundAsset.asset);
        END LOOP;
    END LOOP;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION downloadBooksByAuthor(email text, author text) RETURNS void
AS
$$
DECLARE
    personId    int;
    authorTagId int;
    favoriteCollectionId int;
    foundAsset  RECORD;
    foundTag    RECORD;
BEGIN
    select id into authorTagId from tagTypes where type='author';
    select id into personId from people where people.email=$1;

    FOR foundTag IN SELECT tags.id, tags.title
            FROM tags WHERE tags.type=authorTagId AND tags.en_index @@ plainto_tsquery('english', $2)
    LOOP
        -- RAISE NOTICE 'tag is %', foundTag;
        FOR foundAsset IN SELECT atags.asset
            from assetTags atags WHERE atags.tag=foundTag.id
        LOOP
            INSERT INTO downloads (asset, person, address)
                           VALUES (foundAsset.asset, personId, '68.63.112.46');
        END LOOP;
    END LOOP;
END;
$$
LANGUAGE plpgsql;


select favoriteBooksByAuthor('zack@kde.org', 'Kafka');
select downloadBooksByAuthor('zack@kde.org', 'Kafka');
select favoriteBooksByAuthor('zack@kde.org', 'Plato');
select downloadBooksByAuthor('zack@kde.org', 'Plato');
select favoriteBooksByAuthor('aseigo@kde.org', 'Kafka');
select downloadBooksByAuthor('aseigo@kde.org', 'Kafka');
select favoriteBooksByAuthor('aseigo@kde.org', 'Dickens, Charles');
select downloadBooksByAuthor('aseigo@kde.org', 'Dickens, Charles');
select favoriteBooksByAuthor('aseigo@kde.org', 'Tolstoy, Leo');
select downloadBooksByAuthor('aseigo@kde.org', 'Tolstoy, Leo');


--purchases sample data for the statistics test
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (2, 'zack@kde.org', 3, 'VIVALDI-1', 'dice', 500, 475, 20, '2013-05-26 00:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (3, 'aseigo@kde.org', 3, 'VIVALDI-1', 'dice', 500, 475, 25, '2013-05-26 01:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (4, 'mart@kde.org', 3, 'VIVALDI-1', 'dice', 500, 475, 25, '2013-05-26 02:00:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (2, 'zack@kde.org', 4, 'VIVALDI-1', 'diamond', 100, 90, 10, '2013-05-25 13:26:00Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (3, 'aseigo@kde.org', 4, 'VIVALDI-1', 'diamond', 100, 90, 10, '2013-05-25 09:35:24Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (3, 'aseigo@kde.rog', 3, 'VIVALDI-1', 'dice', 300, 280, 15, '2013-06-02 01:02:03Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (4, 'mart@kde.org', 3, 'VIVALDI-1', 'dice', 300, 280, 15, '2013-07-02 01:02:03Z');
INSERT INTO purchases (person, email, asset, store, name, points, toparticipant, tostore, purchasedon) VALUES (4, 'mart@kde.org', 2, 'VIVALDI-1', 'aquarium', 200, 190, 5, '2013-06-10 09:10:11Z');


--downloads sample data for the statistics test
INSERT INTO downloads VALUES (3, 2, '2013-05-26 00:00:00Z', 'VIVALDI-1', '45.46.47.48', 'dice', 1);
INSERT INTO downloads VALUES (3, 3, '2013-05-26 01:00:00Z', 'VIVALDI-1', '58.59.56.61', 'dice', 1);
INSERT INTO downloads VALUES (3, 4, '2013-05-26 02:00:00Z', 'VIVALDI-1', '67.68.69.70', 'dice', 1);
INSERT INTO downloads VALUES (4, 2, '2013-05-25 13:26:00Z', 'VIVALDI-1', '45.46.47.48', 'diamond', 1);
INSERT INTO downloads VALUES (4, 3, '2013-05-25 09:35:24Z', 'VIVALDI-1', '58.59.56.61', 'diamond', 1);
INSERT INTO downloads VALUES (3, 3, '2013-06-02 01:02:03Z', 'VIVALDI-1', '58.59.56.61', 'dice', 1);
INSERT INTO downloads VALUES (3, 4, '2013-07-02 01:02:03Z', 'VIVALDI-1', '67.68.69.70', 'dice', 1);
INSERT INTO downloads VALUES (2, 4, '2013-06-10 09:10:11Z', 'VIVALDI-1', '67.68.69.70', 'aquarium', 1);

INSERT INTO downloads VALUES (3, 2, '2013-05-26 02:00:00Z', 'VIVALDI-1', '45.46.47.48', 'dice', 1);
INSERT INTO downloads VALUES (3, 3, '2013-05-27 03:00:00Z', 'VIVALDI-1', '58.59.56.61', 'dice', 1);
INSERT INTO downloads VALUES (3, 4, '2013-05-29 12:00:00Z', 'VIVALDI-1', '67.68.69.70', 'dice', 1);
INSERT INTO downloads VALUES (4, 3, '2013-06-12 19:35:24Z', 'VIVALDI-1', '58.59.56.61', 'diamond', 1);
INSERT INTO downloads VALUES (3, 3, '2013-07-23 11:02:03Z', 'VIVALDI-1', '58.59.56.61', 'dice', 1);
INSERT INTO downloads VALUES (3, 4, '2013-09-30 22:02:03Z', 'VIVALDI-1', '67.68.69.70', 'dice', 1);
INSERT INTO downloads VALUES (2, 4, '2013-10-01 23:10:11Z', 'VIVALDI-1', '67.68.69.70', 'aquarium', 1);
--end;

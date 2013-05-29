--begin;
delete from people;
delete from channels;
delete from assets;
delete from stores;
delete from partners;
delete from affiliations;
delete from languages;

select setval('seq_assetsids', 1);
select setval('seq_languageids', 1);
select setval('seq_peopleids', 1);
select setval('seq_personroleids', 1);
select setval('seq_partnerids', 1);
select setval('seq_channelids', 1);

insert into people (lastname, firstname, email, points, password, active)
    values ('Rusin', 'Zack', 'zack@kde.org', 10000, '$2a$10$Iejk3uw6uGFCGR5OKaOOZO2tmnlIhPCsCvw7G1pLa81QH4fonDC.C', true);

insert into people (lastname, firstname, email, points, password, active)
    values ('Seigo', 'Aaron', 'aseigo@kde.org', 10000, '$2a$10$h6oIz3q1suZ5ncy7HS7UcutdJtwI7WBQ9Nd7cpd5b8hPcFbaXlzGq', true);

insert into people (lastname, firstname, email, points, password, active)
    values ('Martin', 'Marco', 'mart@kde.org', 10000, '$2a$10$VYBi6invWdeT..wQ5FFXqu67HQI5Y8WVAhN5orzUIsWAeMaAItYrS', true);

insert into partners (id, name, developer, distributor) values (2, 'KDE', false, true);
insert into partners (id, name, developer, distributor) values (3, 'Diamond Devices', false, true);
insert into partners (id, name, developer, distributor) values (4, 'Saphire Software', false, true);

select affiliatePerson('zack@kde.org', 'KDE', 'Content Creator');
select affiliatePerson('zack@kde.org', 'KDE', 'Validator');
select affiliatePerson('aseigo@kde.org', 'KDE', 'Content Creator');
select affiliatePerson('mart@kde.org', 'Diamond Devices', 'Content Creator');
select affiliatePerson('mart@kde.org', 'Diamond Devices', 'Validator');


insert into channels (image, partner, active, name, description)
    values ('games.png', 2, true, 'Games', 'Fun and amusements');
insert into channels (image, partner, active, name, description)
    values ('utilities.png', 2, true, 'Utilities', 'Useful tools');
insert into channels (image, partner, active, name, description)
    values ('misc.png', 2, true, 'Other', 'Miscellaneous tools and toys');
insert into channels (image, partner, active, parent, name, description)
    values ('cardgames.png', 2, true, 2, 'Card Games', 'Bust out the deck of 52!');
insert into channels (image, partner, active, name, description)
    values ('loser.png', 3, true, 'Diamond Device Magic', 'Best of the best from Diamond');


insert into tags (partner, type, title) values (2, 2, 'Approved by KDE');
insert into tags (partner, type, title) values (2, 3, 'Game');
insert into tags (partner, type, title) values (2, 3, 'Card Game');
insert into tags (partner, type, title) values (2, 3, 'Util');
insert into tags (partner, type, title) values (2, 3, 'Misc');

insert into stores (partner, name, description, partnumber) values (2, 'MPL', 'Usage of PA', 'VIVALDI-1');
insert into stores (partner, name, description, partnumber) values (2, 'Plasma Workspace', 'KDE Plasma user interfaces', 'KDE-1');
insert into stores (partner, name, description, partnumber) values (3, 'Bling Media Center', 'Imaginary hifi for your home', 'DD-1');
insert into stores (partner, name, description, partnumber) values (3, 'Affordaphone', 'Finally a phone even you can afford', 'DD-2');

insert into storeChannels (store, channel) values ('VIVALDI-1', 2);
insert into storeChannels (store, channel) values ('VIVALDI-1', 5);
insert into storeChannels (store, channel) values ('KDE-1', 2);
insert into storeChannels (store, channel) values ('DD-1', 3);
insert into storeChannels (store, channel) values ('DD-1', 4);
insert into storeChannels (store, channel) values ('DD-1', 5);
insert into storeChannels (store, channel) values ('DD-2', 6);
insert into storeChannels (store, channel) values ('DD-2', 6);
insert into storeChannels (store, channel) values ('DD-2', 6);

insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Aquarium', 'Grow an aqarium full of fish!', '0.1', 'org.kde.aquarium.plasmoid', 'fish.png', true, 'aquarium');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Dice', 'Roll the dice', '0.1', 'org.kde.dice.plasmoid', 'dice.png', true, 'dice');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Diamond Juice', 'Best app from Diamond to date', '0.1', 'com.diamondevices.juice.plasmoid', 'juice.png', true, 'juice');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, '15 Puzzle', 'The classic puzzle game', '0.1', 'org.kde.15puzzle.plasmoid', '15puzzle.png', true, 'fifteenpuzzle');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Tetris', 'Stacking blocks', '0.1', 'org.kde.tetris.plasmoid', 'tetris.png', true, 'jstetris');
insert into assets (license, partner, name, description, version, path, image, active, externid) values (1, 2, 'Jewels', 'Connect the jewels', '0.1', 'org.kde.jewels.plasmoid', 'jewels.png', true, 'jewels');

insert into assetPreviews (asset, path) values (2, 'fishswimming.png');
insert into assetPreviews (asset, path) values (2, 'fishmultiplying.png');

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
       insert into collections (person, name, public, wishlist) VALUES
       	      (personId, 'favorites', false, false);
       select id into favoriteCollectionId from collections where person=personId and name='favorites';
    END IF;

    FOR foundTag IN SELECT tags.id, tags.title
            FROM tags WHERE tags.type=authorTagId AND tags.en_index @@ plainto_tsquery('english', $2)
    LOOP
--	RAISE NOTICE 'tag is %', foundTag;
	FOR foundAsset IN SELECT atags.asset
	    from assetTags atags WHERE atags.tag=foundTag.id
	LOOP
	    INSERT INTO collectionscontent (collection, asset) VALUES (favoriteCollectionId, foundAsset.asset);
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
--	RAISE NOTICE 'tag is %', foundTag;
	FOR foundAsset IN SELECT atags.asset
	    from assetTags atags WHERE atags.tag=foundTag.id
	LOOP
	    INSERT INTO downloads (asset, person, address) VALUES (foundAsset.asset, personId, '68.63.112.46');
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
INSERT INTO purchases VALUES (1, 2, 'zack@kde.org', 3, 'VIVALDI-1', 'dice', 500, 475, 20, '2013-05-26 00:00:00');
INSERT INTO purchases VALUES (2, 3, 'aseigo@kde.org', 3, 'VIVALDI-1', 'dice', 500, 475, 25, '2013-05-26 01:00:00');
INSERT INTO purchases VALUES (3, 4, 'mart@kde.org', 3, 'VIVALDI-1', 'dice', 500, 475, 25, '2013-05-26 02:00:00');
INSERT INTO purchases VALUES (4, 2, 'zack@kde.org', 4, 'VIVALDI-1', 'diamond', 100, 90, 10, '2013-05-25 13:26:00');
INSERT INTO purchases VALUES (5, 3, 'aseigo@kde.org', 4, 'VIVALDI-1', 'diamond', 100, 90, 10, '2013-05-25 09:35:24');
INSERT INTO purchases VALUES (6, 3, 'aseigo@kde.rog', 3, 'VIVALDI-1', 'dice', 300, 280, 15, '2013-06-02 01:02:03');
INSERT INTO purchases VALUES (7, 4, 'mart@kde.org', 3, 'VIVALDI-1', 'dice', 300, 280, 15, '2013-07-02 01:02:03');
INSERT INTO purchases VALUES (8, 4, 'mart@kde.org', 2, 'VIVALDI-1', 'aquarium', 200, 190, 5, '2013-06-10 09:10:11');
--end;

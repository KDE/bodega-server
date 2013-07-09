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
    select id into authorTagId from tagTypes where type = 'author';
    select id into personId from people where people.email = $1;
    select id into favoriteCollectionId from collections where person=personId and name = 'Authors' and type = 'favorites';
    IF NOT FOUND THEN
       insert into collections (person, name, public, type)
                        VALUES (personId, 'Authors', false, 'favorites');
       select id into favoriteCollectionId from collections where person=personId and name = 'Authors' and type = 'favorites';
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

CREATE OR REPLACE FUNCTION ct_testing_tagByName(text) RETURNS INT AS $$
DECLARE
    tagId int := -1;
BEGIN
    select into tagId id from tags where title = $1 limit 1;
    return tagId;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_testing_licenseByName(text) RETURNS INT AS $$
DECLARE
    licenseId int := -1;
BEGIN
    select into licenseId id from licenses where name = $1 limit 1;
    return licenseId;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_testing_assetByName(text) RETURNS INT AS $$
DECLARE
    assetId int := -1;
BEGIN
    select into assetId id from assets where name = $1 limit 1;
    return assetId;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION ct_testing_personByEmail(text) RETURNS INT AS $$
DECLARE
    personId int := -1;
BEGIN
    select into personId id from people where email = $1 limit 1;
    return personId;
END;
$$ LANGUAGE 'plpgsql';

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
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE function ct_testing_getRidOfPriorTestingTags() RETURNS VOID
AS
$$
DECLARE
    tagId int;
BEGIN
    SELECT INTO tagId ct_testing_tagByName('Zack Rusin');
    IF tagId > -1 THEN
        DELETE FROM tags WHERE id >= tagId;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- reset the database
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
delete from assetprices where ending is not null;
select ct_testing_getRidOfPriorTestingTags();

select setval('seq_assetsids', 1);
select setval('seq_languageids', 1);
select setval('seq_peopleids', 1);
select setval('seq_partnerids', 1005);
select setval('seq_channelids', 1);
select setval('seq_purchaseids', 1);
select setval('seq_tagids', 20);


-- now start setting up the data
insert into people (lastname, firstname, email, points, password, active)
    values ('Rusin', 'Zack', 'zack@kde.org', 10000, '$2a$10$Iejk3uw6uGFCGR5OKaOOZO2tmnlIhPCsCvw7G1pLa81QH4fonDC.C', true);

insert into people (lastname, firstname, email, points, password, active)
    values ('Seigo', 'Aaron', 'aseigo@kde.org', 10000, '$2a$10$h6oIz3q1suZ5ncy7HS7UcutdJtwI7WBQ9Nd7cpd5b8hPcFbaXlzGq', true);

insert into people (lastname, firstname, email, points, password, active)
    values ('Martin', 'Marco', 'mart@kde.org', 10000, '$2a$10$VYBi6invWdeT..wQ5FFXqu67HQI5Y8WVAhN5orzUIsWAeMaAItYrS', true);

insert into partners (id, name, publisher, distributor) values (0, 'Management', true, true);
insert into partners (id, name, publisher, distributor, supportEmail) values (1000, 'Make Play Live', true, true, 'support@makeplaylive.com');
insert into partnerContacts (partner, service, account, url) values (1000, 'website', null, 'http://makeplaylive.com');
insert into partnerContacts (partner, service, account, url) values (1000, 'identi.ca', 'aseigo', null);
insert into partnerContacts (partner, service, account, url) values (1000, 'blog', '', 'http://aseigo.blogspot.com');
insert into partners (id, name, publisher, distributor, supportEmail) values (1002, 'KDE', false, true, 'info@kde.org');
insert into partnerContacts (partner, service, account, url) values (1002, 'blog', null, 'http://planet.kde.org');
insert into partnerContacts (partner, service, account, url) values (1002, 'website', null, 'http://kde.org');
insert into partners (id, name, publisher, distributor) values (1003, 'Diamond Devices', false, true);
insert into partners (id, name, publisher, distributor) values (1004, 'Saphire Software', false, true);

select affiliatePerson('zack@kde.org', 'KDE', 'Content Creator');
select affiliatePerson('zack@kde.org', 'KDE', 'Store Manager');
select affiliatePerson('zack@kde.org', 'KDE', 'Validator');
select affiliatePerson('aseigo@kde.org', 'KDE', 'Content Creator');
select affiliatePerson('aseigo@kde.org', 'KDE', 'Partner Manager');
select affiliatePerson('mart@kde.org', 'Diamond Devices', 'Content Creator');
select affiliatePerson('mart@kde.org', 'Diamond Devices', 'Validator');

insert into tags (partner, type, title) values (ct_testing_partnerId('KDE'), 2, 'Approved by KDE');
insert into tags (partner, type, title) values (ct_testing_partnerId('KDE'), 3, 'Card Game');
insert into tags (partner, type, title) values (ct_testing_partnerId('KDE'), 3, 'Util');
insert into tags (partner, type, title) values (ct_testing_partnerId('KDE'), 3, 'Misc');

INSERT INTO tags (type, title) SELECT id, 'Zack Rusin' FROM tagtypes WHERE type = 'author';
INSERT INTO tags (type, title) SELECT id, 'Coherent Theory' FROM tagtypes WHERE type = 'publisher';
INSERT INTO tags (type, title) SELECT id, '0123456789' FROM tagtypes WHERE type = 'isbn';
INSERT INTO tags (type, title) SELECT id, '2013' FROM tagtypes WHERE type = 'created';
INSERT INTO tags (type, title) SELECT id, 'http://makeplaylive.com' FROM tagtypes WHERE type = 'url';

insert into stores (id, partner, name) values ('null', ct_testing_partnerId('Management'), 'No Store');
insert into stores (id, partner, name, description) values ('VIVALDI-1', ct_testing_partnerId('Make Play Live'), 'Vivaldi', 'Plasma Active tablet from Make Play Live');
insert into stores (id, partner, name, description) values ('KDE-1', ct_testing_partnerId('KDE'), 'Plasma Workspace', 'KDE Plasma user interfaces');
insert into stores (id, partner, name, description) values ('KDE-2', ct_testing_partnerId('KDE'), 'KDE Applications', 'Variety of tools');
insert into stores (id, partner, name, description) values ('DD-1', ct_testing_partnerId('Diamond Devices'), 'Bling Media Center', 'Imaginary hifi for your home');
insert into stores (id, partner, name, description) values ('DD-2', ct_testing_partnerId('Diamond Devices'), 'Affordaphone', 'Finally a phone even you can afford');

insert into channels (image, store, active, name, description)
    values ('games.png', 'KDE-1', true, 'Games', 'Fun and amusements');
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('game'));

insert into channels (image, store, active, name, description, parent)
    values ('cardgames.png', 'KDE-1', true, 'Card Games', 'Bust out the deck of 52!', 2);
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('game'));
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('Card Game'));


insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Aquarium', 'Grow an aqarium full of fish!', '0.1', 'org.kde.aquarium.plasmoid', 'fish.png', true);
insert into assetTags (asset, tag) 
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag) 
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
update assets set version = '0.2' where id = currval('seq_assetsids');
update assetChangelogs set changes = 'Bug fixes' where asset = currval('seq_assetsids') and version = '0.1';

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Dice', 'Roll the dice', '0.1', 'org.kde.dice.plasmoid', 'dice.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Everyone 10+'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Diamond Juice', 'Best app from Diamond to date', '0.1', 'com.diamondevices.juice.plasmoid', 'juice.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), '15 Puzzle', 'The classic puzzle game', '0.1', 'org.kde.15puzzle.plasmoid', '15puzzle.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Tetris', 'Stacking blocks', '0.1', 'org.kde.tetris.plasmoid', 'tetris.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Jewels', 'Connect the jewels', '0.1', 'org.kde.jewels.plasmoid', 'jewels.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker1', 'Poker 1', '0.1', 'org.kde.poker1.plasmoid', 'poker1.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker2', 'Poker 2', '0.2', 'org.kde.poker1.plasmoid', 'poker2.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker3', 'Poker 3', '0.3', 'org.kde.poker1.plasmoid', 'poker3.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker4', 'Poker 4', '0.4', 'org.kde.poker1.plasmoid', 'poker4.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker5', 'Poker 5', '0.5', 'org.kde.poker1.plasmoid', 'poker5.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker6', 'Poker 6', '0.6', 'org.kde.poker1.plasmoid', 'poker6.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker7', 'Poker 7', '0.7', 'org.kde.poker1.plasmoid', 'poker7.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker8', 'Poker 8', '0.8', 'org.kde.poker1.plasmoid', 'poker8.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker9', 'Poker 9', '0.9', 'org.kde.poker1.plasmoid', 'poker9.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker10', 'Poker 10', '1.0', 'org.kde.poker1.plasmoid', 'poker1.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker11', 'Poker 11', '0.1', 'org.kde.poker1.plasmoid', 'poker1.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker12', 'Poker 12', '0.2', 'org.kde.poker1.plasmoid', 'poker2.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker13', 'Poker 13', '0.3', 'org.kde.poker1.plasmoid', 'poker3.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker14', 'Poker 14', '0.4', 'org.kde.poker1.plasmoid', 'poker4.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker15', 'Poker 15', '0.5', 'org.kde.poker1.plasmoid', 'poker5.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active) 
    values (ct_testing_licenseByName('GPL'), ct_testing_partnerId('KDE'), 'Poker16', 'Poker 16', '0.6', 'org.kde.poker1.plasmoid', 'poker6.png', true);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active, baseprice)  
    values (1, ct_testing_partnerId('KDE'), 'Poker17', 'Poker 17', '0.7', 'org.kde.poker1.plasmoid', 'poker7.png', true, 500);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active, baseprice) 
    values (1, ct_testing_partnerId('KDE'), 'Poker18', 'Poker 18', '0.8', 'org.kde.poker1.plasmoid', 'poker8.png', true, 1000);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Everyone'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));

insert into assets (license, partner, name, description, version, file, image, active, baseprice) 
    values (1, ct_testing_partnerId('KDE'), 'Poker19', 'Poker 19', '0.9', 'org.kde.poker1.plasmoid', 'poker9.png', true, 20000);
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('application/x-plasma'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Early Childhood'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('game'));
insert into assetTags (asset, tag)
    values (currval('seq_assetsids'), ct_testing_tagByName('Card Game'));


insert into assetPreviews (asset, path, mimetype, type, subtype) values (2, 'fishswimming.png',
       'image/png', 'screenshot', '1');
insert into assetPreviews (asset, path, mimetype, type, subtype) values (2, 'fishmultiplying.png',
       'image/png', 'screenshot', '2');


insert into channels (image, store, active, name, description)
    values ('plasmoa.png', 'VIVALDI-1', true, 'Card Games', 'Bust out the deck of 52!');
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('Card Game'));

insert into channels (image, store, active, name, description)
    values ('utilities.png', 'DD-1', true, 'Utilities', 'Useful tools');
insert into channelTags (channel, tag) 
    values (currval('seq_channelids'), ct_testing_tagByName('application/x-plasma'));
insert into channelTags (channel, tag) values (currval('seq_channelids'), ct_testing_tagByName('Util'));

insert into channels (image, store, active, name, description)
    values ('misc.png', 'DD-1', true, 'Other', 'Miscellaneous tools and toys');

insert into channels (image, store, active, name, description)
    values ('loser.png', 'DD-2', true, 'Diamond Device Magic', 'Best of the best from Diamond');


--FIXME: this needs some relevant book author info in there
select ct_testing_favoriteBooksByAuthor('zack@kde.org', 'Kafka');
select ct_testing_downloadBooksByAuthor('zack@kde.org', 'Kafka');
select ct_testing_favoriteBooksByAuthor('zack@kde.org', 'Plato');
select ct_testing_downloadBooksByAuthor('zack@kde.org', 'Plato');
select ct_testing_favoriteBooksByAuthor('aseigo@kde.org', 'Kafka');
select ct_testing_downloadBooksByAuthor('aseigo@kde.org', 'Kafka');
select ct_testing_favoriteBooksByAuthor('aseigo@kde.org', 'Dickens, Charles');
select ct_testing_downloadBooksByAuthor('aseigo@kde.org', 'Dickens, Charles');
select ct_testing_favoriteBooksByAuthor('aseigo@kde.org', 'Tolstoy, Leo');
select ct_testing_downloadBooksByAuthor('aseigo@kde.org', 'Tolstoy, Leo');


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

-- cleanup
drop function ct_testing_favoriteBooksByAuthor(email text, author text);
drop function ct_testing_downloadBooksByAuthor(email text, author text);
drop function ct_testing_tagByName(text);
drop function ct_testing_licenseByName(text);
drop function ct_testing_assetByName(text);
drop function ct_testing_personByEmail(text);
drop function ct_testing_partnerId(text);
drop function ct_testing_getRidOfPriorTestingTags();
commit;

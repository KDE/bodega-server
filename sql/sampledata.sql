--begin;
delete from people;
delete from partners;
delete from personroles;
delete from affiliations;
delete from languages;
delete from channels;

select setval('seq_assetsids', 1);
select setval('seq_languageids', 1);
select setval('seq_peopleids', 1);
select setval('seq_personroleids', 1);
select setval('seq_partnerids', 1);
select setval('seq_channelids', 1);
select setval('seq_deviceids', 1);

insert into people (lastname, firstname, email, points, password)
    values ('Rusin', 'Zack', 'zack@kde.org', 10000, '$2a$10$Iejk3uw6uGFCGR5OKaOOZO2tmnlIhPCsCvw7G1pLa81QH4fonDC.C');

insert into people (lastname, firstname, email, points, password)
    values ('Seigo', 'Aaron', 'aseigo@kde.org', 10000, '$2a$10$h6oIz3q1suZ5ncy7HS7UcutdJtwI7WBQ9Nd7cpd5b8hPcFbaXlzGq');

insert into people (lastname, firstname, email, points, password)
    values ('Martin', 'Marco', 'mart@kde.org', 10000, '$2a$10$VYBi6invWdeT..wQ5FFXqu67HQI5Y8WVAhN5orzUIsWAeMaAItYrS');

insert into partners (name, developer, distributor) values ('Diamond Devices', false, true);
insert into partners (name, developer, distributor) values ('Saphire Software', false, true);

insert into tags (partner, type, title) values (2, 2, 'Approved by KDE');


insert into affiliations (person, partner, role) values (2, 2, 2);
insert into affiliations (person, partner, role) values (2, 2, 3);
insert into affiliations (person, partner, role) values (2, 2, 3);
insert into affiliations (person, partner, role) values (3, 2, 2);
insert into affiliations (person, partner, role) values (3, 2, 3);
insert into affiliations (person, partner, role) values (3, 2, 3);


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


insert into tags (partner, type, title) values (2, 3, 'Game');
insert into tags (partner, type, title) values (2, 3, 'Card Game');
insert into tags (partner, type, title) values (2, 3, 'Util');
insert into tags (partner, type, title) values (2, 3, 'Misc');

insert into devices (partner, name, description, partnumber) values (2, 'Plasma Workspace', 'KDE Plasma user interfaces', 'KDE-1');
insert into devices (partner, name, description, partnumber) values (3, 'Bling Media Center', 'Imaginary hifi for your home', 'DD-1');
insert into devices (partner, name, description, partnumber) values (3, 'Affordaphone', 'Finally a phone even you can afford', 'DD-2');

insert into deviceChannels (device, channel) values ('KDE-1', 2);
insert into deviceChannels (device, channel) values ('DD-1', 3);
insert into deviceChannels (device, channel) values ('DD-1', 4);
insert into deviceChannels (device, channel) values ('DD-1', 5);
insert into deviceChannels (device, channel) values ('DD-2', 6);
insert into deviceChannels (device, channel) values ('DD-2', 6);
insert into deviceChannels (device, channel) values ('DD-2', 6);

insert into assets (license, author, name, description, version, path, image, active, externid) values (1, 2, 'Aquarium', 'Grow an aqarium full of fish!', '0.1', 'org.kde.aquarium.plasmoid', 'fish.png', true, 'aquarium');
insert into assets (license, author, name, description, version, path, image, active, externid) values (1, 2, 'Dice', 'Roll the dice', '0.1', 'org.kde.dice.plasmoid', 'dice.png', true, 'dice');
insert into assets (license, author, name, description, version, path, image, active, externid) values (1, 2, 'Diamond Juice', 'Best app from Diamond to date', '0.1', 'com.diamondevices.juice.plasmoid', 'juice.png', true, 'juice');
insert into assets (license, author, name, description, version, path, image, active, externid) values (1, 2, '15 Puzzle', 'The classic puzzle game', '0.1', 'org.kde.15puzzle.plasmoid', '15puzzle.png', true, 'fifteenpuzzle');
insert into assets (license, author, name, description, version, path, image, active, externid) values (1, 2, 'Tetris', 'Stacking blocks', '0.1', 'org.kde.tetris.plasmoid', 'tetris.png', true, 'jstetris');
insert into assets (license, author, name, description, version, path, image, active, externid) values (1, 2, 'Jewels', 'Connect the jewels', '0.1', 'org.kde.jewels.plasmoid', 'jewels.png', true, 'jewels');

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

insert into channelTags (channel, tag) values (2, 1);
insert into channelTags (channel, tag) values (2, 2);
insert into channelTags (channel, tag) values (3, 1);
insert into channelTags (channel, tag) values (3, 3);
insert into channelTags (channel, tag) values (4, 1);
insert into channelTags (channel, tag) values (4, 5);
insert into channelTags (channel, tag) values (5, 1);
insert into channelTags (channel, tag) values (5, 3);

--end;

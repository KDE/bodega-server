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

INSERT INTO tags (type, title) SELECT id, 'application/x-plasma' FROM tagtypes WHERE type = 'mimetype';

insert into partners (id, name, publisher, distributor, supportEmail)
       values (1, 'Make·Play·Live', true, true, 'support@makeplaylive.com');
insert into partnercontacts (partner, service, url) 
       values (1, 'website', 'http://makeplaylive.com');

insert into stores (id, partner, name, description)
       values ('VIVALDI-1', 1, 'Vivaldi', 'Plasma Active tablet from Make·Play·Live');

insert into partners (id, name, publisher, distributor)
       values (100, 'Project Gutenberg', true, false);
insert into partnercontacts (partner, service, url) values (100, 'website', 'http://http://www.gutenberg.org');

INSERT INTO tags (type, title) SELECT id, 'Vivaldi' FROM tagTypes WHERE type = 'platform';
INSERT INTO tags (type, title) SELECT id, 'Plasma/Applet' FROM tagTypes WHERE type = 'servicetype';
INSERT INTO tags (type, title) SELECT id, 'Plasma/Wallpaper' FROM tagTypes WHERE type = 'servicetype';

--end;

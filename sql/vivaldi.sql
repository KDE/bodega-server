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

--end;

--begin;

INSERT INTO tags (type, title) SELECT id, 'application/x-plasma' FROM tagtypes WHERE type = 'mimetype';

insert into partners (name, publisher, distributor, supportEmail)
       values ('Make Play Live', true, true, 'support@makeplaylive.com');
insert into partnercontacts (partner, service, url) values (currval('seq_partnerids'), 'website', 'http://makeplaylive.com');

insert into stores (id, partner, name, description)
       values ('VIVALDI-1', currval('seq_partnerids'), 'Vivaldi', 'Plasma Active tablet from Make Play Live');

--end;

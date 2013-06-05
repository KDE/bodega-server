--begin;

insert into partners (id, name, developer, distributor, homepage, supportEmail)
       values (1, 'Make Play Live', true, true, 'http://makeplaylive.com', 'support@makeplaylive.com');

insert into stores (id, partner, name, description)
       values ('VIVALDI-1', 0, 'Vivaldi', 'Plasma Active tablet from Make Play Live');

--end;

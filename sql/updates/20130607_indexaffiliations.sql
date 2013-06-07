create index idx_personaffiliations on affiliations (person);
create index idx_personroles on affiliations (partner, person);

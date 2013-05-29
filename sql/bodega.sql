create sequence seq_languageIds;

create table languages
(
    id          int         primary key default nextval('seq_languageIds'),
    code        char(6)     not null unique,
    name        text
);

create sequence seq_licenseIds;

create table licenses
(
    id          int         primary key default nextval('seq_licenseIds'),
    name        text        not null,
    text        text
);

create sequence seq_partnerIds;

-- addresses for billing, etc?
create table partners
(
    id          int         primary key default nextval('seq_partnerIds'),
    name        text        not null unique,
    developer   bool        default false,
    distributor bool        default false
);

create sequence seq_peopleIds;

-- what other contact info do we want/need besides email?
create table people
(
    id           int         primary key default nextval('seq_peopleIds'),
    lastName     text        not null,
    firstName    text        not null,
    middleNames  text,
    fullName     text,
    email        text        not null unique,
    password     text,
    points       int         not null default 0 constraint ct_personPoints check (points > -1),
    earnedPoints int         not null default 0 constraint ct_personEarnedPoints check (points > -1),
    owedPoints   int         not null default 0 constraint ct_personOwedPoints check (points > -1),
    active       bool        not null default false,
    created      timestamp   default(current_timestamp)
);

-- index for login checks
create index people_passwords on people (email, password);

-- used to store codes sent usually by email to people to confirm actions
-- such as new account registration and password resets
create table actionconfcodes
(
    person      int         not null references people(id) on delete cascade,
    action      char(10)    not null,
    issued      timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    code        text        not null
);

create index actionconfcodes_person on actionconfcodes (person);

create sequence seq_personRoleIds;

create table personRoles
(
    id          int         primary key default nextval('seq_personRoleIds'),
    description text        not null
);

create table affiliations
(
    person      int         not null references people(id) on delete cascade,
    partner     int         not null references partners(id) on delete cascade,
    role        int         references personRoles(id) not null
);

create table stores
(
    id          text        primary key,
    partner     int         references partners(id) not null,
    name        text        not null,
    description text,
    minMarkup   int         not null default 0 check (minMarkup >= 0),
    maxMarkup   int         not null default 0 check (maxMarkup >= minMarkup),
    flatMarkup  bool        not null default true,
    markup      int         not null default 0 check (not flatMarkup or (markup >= minMarkup and (maxMarkup = 0 or markup <= maxMarkup)))
);

create sequence seq_tagTypeIds;

create table tagTypes
(
    id          int         primary key default nextval('seq_tagTypeIds'),
    type        text        not null
);

create sequence seq_tagIds;

create table tags
(
    id          int         primary key default nextval('seq_tagIds'),
    partner     int         references partners(id) on delete cascade,
    type        int         references tagTypes(id) on delete cascade,
    title       text
);

create sequence seq_assetsIds;

create table tagText
(
    tag         int         references tags(id) on delete cascade,
    language    char(5),
    title       text        not null
);

create table assets
(
    id          int         primary key default nextval('seq_assetsIds'),
    license     int         references licenses(id),
    partner     int         references partners(id),
    basePrice   int         not null default 0 CHECK(basePrice >= 0),
    externId    text,
    name        text        not null,
    description text,
    version     text        not null,
    versionTs   timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    path        text        not null,
    file        text        not null,
    size        int         default 0 not null,
    image       text,
    active      bool        not null default true
);

-- we sort by name in listings, and this gives us a precomputed ordering
create index idx_asset_names on assets (name);
create index idx_asset_partners on assets (partner);

create table assetTags
(
    asset       int         references assets(id) on delete cascade,
    tag         int         references tags(id) on delete cascade
);

create index idx_assetTags_byAsset on assettags(asset);
create index idx_assetTags_byTag on assettags(tag);

create table assetText
(
    asset       int         references assets(id) on delete cascade,
    language    char(5)     not null,
    name        text        not null,
    description text
);

create index idx_assetText_assetLang on assetText (asset, language);

create table assetPreviews
(
    asset       int         references assets(id) on delete cascade,
    path        text
);

create table assetChangelogs
(
    asset       int         references assets(id) on delete cascade,
    version     text        not null,
    versionTs   timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    changes     text
);

create sequence seq_channelIds;

create table channels
(
    id          int         primary key default nextval('seq_channelIds'),
    partner     int         references partners(id),
    parent      int         references channels(id) on delete set null,
    topLevel    int         references channels(id) on delete set null,
    image       text,
    name        text        not null,
    description text,
    active      bool        not null default true,
    assetCount  int         not null default 0
    -- will be sql that can be executed to generated channel? a view name?
);

create index idx_channelParents on channels(parent);

create table channelTags
(
    channel     int         references channels(id) on delete cascade,
    tag         int         references tags(id) on delete cascade
);

create table channelAssets
(
    channel     int         references channels(id) on delete cascade,
    asset       int         references assets(id) on delete cascade
);

create index idx_channelAssetsByAsset on channelAssets (asset);
create index idx_channelAssetsByChannel on channelAssets (channel);

create table subChannelAssets
(
    channel     int         references channels(id) on delete cascade,
    leafChannel int         references channels(id) on delete cascade,
    asset       int         references assets(id) on delete cascade
);

create index idx_subChannelAssetsByAsset on subChannelAssets (asset);
create index idx_subChannelAssetsByChannel on subChannelAssets (channel);
create index idx_subChannelAssetsByLeaf on subChannelAssets (leafChannel);

create table storeChannels
(
    channel     int         not null references channels(id) on delete cascade,
    stores      text        not null references stores(id) on delete cascade
);

create index idx_storeChannels on storeChannels (channel, stores);

create table channelText
(
    channel     int         references channels(id) on delete cascade,
    language    char(5),
    name        text        not null,
    description text
);

-- create sequence seq_currencyIds;
--
-- create table currencies
-- (
--     id          int         primary key default nextval('seq_currencyIds'),
--     name        text        not null unique
-- );

create table assetPrices
(
    asset       int         references assets(id) on delete cascade,
    store       text        references stores(id) on delete cascade,
    points      int         not null constraint ct_apAssetPricePoint check (points > 0),
    starting    timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    ending      timestamp   constraint ct_apEndAfterStart check (ending > starting)
);

create index idx_assetPrices_assetChannel on assetPrices (asset, store);

create sequence seq_purchaseIds;
-- drop table purchases;
create table purchases
(
    id              int         primary key default nextval('seq_purchaseIds'),
    person          int         references people(id) on delete set null,
    email           text        not null,
    asset           int         references assets(id) on delete set null,
    store           text        not null,
    name            text        not null,
    points          int         not null CHECK (points >= 0),
    toParticipant   int         not null CHECK (points >= 0),
    toStore         int         not null CHECK (points >= 0),
    purchasedOn     timestamp   not null default (current_timestamp AT TIME ZONE 'UTC')
);

create index idx_purchasesPeople on purchases(person);
create index idx_purchasesAssets on purchases(asset);
create index idx_purchasesStores on purchases(store);

-- drop table downloads;
create table downloads
(
    asset           int         not null references assets(id) on delete set null,
    person          int         references people(id) on delete set null,
    downloadedOn    timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    store           text        REFERENCES stores(id) on delete set null,
    address         inet        not null,
    title           text,
    version         text
);

create index idx_downloadsPeople on downloads (person);
create index idx_downloadsAsset on downloads (asset);
create index idx_downloadsStore on downloads (store);

-- drop table pointTransactions;
create table pointTransactions
(
    person      int         not null references people(id),
    personFrom  int         references people(id) on delete set null,
    points      int         not null,
    created     timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    comment     text
);

create index idx_pointTransactionsPeople on pointTransactions (person);

-- drop table pointsCodes;
create table pointCodes
(
    code        text        primary key,
    points      int         not null CHECK (points > 0),
    created     timestamp   not null default (current_timestamp AT TIME ZONE 'UTC'),
    claimed     bool        not null default false,
    expires     timestamp
);

create table batchJobsInProgress
(
    job         text    not null,
    dowork      bool    not null default false
);

-- drop table easterEggs;
create table easterEggs
(
    phrase      text    primary key,
    store       text    not null references stores(id) on delete cascade,
    egg         text
);


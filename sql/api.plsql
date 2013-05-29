-- -*- mode:sql -*-

CREATE TYPE FindAssetInfo as (id int, namerank real, tagrank real, rank double precision, license int, partnerid int, partnername text, version text, path text, image text, name text, points int);

CREATE OR REPLACE FUNCTION
ct_FindAssets(query text, channelId int, pagesize int, offsetStart int)
RETURNS setof FindAssetInfo AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, sum(temp.namerank) as namerank, sum(temp.tagrank) as tagrank,
        (sum(temp.namerank) + sum(temp.tagrank)) / (1 + sum(CASE WHEN temp.tagrank > 0 THEN 1 ELSE 0 END)) as rank,
        max(a.license) as license, max(partners.id) as partnerid,
        max(partners.name) AS partnername, max(a.version) as version, max(a.path) as path, max(a.image) as image, max(a.name) as name,
        CASE WHEN max(temp.points) IS NULL THEN 0 ELSE max(temp.points) END AS points
    FROM
    (
        SELECT a.id as id, p.points as points,
        ts_rank_cd(a.en_index, plainto_tsquery('english', $1)) as namerank,
        0 as tagrank
        FROM assets a
        INNER JOIN subChannelAssets s ON (a.id = s.asset)
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.channel = s.channel)
        WHERE
        a.en_index @@ plainto_tsquery('english', $1) AND
        s.channel = $2
      UNION
        SELECT a.id as id, p.points as points,
        0 as namerank,
        ts_rank_cd(a.en_index, plainto_tsquery('english', $1)) as tagrank
        FROM assets a
        INNER JOIN subChannelAssets s ON (a.id = s.asset)
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.channel = s.channel)
        LEFT JOIN assetTags at ON (a.id = at.asset)
        LEFT JOIN tags t on (t.id = at.tag)
        WHERE
        s.channel = $2 AND
        t.en_index @@ plainto_tsquery('english', $1) AND
        t.type in (select id from tagtypes where type in ('category', 'descriptive', 'author', 'contributor'))
    ) as temp
        LEFT JOIN assets a ON (a.id = temp.id)
        LEFT JOIN partners ON (a.partner = partners.id)
    GROUP BY a.id
    ORDER BY rank DESC, max(a.name) LIMIT $3 OFFSET $4;
END;
$$ LANGUAGE plpgsql;


CREATE TYPE AssetInfo as (id int, license int, partnerid int, partnername text, version text, path text, image text, name text, points int);

CREATE OR REPLACE FUNCTION
ct_ListChannels(topChannel int)
RETURNS setof AssetInfo AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION
ct_ListAssets(channelId int)
RETURNS setof AssetInfo AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;

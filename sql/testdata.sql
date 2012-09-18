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

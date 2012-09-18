CREATE OR REPLACE FUNCTION ct_assetPrice(fromDevice text, what int) RETURNS INT AS $$
DECLARE
    price   int := -1;
BEGIN
    SELECT INTO price points FROM assetPrices ap LEFT JOIN assets a ON (ap.asset = a.id)
                             WHERE ap.asset = what AND ap.device = fromDevice AND
                                   ap.starting <= (current_timestamp AT TIME ZONE 'UTC') AND
                                   (ap.ending IS NULL OR ap.ending >= current_timestamp AT TIME ZONE 'UTC')
                            ORDER BY ap.starting DESC LIMIT 1;
    IF NOT FOUND THEN
        PERFORM ap.asset FROM channelAssets ap LEFT JOIN channels c ON (ap.channel = c.id)
                                              LEFT JOIN deviceChannels dc ON (c.id = dc.channel)
                                              LEFT JOIN assets a ON (ap.asset = a.id)
                                              WHERE ap.asset = what AND dc.device = fromDevice;
        IF FOUND THEN
            price := 0;
        ELSE
            price := -1;
        END IF;
    END IF;

    RETURN price;
END;
$$ LANGUAGE 'PLPGSQL';

-- try to purchase
-- PARAMETERS: int person, int asset
-- RETURNS: empty string on success, string explaining error on failure
CREATE OR REPLACE FUNCTION ct_purchase(who int, fromDevice text, what int) RETURNS INT AS $$
DECLARE
    price   int := 0;
    participantEarns int := 0;
    storeEarns int := 0;
    assetInfo RECORD;
    purchaserEmail   text;
BEGIN
    PERFORM * FROM purchases WHERE person = who AND device = fromDevice AND asset = what;
    IF FOUND THEN
        -- already purchased!
        RETURN 0;
    END IF;

    SELECT INTO price ct_assetPrice(fromDevice, what);
    IF price < 0 THEN
        RETURN 1;
    END IF;

    SELECT INTO purchaserEmail email FROM people WHERE id = who;
    IF NOT FOUND THEN
        RETURN 2;
    END IF;

    -- note that to avoid problems with multiple simultaneously sales, which can happen
    -- concurrently, the update must be done in an atomic fashion. fetching points
    -- totals and then doing an update introduces a race condition
    -- so what we do is deduct from points and if there is overflow, from owedpoints
    UPDATE people SET points = case when points > price THEN points - price ELSE 0 END,
                      owedpoints = CASE WHEN points > price THEN owedPoints ELSE owedPoints - (price - points) END
                  WHERE id = who AND (points + owedPoints) >= price;
    IF NOT FOUND THEN
        RETURN 3;
    END IF;

    -- give the uploader/author/owner points as a result
    SELECT INTO assetInfo basePrice, author, name FROM assets WHERE id = what;
    IF price > 0 THEN
        IF price < assetInfo.basePrice THEN
            assetInfo.basePrice = price;
        END IF;
        storeEarns := price - assetInfo.basePrice;
        UPDATE people SET earnedPoints = earnedPoints + assetInfo.basePrice, owedPoints = owedPoints + assetInfo.basePrice WHERE id = assetInfo.author;
    END IF;

    -- insert into the purchases recording table
    INSERT INTO purchases (person, email, device, asset, name, points, toParticipant, toStore) VALUES (who, purchaserEmail, fromDevice, what, assetInfo.name, price, assetInfo.basePrice, storeEarns);
    RETURN 0;
END;
$$ LANGUAGE 'PLPGSQL';

-- check if download is allowed
-- PARAMETERS: int person, int asset
-- RETURNS: bool true if can download, false if not
CREATE OR REPLACE FUNCTION ct_canDownload(who int, fromDevice text, what int) RETURNS BOOL AS $$
DECLARE
    price   int := 0;
    channel int := 0;
BEGIN
    PERFORM * FROM purchases WHERE person = who AND device = fromDevice AND asset = what;
    IF NOT FOUND THEN
        -- you can always download your own stuff
        PERFORM * FROM assets WHERE id = what AND author = who;
        IF FOUND THEN
            RETURN TRUE;
        END IF;

        SELECT INTO price ct_assetPrice(fromDevice, what);
        IF price < 0 THEN
            RETURN FALSE;
            --RETURN 'Requested asset not found. (ct_candl/01)';
        ELSIF price > 0 THEN
            RETURN FALSE;
            --RETURN 'Requested asset has not been purchased. (ct_candl/02)';
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE 'PLPGSQL';

-- registers a download
-- PARAMETERS: int person, int asset, inet from
-- RETURNS: bool true if can download, false if not
CREATE OR REPLACE FUNCTION ct_recordDownload(who int, what int, fromWhere inet, device text) RETURNS VOID AS $$
DECLARE
    asset   RECORD;
BEGIN
    SELECT INTO asset name, version FROM assets WHERE id = what;
    IF FOUND THEN
        INSERT INTO downloads (asset, person, address, title, version) VALUES (what, who, fromWhere, asset.name, asset.version);
    END IF;
END;
$$ LANGUAGE 'PLPGSQL';

-- adds points
-- PARAMETERS: int person, int numberOfPoints, text comment
-- RETURNS: bool true if points were successfully added
CREATE OR REPLACE FUNCTION ct_addPoints(who int, addpoints int, description text) RETURNS INT AS $$
DECLARE
    rv int := -1;
BEGIN
    UPDATE people SET points = points + addpoints WHERE id = who;
    IF FOUND THEN
        INSERT INTO pointTransactions (person, points, comment) VALUES (who, addpoints, description);
        SELECT INTO rv (points + owedPoints) FROM people WHERE id = who;
    END  IF;

    RETURN rv;
END;
$$ LANGUAGE 'PLPGSQL';

-- redeem a points code
-- PARAMETERS: text code
-- RETURNS: bool true if code successfully redeemed
CREATE OR REPLACE FUNCTION ct_redeemPointsCode(tryCode text, who int) RETURNS INT AS $$
DECLARE
    addPoints        int;
    pointsTransfered int;
BEGIN
    SELECT INTO addPoints points FROM pointCodes WHERE code = tryCode;
    UPDATE pointCodes SET claimed = true WHERE NOT claimed AND code = tryCode AND (expires IS NULL OR expires >= (current_timestamp AT TIME ZONE 'UTC'));
    IF NOT FOUND THEN
        RETURN -1;
    END IF;

    SELECT INTO pointsTransfered ct_addPoints(who, addPoints, 'Code redeemed: ' || trycode);
    if (pointsTransfered < 0) THEN
        UPDATE pointCodes SET claimed = false WHERE code = trycode;
        RETURN -1;
    END IF;

    RETURN pointsTransfered;
END;
$$ LANGUAGE 'PLPGSQL';

-- creates points codes
-- PARAMETERS: int number of codes to create, amount of points for each code, timestamp expiration date
-- RETURNS: nothing
CREATE OR REPLACE FUNCTION ct_createPointsCodes(numToCreate int, amount int, expiration timestamp) RETURNS VOID AS $$
DECLARE
    i   int := 0;
BEGIN
    WHILE (i < numToCreate) LOOP
        INSERT INTO pointCodes (code, points, expires) VALUES (random_string(20), amount, expiration);
        IF FOUND THEN
            i := i + 1;
        END IF;
    END LOOP;
END;
$$ LANGUAGE 'PLPGSQL';

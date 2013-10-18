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


CREATE OR REPLACE FUNCTION ct_createUserInDiscourse() RETURNS TRIGGER AS $$
DECLARE
    dupe_count INT := 0;
    baseusername TEXT;
    username TEXT;
    fullname TEXT;

    updateEmail TEXT;
    updatePassword TEXT;
    usernameLower TEXT;
BEGIN
    PERFORM dblink_connect(ct_setting('discourseConnectString'));

    IF TG_OP = 'UPDATE' AND NEW.fullname IS NULL THEN
        fullname := OLD.fullname;
    ELSE
        fullname := NEW.fullname;
    END IF;
    fullname := NEW.fullname;

    baseusername := regexp_replace(lower(fullname), '[^a-z0-9]', '_', 'g');
    -- the user name needs to be lower and 20 chars or less
    baseusername := lower(substring(baseusername, 1, 20));
    username := baseusername;

    -- figure out which email to use for the user name collision detection to follow
    IF TG_OP = 'INSERT' THEN
        updateEmail := NEW.email;
    ELSE
        updateEmail := OLD.email;
    END IF;

    -- ensure we don't already have this user name
    LOOP
        PERFORM * FROM dblink('SELECT username FROM users WHERE username = ''' || username || ''' AND email !=  ''' || updateEmail || '''') as t(username text);
        IF NOT FOUND THEN
            EXIT;
        END IF;

        dupe_count := dupe_count + 1;

        -- some safety here
        IF dupe_count > 1000 THEN
            EXIT;
        END IF;

        username := substring(baseusername, 1, 19 - char_length(dupe_count::text))
                    || '_' || dupe_count;
    END LOOP;

    -- 's are special chars, so escape them in the one place they can exist
    fullname := replace(fullname, '''', '''''');

    -- NOTE: the ''' are 3 single quotes
    IF (TG_OP = 'INSERT') THEN
        PERFORM dblink_exec('INSERT INTO users (name, username, username_lower,
                            email, password_hash,
                            created_at, updated_at,
                            trust_level, email_digests)
                            VALUES
                            (
                            ''' || fullname || ''', ''' || username || ''',''' || username || ''',
                            ''' || NEW.email || ''', ''' || NEW.password || ''',
                            current_timestamp, current_timestamp,
                            1, false);');

        PERFORM dblink_exec('INSERT INTO user_stats (user_id) VALUES (currval(''users_id_seq''));');
    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW.email IS NULL THEN
            updateEmail := OLD.email;
        ELSE
            updateEmail := NEW.email;
        END IF;

        IF NEW.Password IS NULL THEN
            updatePassword := OLD.password;
        ELSE
            updatePassword := NEW.password;
        END IF;


        PERFORM dblink_exec('UPDATE users SET name = ''' || fullname || ''',
                             username = ''' || username || ''',
                             email = ''' || updateEmail || ''',
                             password_hash = ''' || updatePassword || ''',
                             updated_at = current_timestamp,
                             username_lower = ''' || username || '''
                             WHERE email = ''' || OLD.email || ''';');
    END IF;

    PERFORM dblink_disconnect();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Discourse user syncronization failed: % %', SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_generateCategoryName(text) RETURNS TEXT AS $$
DECLARE
BEGIN
    RETURN 'Forum for ' || $1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_generateCategoryDescription(text) RETURNS TEXT AS $$
DECLARE
BEGIN
    RETURN 'In this forum you can contact the author of ' || $1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_generateTopicTitle(text) RETURNS TEXT AS $$
DECLARE
BEGIN
    RETURN 'In this forum you can contact the author of ' || $1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_createForumInDiscourse() RETURNS TRIGGER AS $$
DECLARE
    currentTime TIMESTAMP;
    userId INTEGER;
    categoryId INT;
    topicId INT;
    someText TEXT;
BEGIN
    -- we will create forums only for the partners who have id >= 1000
    IF (NEW.partner < 1000) THEN
        RETURN NEW;
    END IF;

    currentTime := current_timestamp AT TIME ZONE 'UTC';
    userId := 1; -- this is the root of discourse

    PERFORM dblink_connect(ct_setting('discourseConnectString'));

    IF (TG_OP = 'INSERT') THEN
        SELECT INTO categoryId id FROM dblink('INSERT INTO categories (name, created_at, updated_at, description, user_id, slug)
                            VALUES ('''||ct_generateCategoryName(NEW.name)||''', '''||currentTime||''',
                            '''||currentTime||''', '''||ct_generateCategoryDescription(NEW.name)||''',
                            '''||userId||''', '''||ct_generateCategoryName(NEW.name)||''') RETURNING id;' )
                            AS f(id int);

        SELECT INTO topicId id FROM dblink('INSERT INTO topics (title, created_at, updated_at,
                            user_id, last_post_user_id, bumped_at, category_id)
                            VALUES('''||ct_generateTopicTitle(NEW.name)||''', '''||currentTime||''', '''||currentTime||''',
                            '''||userId||''', '''||userId||''', '''||currentTime||''',
                            '''||categoryId||''') RETURNING id;') AS f(id int);

        PERFORM dblink_exec('INSERT INTO category_featured_topics (category_id, topic_id, created_at, updated_at, rank)
                            VALUES ('''||categoryId||''', '''||topicId||''', '''||currentTime||''', '''||currentTime||''', 0);');

        someText := 'foo';
        PERFORM dblink_exec('INSERT INTO posts (user_id, topic_id, post_number, raw, cooked,
                            created_at, updated_at, last_version_at)
                            VALUES ('''||userId||''', '''||topicId||''', 0, '''||someText||''', '''||someText||''',
                                    '''||currentTime||''', '''||currentTime||''', '''||currentTime||'''); ');

        PERFORM dblink_exec('INSERT INTO bodegaAssets (asset, topic, category)
                            VALUES ('''||NEW.id||''', '''||topicId||''', '''||categoryId||''');');


        INSERT INTO discourseLinks (assetId, categoryName) VALUES (NEW.id, ct_generateCategoryName(NEW.name));

    ELSIF (TG_OP = 'UPDATE') THEN
        PERFORM dblink_exec('UPDATE categories SET name = '''||ct_generateCategoryName(NEW.name)||''',
                            updated_at = '''||currentTime||''', description = '''||ct_generateCategoryDescription(NEW.name)||''',
                            slug = '''||ct_generateCategoryName(NEW.name)||''' FROM bodegaAssets ba WHERE ba.asset = '''||NEW.id||'''
                            AND ba.category = id;');

        PERFORM dblink_exec('UPDATE topics SET title = '''||ct_generateTopicTitle(NEW.name)||''', updated_at = '''||currentTime||'''
                        FROM bodegaAssets ba WHERE ba.asset = '''||NEW.id||''' AND ba.topic = id;');

    UPDATE discourseLinks SET categoryName = ct_generateCategoryName(NEW.name) WHERE assetId = NEW.id;

    END IF;
    PERFORM dblink_disconnect();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Discourse forum creation failed: % %', SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ct_enableDiscourseIntegration(enable bool) RETURNS VOID AS $$
BEGIN
    IF enable THEN
        BEGIN
            CREATE TRIGGER trg_ct_createForumInDiscourse AFTER UPDATE OF name OR INSERT ON assets
            FOR EACH ROW EXECUTE PROCEDURE ct_createForumInDiscourse();
        EXCEPTION WHEN OTHERS THEN
        END;
        BEGIN
            CREATE TRIGGER trg_ct_createUserInDiscourse AFTER UPDATE OF fullname, password, email OR INSERT ON people
            FOR EACH ROW EXECUTE PROCEDURE ct_createUserInDiscourse();
        EXCEPTION WHEN OTHERS THEN
        END;
    ELSE
        DROP TRIGGER IF EXISTS trg_ct_createUserInDiscourse ON people;
        DROP TRIGGER IF EXISTS trg_ct_createForumInDiscourse ON assets;
    END IF;
END;
$$ LANGUAGE plpgsql;


/*
    Copyright 2012-2013 Coherent Theory LLC

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

#include "database.h"

#include <QFileInfo>
#include <QHash>
#include <QLocale>
#include <QSqlDatabase>
#include <QSqlError>
#include <QTime>
#include <QVariant>

#include <QDebug>

bool ScopedTransaction::s_inTransaction = false;

Database::Database(const QString &contentPath, const QString &partner, const QString &store)
    : m_db(QSqlDatabase::addDatabase("QPSQL")),
      m_partnerId(0),
      m_authorTagTypeId(0),
      m_categoryTagTypeId(0),
      m_contentPath(contentPath),
      m_store(store),
      m_tagBatchCount(0)
{
    m_totalTime.start();

    //db.setHostName("localhost");
    m_db.setDatabaseName("bodega_production");
    m_db.setUserName("bodega");
    m_db.setPassword("bodega");
    bool ok = m_db.open();
    qDebug()<<"db opened = "<<ok;

    m_checkAssetTagQuery.prepare("SELECT asset FROM assetTags WHERE asset = :assetId AND tag = :tagId");
    m_checkChannelTagQuery.prepare("SELECT channel FROM channelTags WHERE channel = :channelId AND tag = :tagId");

    m_partnerId = partnerId(partner);
    if (!m_partnerId) {
        Q_ASSERT(!"couldn't create partner");
        return;
    }

    m_mimetypeTagTypeId = tagTypeId(QLatin1String("mimetype"));
    if (!m_mimetypeTagTypeId) {
        Q_ASSERT(!"couldn't create author tag id");
        return;
    }

    m_authorTagTypeId = tagTypeId(QLatin1String("author"));
    if (!m_authorTagTypeId) {
        Q_ASSERT(!"couldn't create author tag id");
        return;
    }

    m_categoryTagTypeId = tagTypeId(QLatin1String("category"));
    if (!m_categoryTagTypeId) {
        Q_ASSERT(!"couldn't create author tag id");
        return;
    }
}

Database::~Database()
{
    QTime t;
    t.start();

    QSqlQuery query;

    if (!m_assetTagInsertQuery.isEmpty()) {
        if (!query.exec(m_assetTagInsertQuery)) {
            showError(query);
        }
    }

    if (!m_channelTagInsertQuery.isEmpty()) {
        if (!query.exec(m_channelTagInsertQuery)) {
            showError(query);
        }
    }

    if (!query.exec("select ct_associateDirtyAssetsWithChannels(), ct_refreshChannels()")) {
        showError(query);
    }

    qDebug() << "=======> Final clean up queries took" << t.elapsed() / 1000. << "seconds";
    qDebug() << "Database object life time:" << m_totalTime.elapsed() / 1000. << "seconds";
}

int Database::writeChannel(const QString &name, const QString &description, const QString& image, int parentId)
{
    int id = channelId(name, description, parentId);

    if (!id || image.isEmpty()) {
        return id;
    }

    QSqlQuery query;
    query.prepare("update channels set image = :image where id = :channelId");
    query.bindValue(":image", image);
    query.bindValue(":channelid", id);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    return id;
}

int Database::mimetypeTagTypeId()
{
    return m_mimetypeTagTypeId;
}

int Database::partnerId()
{
    return m_partnerId;
}

int Database::partnerId(const QString &partner)
{
    QSqlQuery query;
    query.prepare("select id from partners where name = :partner");
    query.bindValue(":partner", partner);
    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (!query.first()) {
        QSqlQuery createQuery;
        createQuery.prepare("insert into partners (name, publisher, distributor) "
                            "values (:partner, false, false) returning id");
        createQuery.bindValue(":partner", partner);
        if (!createQuery.exec()) {
            showError(createQuery);
            return 0;
        }

        if (!createQuery.first()) {
            return 0;
        }

        QVariant res = createQuery.value(0);
        return res.toInt();
    }

    return query.value(0).toInt();
}

int Database::licenseId(const QString &license, const QString &licenseText)
{
    QSqlQuery query;
    query.prepare("select id from licenses where name = :license");
    query.bindValue(":license", license);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (query.first()) {
        return query.value(0).toInt();
    }

    query.prepare("insert into licenses "
                  "(name, text) "
                  "values "
                  "(:licenseName, :licenseText) returning id");

    query.bindValue(":licenseName", license);
    query.bindValue(":licenseText", licenseText);

    if (!query.exec()) {
        qDebug() << "uhoh!";
        showError(query);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    return query.value(0).toInt();
}

int Database::genericTagId(int tagTypeId, const QString &text, QHash<QString, int> *cache) const
{
    if (cache && cache->contains(text)) {
        return (*cache)[text];
    }

    QSqlQuery query;
    query.prepare("select id from tags where type = :type and title = :text");

    query.bindValue(":type", tagTypeId);
    query.bindValue(":author", text);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (query.first()) {
        int res = query.value(0).toInt();
        if (cache) {
            cache->insert(text, res);
        }

        return res;
    }

    query.prepare("insert into tags (type, title) "
                  "values (:type, :title) "
                  "returning id");
    query.bindValue(":type", tagTypeId);
    query.bindValue(":title", text);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    int res = query.value(0).toInt();
    if (cache) {
        cache->insert(text, res);
    }

    return res;
}
int Database::tagId(int tagTypeId, const QString &text, QHash<QString, int> *cache) const
{
    if (cache && cache->contains(text)) {
        return (*cache)[text];
    }

    QSqlQuery query;
    query.prepare("select id from tags where partner = :partner "
                  "and type = :type and title = :text");

    query.bindValue(":partner", m_partnerId);
    query.bindValue(":type", tagTypeId);
    query.bindValue(":author", text);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (query.first()) {
        int res = query.value(0).toInt();
        if (cache) {
            cache->insert(text, res);
        }

        return res;
    }

    query.prepare("insert into tags (partner, type, title) "
                  "values (:partner, :type, :title) "
                  "returning id");
    query.bindValue(":partner", m_partnerId);
    query.bindValue(":type", tagTypeId);
    query.bindValue(":title", text);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    int res = query.value(0).toInt();
    if (cache) {
        cache->insert(text, res);
    }

    return res;
}

int Database::tagTypeId(const QString &type) const
{
    QSqlQuery query;
    query.prepare("select id from tagTypes where type = :type");
    query.bindValue(":type", type);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (!query.first()) {
        QSqlQuery createQuery;
        createQuery.prepare("insert into tagTypes (type) values (:type) returning id");
        createQuery.bindValue(":type", type);
        if (!createQuery.exec()) {
            showError(createQuery);
            return 0;
        }

        if (!createQuery.first()) {
            return 0;
        }

        QVariant res = createQuery.value(0);
        return res.toInt();
    }

    QVariant res = query.value(0);
    return res.toInt();
}

int Database::channelId(const QString &channel, const QString &description, int parentId)
{
    QSqlQuery query;
    QString queryText = QString::fromLatin1("select id from channels where name = :name and store = :store");

    if (parentId) {
        queryText += QLatin1String(" and parent = :parentId");
        query.prepare(queryText);
        query.bindValue(":parentId", parentId);
    } else {
        query.prepare(queryText);
    }
    query.bindValue(":name", channel);
    query.bindValue(":store", m_store);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (query.first()) {
        QVariant res = query.value(0);
        //qDebug()<<"channel = "<<channel<<" is "<<res;
        return res.toInt();
    }

    if (parentId) {
        query.prepare("insert into channels "
                      "(store, active, parent, name, description) "
                      "values "
                      "(:store, :active, :parent, :name, :description) "
                      "returning id");
        query.bindValue(":parent", parentId);
    } else {
        query.prepare("insert into channels "
                      "(store, active, name, description) "
                      "values "
                      "(:store, :active, :name, :description) "
                      "returning id");
    }

    query.bindValue(":store", m_store);
    query.bindValue(":active", true);
    query.bindValue(":name", channel);
    query.bindValue(":description", description);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    QVariant res = query.value(0);
    return res.toInt();
}

int Database::categoryId(const QString &name) const
{
    QSqlQuery query;
    query.prepare("select id from tags where partner = :partnerId and type = :typeId and title = :title");

    query.bindValue(":partnerId", m_partnerId);
    query.bindValue(":typeId", m_categoryTagTypeId);
    query.bindValue(":title", name);

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (query.first()) {
        QVariant res = query.value(0);
        //qDebug()<<"chennel = "<<channel<<" is "<<res;
        return res.toInt();
    }

    query.prepare("insert into tags (partner, type, title) values (:partner, :type, :title) returning id");
    query.bindValue(":partner", m_partnerId);
    query.bindValue(":title", name);
    query.bindValue(":type", m_categoryTagTypeId);
    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    QVariant res = query.value(0);
    return res.toInt();
}

int Database::authorId(const QString &author)
{
    return tagId(m_authorTagTypeId, author, &m_authorIds);
}

int Database::writeAsset(QSqlQuery query, const QString &name, const QString &description,
                         int licenseId, int partnerId,
                         const QString &version, const QString &file,
                         const QString &imagePath)
{
    query.bindValue(":name", name);
    query.bindValue(":description", description);
    query.bindValue(":license", licenseId);
    query.bindValue(":partner", partnerId);
    query.bindValue(":version", version);
    query.bindValue(":file", file);
    query.bindValue(":image", imagePath);

    query.bindValue(":size", QFile(m_contentPath + '/' + file).size());

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    //qDebug()<<"Last id"<<res;
    return res.toInt();
}

void Database::writeAssetTags(int assetId, int tagId)
{
    m_checkAssetTagQuery.bindValue(":assetId", assetId);
    m_checkAssetTagQuery.bindValue(":tagId", tagId);
    m_checkAssetTagQuery.exec();
    if (m_checkAssetTagQuery.first()) {
        return;
    }

    static int count = 0;
    ++count;
    if (m_assetTagInsertQuery.isEmpty()) {
        m_assetTagInsertQuery = "INSERT INTO assetTags (asset, tag) VALUES ";
    } else {
        m_assetTagInsertQuery.append(", ");
    }

    m_assetTagInsertQuery.append("(" + QString::number(assetId) + ", " + QString::number(tagId) + ")");

    if (count >= 500) {
        QSqlQuery query;
        if (!query.exec(m_assetTagInsertQuery)) {
            showError(query);
        }
        m_assetTagInsertQuery.clear();
        count = 0;

        if ((++m_tagBatchCount % 5) == 0) {
            //qDebug() << "checking out what's up with dirties";
            if (!query.exec("select ct_associateDirtyAssetsWithChannels(), ct_refreshChannels()")) {
                showError(query);
            }
        }
    }
}

void Database::writeAssetTags(int assetId, QVariant &tagId)
{
    writeAssetTags(assetId, tagId.toInt());
}

void Database::writeChannelTags(int channelId, int tagId)
{
    m_checkChannelTagQuery.bindValue(":channelId", channelId);
    m_checkChannelTagQuery.bindValue(":tagId", tagId);
    m_checkChannelTagQuery.exec();
    if (m_checkChannelTagQuery.first()) {
        return;
    }

    static int count = 0;
    ++count;
    if (m_channelTagInsertQuery.isEmpty()) {
        m_channelTagInsertQuery = "INSERT INTO channelTags (channel, tag) VALUES ";
    } else {
        m_channelTagInsertQuery.append(", ");
    }

    m_channelTagInsertQuery.append("(" + QString::number(channelId) + ", " + QString::number(tagId) + ")");

    if (count >= 500) {
        QSqlQuery query;
        if (!query.exec(m_channelTagInsertQuery)) {
            showError(query);
        }
        m_channelTagInsertQuery.clear();
        count = 0;

        if ((++m_tagBatchCount % 5) == 0) {
            //qDebug() << "checking out what's up with dirties";
            if (!query.exec("select ct_associateDirtyAssetsWithChannels(), ct_refreshChannels()")) {
                showError(query);
            }
        }
    }
}

QString Database::store() const
{
    return m_store;
}


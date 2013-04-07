/*
    Copyright 2012 Coherent Theory LLC

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
#include <QSqlQuery>
#include <QSqlError>
#include <QTime>
#include <QVariant>

#include <QDebug>

Database::Database()
    : m_db(QSqlDatabase::addDatabase("QPSQL")),
      m_partnerId(0),
      m_authorTagId(0),
      m_categoryTagId(0),
      m_licenseId(0),
      m_contributorTagId(0),
      m_createdTagId(0),
      m_mimetypeTagId(0)//,
     // m_channelsCatalog(channelsCatalogPath)
{
    //FIXME: fix to LGPL
    m_licenseId = 2;
    //Fix to KDE
    m_partnerId = 1;
    //db.setHostName("localhost");
    m_db.setDatabaseName("bodega");
    m_db.setUserName("bodega");
    m_db.setPassword("bodega");
    bool ok = m_db.open();
    qDebug()<<"db opened = "<<ok;
}

void Database::writeInit(bool clearOldData)
{
    QSqlDatabase::database().transaction();

    m_authorTagId = this->authorTagId();
    if (!m_authorTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create author tag id");
        return;
    }
    m_categoryTagId = this->categoryTagTypeId();
    if (!m_categoryTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create author tag id");
        return;
    }
    m_mimetypeTagId = this->mimetypeTagId();
    if (!m_mimetypeTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create mimeType tag id");
        return;
    }

    QSqlDatabase::database().commit();

    if (clearOldData) {
        qDebug() << "deleting data first ... this can take a fair while as the database triggers run";
        QSqlQuery cleanupQuery;
        cleanupQuery.prepare("delete from deviceChannels where channel in (select id from channels where partner = :partner);");
        cleanupQuery.bindValue(":partner", m_partnerId);
        cleanupQuery.exec();
        cleanupQuery.prepare("delete from channels where partner = :partner;");
        cleanupQuery.bindValue(":partner", m_partnerId);
        cleanupQuery.exec();
        cleanupQuery.prepare("delete from assets where author = :partner;");
        cleanupQuery.bindValue(":partner", m_partnerId);
        cleanupQuery.exec();
    }
}

void Database::writeChannels(const QString &name, const QString &description, const QString& image, int parentId)
{
    QSqlDatabase::database().transaction();

    int id = channelId(name, description,parentId);

    if (!id) {
        QSqlDatabase::database().rollback();
        return;
    }

    QSqlQuery query;
    query.prepare("update channels set image = :image where id = :channelId;");
    query.bindValue(":image", image);
    query.bindValue(":channelid", id);

    if (!query.exec()) {
        showError(query);
        QSqlDatabase::database().rollback();
        return;
    }

    QSqlDatabase::database().commit();
}

void Database::writeDeviceChannels(int channelId)
{
    QSqlQuery query;

    query.prepare("insert into deviceChannels (device, channel) "
                  "values ('VIVALDI-1', :channelId);");


    query.bindValue(":channelId", channelId);
    if (!query.exec()) {
        showError(query);
        return;
    }
}

int Database::authorQuery(const QString &author) const
{
    return tagQuery(m_authorTagId, author);
}

int Database::tagQuery(int tagTypeId, const QString &text) const
{
    QSqlQuery query;
    query.prepare("select id from tags where partner=:partner "
                  "and type=:type "
                  " and title=:text;");

    query.bindValue(":partner", m_partnerId);
    query.bindValue(":type", tagTypeId);
    query.bindValue(":author", text);

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

int Database::tagTypeQuery(const QString &type) const
{
    QSqlQuery query;
    query.prepare("select id from tagTypes where type=:type;");
    query.bindValue(":type", type);
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

int Database::channelQuery(const QString &channel,
                           int parentId) const
{
    QSqlQuery query;
    QString queryText =
        QString::fromLatin1("select id from channels where "
                            "name=:name and partner=:partnerId");

    if (parentId) {
        queryText += QLatin1String(" and parent=:parentId;");
        query.prepare(queryText);
        query.bindValue(":parentId", parentId);
    } else {
        queryText += QLatin1String(";");
        query.prepare(queryText);
    }
    query.bindValue(":name", channel);
    query.bindValue(":partnerId", m_partnerId);

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    //qDebug()<<"channel = "<<channel<<" is "<<res;
    return res.toInt();
}

int Database::categoryQuery(const QString &name) const
{
    QSqlQuery query;

    query.prepare("select id from tags where partner=:partnerId and "
                  "type=:typeId and title=:title;");

    query.bindValue(":partnerId", m_partnerId);
    query.bindValue(":typeId", m_categoryTagId);
    query.bindValue(":title", name);

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    //qDebug()<<"chennel = "<<channel<<" is "<<res;
    return res.toInt();
}

int Database::tagTypeCreate(const QString &type)
{
    QSqlQuery query;
    query.prepare("insert into tagTypes "
                  "(type) "
                  "values (:type);");
    query.bindValue(":type", type);
    if (!query.exec()) {
        showError(query);
        QSqlDatabase::database().rollback();
        return 0;
    }

    return tagTypeQuery(type);
}

int Database::channelCreate(const QString &name,
                            const QString &description,
                            int parentId)
{
    QSqlQuery query;
    if (parentId) {
        query.prepare("insert into channels "
                      "(partner, active, parent, name, description) "
                      "values "
                      "(:partner, :active, :parent, :name, :description) "
                      "returning id;");
        query.bindValue(":parent", parentId);
    } else {
        query.prepare("insert into channels "
                      "(partner, active, name, description) "
                      "values "
                      "(:partner, :active, :name, :description) "
                      "returning id;");
    }

    query.bindValue(":partner", m_partnerId);
    query.bindValue(":active", true);
    query.bindValue(":name", name);
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

int Database::categoryCreate(const QString &name)
{
    QSqlQuery query;

    query.prepare("insert into tags "
                  "(partner, type, title) "
                  "values "
                  "(:partner, :type, :title) "
                  "returning id;");

    query.bindValue(":partner", m_partnerId);
    query.bindValue(":type", m_categoryTagId);
    query.bindValue(":title", name);

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

int Database::authorTagId()
{
    int tagId= tagTypeQuery(QLatin1String("author"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("author"));
    }
    return tagId;
}

int Database::categoryTagTypeId()
{
    int tagId= tagTypeQuery(QLatin1String("category"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("category"));
    }
    return tagId;
}

int Database::contributorTagId()
{
    int tagId= tagTypeQuery(QLatin1String("contributor"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("contributor"));
    }
    return tagId;
}

int Database::createdTagId()
{
    int tagId= tagTypeQuery(QLatin1String("created"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("created"));
    }
    return tagId;
}

int Database::mimetypeTagId()
{
    int tagId= tagTypeQuery(QLatin1String("mimetype"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("mimetype"));
    }
    return tagId;
}

int Database::channelId(const QString &name,
                        const QString &description,
                        int parentId )
{
    if (name.isEmpty()) {
        return 0;
    }

    int channelId = channelQuery(name, parentId);

    if (!channelId) {
        channelId = channelCreate(name, description, parentId);
    }
    return channelId;
}

int Database::authorId(const QString &author)
{
    return tagId(m_authorTagId, author, &m_authorIds);
}


int Database::tagId(int tagTypeId, const QString &text,
                    QHash<QString, int> *cache)
{
    Q_ASSERT(cache);

    if (cache->contains(text)) {
        return (*cache)[text];
    }

    int tagId = tagQuery(tagTypeId, text);
    if (!tagId) {
        QSqlQuery query;
        query.prepare("insert into tags "
                      "(partner, type, title) "
                      "values (:partner, :type, :title) "
                      "returning id;");
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
        QVariant res = query.value(0);
        (*cache)[text] = res.toInt();
    } else {
        (*cache)[text] = tagId;
    }

    return (*cache)[text];
}

int Database::writeAsset(QSqlQuery query, const QString &name, const QString &description,
                         int licenseId, int partnerId,
                         const QString &version, const QString &path, const QString &file,
                         const QString &externid, const QString &imagePath)
{
    query.bindValue(":name", name);
    query.bindValue(":description", description);
    query.bindValue(":license", licenseId);
    query.bindValue(":author", partnerId);
    query.bindValue(":version", version);
    query.bindValue(":path", path);
    query.bindValue(":file", file);
    query.bindValue(":externid", externid);
    query.bindValue(":image", imagePath);
    // XXX figure out what to do about descriptions
    //query.bindValue(":description",);

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

//TODO: more tag types?
void Database::writeAssetTags(int assetId, int tagId)
{
    QSqlQuery query;
    query.prepare("insert into assetTags "
                  "(asset, tag) "
                  "values "
                  "(:assetId, :tagId);");

    query.bindValue(":assetId", assetId);
    query.bindValue(":tagId", tagId);
    if (!query.exec()) {
        showError(query);
    }
}


void Database::writeAssetTags(int assetId, QVariant &tagId)
{
    writeAssetTags(assetId, tagId.toInt());
}

void Database::writeChannelTags(int channelId, int tagId)
{
    QSqlQuery query;
    query.prepare("insert into channelTags "
                  "(channel, tag) "
                  "values "
                  "(:channelId, :tagId);");

    QSqlQuery checkQuery;
    query.prepare("select * from channelTags where channel = :channel and tag = :tagId;");
    query.bindValue(":channelId", channelId);
    query.bindValue(":tagId", tagId);

    if (checkQuery.exec() && checkQuery.first()) {
        // tag already exists, don't make it again
        return;
    }

    query.bindValue(":channelId", channelId);
    query.bindValue(":tagId", tagId);

    if (!query.exec()) {
        showError(query);
    }
}

int Database::showError(const QSqlQuery &query) const
{
    QSqlError error = query.lastError();
    qDebug() << Q_FUNC_INFO << "QPSQL Error: " << error.databaseText() << error.driverText();
    qDebug() << "Query was "<< query.executedQuery();
    qDebug() << "last was "<< query.lastQuery();
    qDebug() << "bound = "<<query.boundValues();
}


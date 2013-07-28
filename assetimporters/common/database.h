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

#ifndef DATABASE_H
#define DATABASE_H

#include <QDebug>
#include <QHash>
#include <QSqlDatabase>
#include <QSqlError>
#include <QSqlQuery>

//#include "channelscatalog.h"

class ScopedTransaction
{
public:
    ScopedTransaction()
    {
        m_ourTransaction = !s_inTransaction;
        if (!s_inTransaction) {
            s_inTransaction = true;
            QSqlDatabase::database().transaction();
        } else {
            qDebug() << "ALREADY IN TRANSACTION!";
        }
    }

    ~ScopedTransaction()
    {
        if (m_ourTransaction) {
            QSqlDatabase::database().commit();
            s_inTransaction = false;
        }
    }

    bool m_ourTransaction;
    static bool s_inTransaction;
};

class Database
{

public:
    Database(const QString &contentPath, const QString &partner, const QString &store);
    virtual ~Database();

protected:
    int writeAsset(QSqlQuery query, const QString &name, const QString &description,
                   int licenseId, int partnerId,
                   const QString &version,
                   const QString &path, const QString &file,
                   const QString &imagePath);
    void writeAssetTags(int assetId, int tagId);

    void writeAssetTags(int assetId, QVariant &tagId);

    QString store() const;
    void showError(const QSqlQuery &query) const;
    int channelId(const QString &name, const QString &description = QString(), int parentId = 0);
    //FIXME: get rid of writeChannel; it is basically channelId + default image name
    int writeChannel(const QString &name, const QString &description, const QString& image, int parentId = 0);

    int partnerId();
    int partnerId(const QString &partner);
    int licenseId(const QString &license, const QString &licenseText = QString());

    int authorId(const QString &author) const;
    int contributorQuery(const QString &author) const;
    int tagId(int tagTypeId, const QString &text, QHash<QString, int> *cache = 0) const;
    int tagTypeId(const QString &type) const;
    int categoryId(const QString &name) const;

    int mimetypeTagTypeId();

    int authorId(const QString &author);
    int contributorId(const QString &contributor);
    void writeChannelTags(int channelId, int tagId);
    int createLicenseId();

private:
    QSqlDatabase m_db;
    int m_partnerId;
    int m_authorTagTypeId;
    int m_categoryTagTypeId;
    int m_mimetypeTagTypeId;
    QHash<QString, int> m_channelIds;
    QHash<QString, int> m_authorIds;
    QString m_contentPath;
    QString m_store;
    QString m_assetTagInsertQuery;
    QString m_channelTagInsertQuery;
    int m_tagBatchCount;
};

#define showError(query) \
    QSqlError error = query.lastError(); \
    qDebug() << "------------------------ DB ERROR ----------------------"; \
    qDebug() << "at:" << Q_FUNC_INFO; \
    qDebug() << "QPSQL Error: " << error.databaseText() << error.driverText(); \
    qDebug() << "Query was "<< query.executedQuery(); \
    qDebug() << "last was "<< query.lastQuery(); \
    qDebug() << "bound = "<<query.boundValues(); \
    qDebug() << "--------------------------------------------------------";

#endif

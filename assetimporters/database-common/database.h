#ifndef DATABASE_H
#define DATABASE_H

#include <QHash>
#include <QSqlDatabase>

//#include "channelscatalog.h"

class Database
{

public:
    Database(const QString &contentPath, const QString &store);

protected:
    int writeAsset(QSqlQuery query, const QString &name, const QString &description,
                   int licenseId, int partnerId,
                   const QString &version,
                   const QString &path, const QString &file,
                   const QString &externid, const QString &imagePath);
    void writeAssetTags(int assetId, int tagId);

    void writeAssetTags(int assetId, QVariant &tagId);

    void showError(const QSqlQuery &query) const;
    int channelId(const QString &name, const QString &description = QString(), int parentId = 0);
    //FIXME: get rid of writeChannel; it is basically channelId + default image name
    int writeChannel(const QString &name, const QString &description, const QString& image, int parentId = 0);

    int partnerId(const QString &partner);
    int licenseId(const QString &license, const QString &licenseText = QString());

    int authorId(const QString &author) const;
    int contributorQuery(const QString &author) const;
    int tagId(int tagTypeId, const QString &text, QHash<QString, int> *cache = 0) const;
    int tagTypeId(const QString &type) const;
    int categoryId(const QString &name) const;

    int mimetypeTagId();

    int authorId(const QString &author);
    int contributorId(const QString &contributor);
    void writeChannelTags(int channelId, int tagId);
    int createLicenseId();

private:
    QSqlDatabase m_db;
    int m_partnerId;
    int m_authorTagId;
    int m_categoryTagId;
    int m_mimetypeTagId;
    QHash<QString, int> m_channelIds;
    QHash<QString, int> m_authorIds;
    QString m_contentPath;
    QString m_store;
};


#endif

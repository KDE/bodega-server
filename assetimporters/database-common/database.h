#ifndef DATABASE_H
#define DATABASE_H

#include <QHash>
#include <QSqlDatabase>

#include "channelscatalog.h"

class Database
{

public:
    Database(const QString &channelsCatalogPath);

protected:
    void writeInit(bool clearOldData);
    void writeDeviceChannels();
    int writeAsset(QSqlQuery query, const QString &name, const QString &description,
                   const QString &version,
                   const QString &path, const QString &file,
                   const QString &externid, const QString &imagePath);
    void writeAssetTags(int assetId, const QString &mimeType, const QString &author);
    int showError(const QSqlQuery &query) const;
    int channelId(const QString &name,
                  const QString &description,
                  int parentId=0);
    void writeChannels();

    int partnerQuery() const;
    int languageQuery(const QString &lang) const;
    int authorQuery(const QString &author) const;
    int contributorQuery(const QString &author) const;
    int tagQuery(int tagTypeId, const QString &text) const;
    int tagTypeQuery(const QString &type) const;
    int channelQuery(const QString &channel,
                     int parentId) const;
    int categoryQuery(const QString &name) const;

    int tagTypeCreate(const QString &type);
    int channelCreate(const QString &name,
                      const QString &description,
                      int parentId=0);
    int categoryCreate(const QString &name);

    int authorTagId();
    int categoryTagTypeId();
    int contributorTagId();
    int createdTagId();
    int mimetypeTagId();
    int categoryId(const QString &name);

    int authorId(const QString &author);
    int contributorId(const QString &contributor);
    int tagId(int tagTypeId, const QString &text,
              QHash<QString, int> *cache);
    void writeChannelTags(const QString &name, const QString &mimeType, const QString &description);
    int createLicenseId();

private:
    QSqlDatabase m_db;
    int m_partnerId;
    int m_authorTagId;
    int m_categoryTagId;
    int m_licenseId;
    int m_contributorTagId;
    int m_createdTagId;
    int m_mimetypeTagId;
    QHash<QString, int> m_channelIds;
    QHash<QString, int> m_authorIds;
    QHash<QString, int> m_categoryTagIds;
    QHash<QString, int> m_contributorIds;
    QHash<QString, int> m_extraChannelIds;
    QHash<QString, int> m_mimetypeIds;
    QHash<QString, int> m_createdIds;
    ChannelsCatalog m_channelsCatalog;
};


#endif

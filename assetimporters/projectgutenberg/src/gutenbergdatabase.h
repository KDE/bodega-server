#ifndef GUTENBERGDATABASE_H
#define GUTENBERGDATABASE_H

#include "catalog.h"
#include "lcc.h"
#include "../../database-common/database.h"

#include <QSqlDatabase>

namespace Gutenberg
{


class GutenbergDatabase : public Database
{
public:
    static void write(const QString &channelPath, const Catalog &catalog, bool clearOldData);

private:
    GutenbergDatabase(const QString &channelPath);

    void writeInit(bool clearOldData);
    void writeLanguages(const Catalog &catalog);
    void writeCategoryTags(const Catalog &catalog);
    void writeBooks(const Catalog &catalog);
    void writeChannels(const Catalog &catalog);
    void writeDeviceChannels(const Catalog &catalog);
    void writeChannelTags();
    int writeBookAsset(const Ebook &book, QSqlQuery &query);
    void writeBookAssetTags(const Ebook &book, int assetId);
    int bookAssetQuery(const Ebook &book) const;
    int partnerQuery();
    int languageQuery(const QString &lang);
    int createLicenseId();
    int contributorId(const QString &contributor);
    int categoryId(const QString &name);

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
};
}

#endif

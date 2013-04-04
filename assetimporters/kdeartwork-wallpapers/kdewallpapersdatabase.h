#ifndef WALLPAPERSDATABASE_H
#define WALLPAPERSDATABASE_H

#include "catalog.h"
#include "../database-common/database.h"
#include <QSqlDatabase>

class WallpapersDatabase : public Database
{
public:
    static void write(const QString &channelPath, const QString &catalogPath, bool clearOldData);

private:
    WallpapersDatabase(const QString& channelPath);

    void writeInit(bool clearOldData);
    void writeLanguages(const Catalog &catalog);
    void writeCategoryTags(const Catalog &catalog);
    void writeWallpapers(const Catalog &catalog);
    void writeChannels(const Catalog &catalog);
    void writeDeviceChannels(const Catalog &catalog);

private:
    int partnerQuery() const;
    int languageQuery(const QString &lang) const;
    int authorQuery(const QString &author) const;
    int contributorQuery(const QString &author) const;
    int tagQuery(int tagTypeId, const QString &text) const;
    int tagTypeQuery(const QString &type) const;
    int channelQuery(const QString &channel,
                     int parentId) const;
    int categoryQuery(const QString &name) const;
    int bookAssetQuery(const Wallpaper &wallpaper) const;

private:
    int tagTypeCreate(const QString &type);
    int channelCreate(const QString &name,
                      const QString &description,
                      int parentId=0);
    int categoryCreate(const QString &name);

private:
    int authorTagId();
    int categoryTagTypeId();
    int contributorTagId();
    int createdTagId();
    int mimetypeTagId();
    int channelId(const QString &name,
                  const QString &description,
                  int parentId=0);
    int categoryId(const QString &name);

    int authorId(const QString &author);
    int contributorId(const QString &contributor);
    int tagId(int tagTypeId, const QString &text,
              QHash<QString, int> *cache);

    int findWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query);
    int writeWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query, int assetId = 0);
    void writeWallpaperAssetTags(const Wallpaper &wallpaper, int assetId);
    void writeChannelTags();
    int createLicenseId();
    int showError(const QSqlQuery &query) const;

private:
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

#endif

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
    static void write(const Catalog &catalog, const QString &contentPath, bool clearOldData);

private:
    GutenbergDatabase(const QString &contentPath);

    void writeBookInit(bool clearOldData);
    void writeLanguages(const Catalog &catalog);
    void writeCategoryTags(const Catalog &catalog);
    void writeBooks(const Catalog &catalog);
    void writeBookChannels(const Catalog &catalog);
    void writeBookChannelTags();
    int writeBookAsset(const Ebook &book, QSqlQuery &query);
    void writeBookAssetTags(const Ebook &book, int assetId);
    int bookAssetQuery(const Ebook &book) const;
    int partnerId();
    int languageId(const QString &lang);
    int licenseId();
    int contributorId(const QString &contributor);
    int categoryId(const QString &name);

private:
    QSqlDatabase m_db;
    int m_partnerId;
    int m_authorTagId;
    int m_categoryTagId;
    int m_licenseId;
    int m_contributorTagId;
    int m_mimetypeTagId;
    QHash<QString, int> m_channelIds;
    QHash<QString, int> m_authorIds;
    QHash<QString, int> m_categoryTagIds;
    QHash<QString, int> m_subCategoryTagIds;
    QHash<QString, int> m_contributorIds;
    QHash<QString, int> m_extraChannelIds;
    QHash<QString, int> m_mimetypeIds;
    QHash<QString, int> m_createdIds;
    QHash<QString, int> m_languageIds;
};
}

#endif

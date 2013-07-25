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

#include "gutenbergdatabase.h"

#include "lcc.h"

#include <QFileInfo>
#include <QHash>
#include <QLocale>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QVariant>

#include <QDebug>

using namespace Gutenberg;


void GutenbergDatabase::write(const Catalog &catalog, const QString &contentPath, bool clearOldData)
{
    GutenbergDatabase db(contentPath);

    Q_ASSERT(catalog.isCompiled());
    if (!catalog.isCompiled()) {
        qDebug() << "Catalog must be compiled";
        return;
    }

    ScopedTransaction s;
    db.writeBookInit(clearOldData);
    db.writeLanguages(catalog);
    db.writeCategoryTags(catalog);
    db.writeBooks(catalog);
    db.writeBookChannels(catalog);
}

GutenbergDatabase::GutenbergDatabase(const QString &contentPath)
    : Database(contentPath, "Project Gutenberg", "VIVALDI-1"),
      m_categoryTagId(0),
      m_licenseId(0),
      m_mimetypeTagId(0),
      m_topLevelChannelName(QLatin1String("Books"))
{
}

void GutenbergDatabase::writeBookInit(bool clearOldData)
{
    if (clearOldData) {
        QSqlQuery query;
        query.prepare("DELETE FROM channels WHERE store = :store AND "
                      "(name = :name OR parent IN "
                      "(SELECT id FROM channels WHERE store = :subStore AND name = :subName))");
        query.bindValue(":store", store());
        query.bindValue(":name", m_topLevelChannelName);
        query.bindValue(":subStore", store());
        query.bindValue(":subName", m_topLevelChannelName);
        if (!query.exec()) {
            showError(query);
            Q_ASSERT(false);
        }

        query.prepare("DELETE FROM assets WHERE partner = :partner");
        query.bindValue(":partner", partnerId());
        if (!query.exec()) {
            showError(query);
            Q_ASSERT(false);
        }
    }

    //qDebug()<<"partner id = "<<m_partnerId;

    // create a table to store the external ids
    QSqlQuery query;
    if (!query.exec("CREATE TABLE IF NOT EXISTS gutenberg "
                    "(id text primary key, asset int references assets(id) on delete cascade)")) {
        showError(query);
        Q_ASSERT(false);
    }

    m_licenseId = licenseId("Project Gutenberg License",
                            "http://www.gutenberg.org/wiki/Gutenberg:The_Project_Gutenberg_License");
    if (!m_licenseId) {
        Q_ASSERT(!"failed to get a license id");
    }

    m_mimetypeTagId = mimetypeTagId();
}

void GutenbergDatabase::writeLanguages(const Catalog &catalog)
{
    QStringList langs = catalog.languages();

    foreach(QString lang, langs) {
        QLocale locale(lang);

        if (locale != QLocale::c()) {
            if (languageId(lang) || languageId(locale.name())) {
                qDebug()<<"Language = "<<lang
                        <<" already in the database";
                continue;
            } else {
                QString langName = QLocale::languageToString(locale.language());
                QSqlQuery query;
                query.prepare("insert into languages "
                              "(code, name) "
                              "values (:code, :name)");
                query.bindValue(":code", locale.name());
                query.bindValue(":name", langName);
                if (!query.exec()) {
                    showError(query);
                    QSqlDatabase::database().rollback();
                    return;
                }
            }
        } else {
            qDebug()<<"Unrecognized language = "<<lang;
        }
    }
}


void GutenbergDatabase::writeCategoryTags(const Catalog &catalog)
{
    foreach (const QString &category, catalog.topLevelCategories()) {
        const int id = categoryId(category);
        //qDebug() << "looking for" << category << id;
        Q_ASSERT(id);
        m_categoryTagIds[category] = id;
    }

    foreach (const QString &category, catalog.subCategories()) {
        const int id = categoryId(category);
        Q_ASSERT(id);
        m_subCategoryTagIds[category] = id;
    }
}

void GutenbergDatabase::writeBooks(const Catalog &catalog)
{
    QTime time;
    time.start();

    int numSkipped = 0;
    int numBooksWritten = 0;
    // report progress every 5%
    const int reportIncrement = catalog.m_ebooks.count() / 20.;
    int lastReport = 0;

    QSqlQuery registerJobQuery;
    registerJobQuery.prepare("update batchJobsInProgress set doWork = :working where job = 'gutenberg'");
    registerJobQuery.bindValue(":working", true);
    if (!registerJobQuery.exec()) {
        showError(registerJobQuery);
        Q_ASSERT(!"something bad happened with the batchJobsInProgress setting");
    }

    QSqlQuery query;
    query.prepare("insert into assets "
                  "(name, license, partner, version, externpath, file, image, size) "
                  "values "
                  "(:name, :license, :partner, :version, :path, :file, :image, :size) "
                  "returning id");

    QSqlQuery recordExternalIdQuery;
    recordExternalIdQuery.prepare("INSERT INTO gutenberg (id, asset) VALUES (:id, :asset)");

    foreach (const Ebook &book, catalog.m_ebooks) {
        //qDebug() << "Ok, let's put in this book" << book.bookId() << book.title();
        if (bookAssetQuery(book)) {
            // already in the database
            ++numSkipped;
        } else {
            // not yet in the db, so put it there now
            int assetId = writeBookAsset(book, query);
            if (!assetId) {
                QSqlDatabase::database().rollback();
                return;
            }

            recordExternalIdQuery.bindValue(":id", book.bookId());
            recordExternalIdQuery.bindValue(":asset", assetId);
            if (!recordExternalIdQuery.exec()) {
                showError(query);
                Q_ASSERT("Normal insert into gutenberg table failed.");
            }

            writeBookAssetTags(book, assetId);
            ++numBooksWritten;
        }

        int booksProcessed = numBooksWritten + numSkipped;
        if (booksProcessed - lastReport > reportIncrement) {
            double written = booksProcessed;
            int percent = (written/catalog.m_ebooks.count()) * 100;
            qDebug() << "Written "<< percent << "%...";
            lastReport = booksProcessed;
        }
    }

    registerJobQuery.bindValue(":working", false);
    if (!registerJobQuery.exec()) {
        showError(registerJobQuery);
        Q_ASSERT(!"something bad happened with the batchJobsInProgress setting");
    }

    int elapsed = time.elapsed();

    qDebug()<< "Writing took "<< elapsed / 1000. << " secs. Inserted"
            << numBooksWritten << "and skipped" << numSkipped;
}


void GutenbergDatabase::writeBookChannels(const Catalog &catalog)
{
    const int booksChannelId = writeChannel(m_topLevelChannelName, QString(), "default/book.png");
    const int authorChannelId = writeChannel(QString("By Author"), QString(),
                                             "default/book.png", booksChannelId);
    const int subjectChannelId = writeChannel(QString("By Subject"), QString(),
                                              "default/book.png", booksChannelId);
    const int titleChannelId = writeChannel(QString("By Title"), QString(),
                                            "default/book.png", booksChannelId);

    const QHash<QString, QStringList> lccs = catalog.categoryHierarchy();
    QHashIterator<QString, QStringList> it(lccs);
    while (it.hasNext()) {
        it.next();
        const int channelId = writeChannel(it.key(), QString(), "default/book.png", subjectChannelId);

        foreach (const QString &subChannel, it.value()) {
            const int subChannelId = writeChannel(subChannel, QString(), "default/book.png", channelId);
            writeChannelTags(subChannelId, m_categoryTagIds.value(it.key()));
            writeChannelTags(subChannelId, m_subCategoryTagIds.value(subChannel));
        }
    }
}

int GutenbergDatabase::bookAssetQuery(const Ebook &book) const
{
    QSqlQuery query;
    query.prepare("SELECT id FROM gutenberg where id = :id");
    query.bindValue(":id", book.bookId());

    if (!query.exec()) {
        showError(query);
        Q_ASSERT(false);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    return query.value(0).toInt();
}

int GutenbergDatabase::writeBookAsset(const Ebook &book, QSqlQuery &query)
{
    static const QString filePrefix("gutenberg/");
    Gutenberg::File epubFile = book.epubFile();
    QFileInfo fi(epubFile.url.path());

    QString cover = QFileInfo(book.coverImage()).fileName();
    if (cover.isEmpty()) {
        cover = QLatin1String("default/book.png");
    } else {
        cover.prepend("gutenberg/");
    }

    //FIXME: alternatives
    const int id = writeAsset(query, book.title(), QString(),
                              m_licenseId, partnerId(), QLatin1String("1.0"),
                              epubFile.url.toString(), filePrefix + fi.fileName(), cover);
    return id;
}

void GutenbergDatabase::writeBookAssetTags(const Ebook &book, int assetId)
{
    const QStringList authors = book.authors();
    foreach (const QString &author, authors) {
        writeAssetTags(assetId, authorId(author));
    }

    //qDebug()<<"Book = "<< book.title();
    Gutenberg::File epubFile = book.epubFile();
    int mimetypeId = tagId(m_mimetypeTagId,
                           epubFile.format,  &m_mimetypeIds);
    writeAssetTags(assetId, mimetypeId);

    Gutenberg::LCC lcc = book.lcc();
    const QHash<QString, QStringList> lccs = lcc.categories();
    QHashIterator<QString, QStringList> it(lccs);
    while (it.hasNext()) {
        it.next();

        //qDebug()<<"\tchannelName = "<<lccName;
        Q_ASSERT(m_categoryTagIds.contains(it.key()));
        const int categoryTagId = m_categoryTagIds[it.key()];
        Q_ASSERT(categoryTagId);
        writeAssetTags(assetId, categoryTagId);

        foreach (const QString &subCat, it.value()) {
            const int subCategoryTagId = m_subCategoryTagIds[subCat];
            writeAssetTags(assetId, subCategoryTagId);
        }
    }
}

int GutenbergDatabase::languageId(const QString &lang)
{
    int id = m_languageIds.value(lang);

    if (id < 1) {
         QSqlQuery query;
        query.prepare("select id from languages where code=:lang");
        query.bindValue(":lang", lang);

        if (!query.exec()) {
            showError(query);
            return 0;
        }

        if (!query.first()) {
            return 0;
        }

        QVariant res = query.value(0);

        id = res.toInt();
        m_languageIds.insert(lang, id);
    }

    return id;
}


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

#include "languages.h"
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

class ScopedBatchJob
{
public:
    ScopedBatchJob()
    {
        registerJobQuery.prepare("update batchJobsInProgress set doWork = :working where job = 'gutenberg'");
        registerJobQuery.bindValue(":working", true);
        if (!registerJobQuery.exec()) {
            showError(registerJobQuery);
            Q_ASSERT(!"something bad happened with the batchJobsInProgress setting");
        }
    }

    ~ScopedBatchJob()
    {
        registerJobQuery.bindValue(":working", false);
        if (!registerJobQuery.exec()) {
            showError(registerJobQuery);
            Q_ASSERT(!"something bad happened with the batchJobsInProgress setting");
        }
    }

    QSqlQuery registerJobQuery;
};

void GutenbergDatabase::write(const Catalog &catalog, const QString &contentPath, bool clearOldData)
{
    GutenbergDatabase db(contentPath);

    Q_ASSERT(catalog.isCompiled());
    if (!catalog.isCompiled()) {
        qDebug() << "Catalog must be compiled";
        return;
    }

    if (clearOldData) {
        db.clearData();
    }

    db.writeBookInit();
    db.writeLanguages(catalog);
    db.writeCategoryTags(catalog);
    db.writeBooks(catalog);
    db.writeBookChannels(catalog);
}

GutenbergDatabase::GutenbergDatabase(const QString &contentPath)
    : Database(contentPath, "Project Gutenberg", "VIVALDI-1"),
      m_categoryTagId(0),
      m_licenseId(0),
      m_mimetypeTagTypeId(0),
      m_ebookMimetypeTag(0),
      m_topLevelChannelName(QLatin1String("Books"))
{
}

void GutenbergDatabase::clearData()
{
    ScopedTransaction s;
    ScopedBatchJob j;

    QTime time;
    time.start();
    qDebug() << "=======> Removing existing gutenberg data from the database";

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

    qDebug() << "\tremoval took" << time.elapsed() << "ms";
}

void GutenbergDatabase::writeBookInit()
{
    qDebug() << "=======> Setting up database";
    ScopedTransaction s;

    //qDebug()<<"partner id = " << partnerId();

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

    m_mimetypeTagTypeId = mimetypeTagTypeId();
    m_descriptionTagTypeId = tagTypeId("description");

    m_ebookMimetypeTag = tagId(m_mimetypeTagTypeId, Ebook::epubMimetype());
}

void GutenbergDatabase::writeLanguages(const Catalog &catalog)
{
    qDebug() << "=======> Writing languages";
    QTime t;
    t.start();

    const int languageTagType = tagTypeId("language");
    QStringList assetLanguages = catalog.languages();
    Languages languages;

    foreach (const QString &code, assetLanguages) {
        if (!languageId(code)) {
            const QString name = languages.name(code);
            if (name.isEmpty()) {
                qDebug() << "Unrecognized language code:" << code;
            } else {
                qDebug() << "\tFound language:" << name;
                QSqlQuery query;
                query.prepare("insert into languages (code, name) values (:code, :name)");
                query.bindValue(":code", code);
                query.bindValue(":name", name);
                if (!query.exec()) {
                    showError(query);
                }
            }
        }

        // now we insert the tag if needed and record its value for later use
        tagId(languageTagType, code, &m_languageTagIds);
    }

    qDebug() << "\tLanguage creation took" << t.elapsed() << "ms";
}


void GutenbergDatabase::writeCategoryTags(const Catalog &catalog)
{
    ScopedTransaction s;

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
    qDebug() << "=======> Writing books";

    QTime time;
    time.start();

    //ScopedTransaction s;
    ScopedBatchJob j;

    int numSkipped = 0;
    int numBooksWritten = 0;
    // report progress every 5%
    const int reportIncrement = catalog.m_ebooks.count() / 20.;
    int lastReport = 0;

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
            qDebug() << "\tWritten" << percent << "% after" << time.elapsed() << "ms";
            lastReport = booksProcessed;
        }
    }

    int elapsed = time.elapsed();

    qDebug()<< "\tWriting all books took"<< elapsed / 1000. << "secs. Inserted"
            << numBooksWritten << "and skipped" << numSkipped;
}


void GutenbergDatabase::writeBookChannels(const Catalog &catalog)
{
    qDebug() << "=======> Channel tagging";
    QTime t;
    t.start();
    QTime channelTagTime;
    channelTagTime.start();

    const int booksChannelId = writeChannel(m_topLevelChannelName, QString(), "default/book.png");

    qDebug() << "\tAuthor channels";
    const int authorChannelId = writeChannel(QString("By Author"), QString(),
                                             "default/book.png", booksChannelId);
    const int groupingTagTypeId = tagTypeId("grouping");
    QSqlQuery query;
    query.prepare("select distinct t.id, upper(substring(t.title from '.$')) from assettags at join tags t on (at.tag = t.id) "
                  "join assets a on (at.asset = a.id) "
                  "where a.partner = :partner and t.type = :groupingTagType and t.title ~ :pattern");
    query.bindValue(":partner", partnerId());
    query.bindValue(":groupingTagType", groupingTagTypeId);
    query.bindValue(":pattern", "author_");
    query.exec();
    while (query.next()) {
        const int tagId = query.value(0).toInt();
        const QString name = query.value(1).toString();
        const int subChannelId = writeChannel(name, QString(), "default/book.png", authorChannelId);
        writeChannelTags(subChannelId, tagId);
        writeChannelTags(subChannelId, m_ebookMimetypeTag);
        qDebug() << "\t\tTagged channel" << subChannelId << "By Author /" << name
                 << "in" << channelTagTime.restart() << "ms";
    }

    qDebug() << "\tTitle channels";
    const int titleChannelId = writeChannel(QString("By Title"), QString(),
                                            "default/book.png", booksChannelId);
    query.bindValue(":pattern", "name_");
    query.exec();
    while (query.next()) {
        const int tagId = query.value(0).toInt();
        const QString name = query.value(1).toString();
        const int subChannelId = writeChannel(name, QString(), "default/book.png", titleChannelId);
        writeChannelTags(subChannelId, tagId);
        writeChannelTags(subChannelId, m_ebookMimetypeTag);
        qDebug() << "\t\tTagged channel" << subChannelId << "By Title /" << name
                << "in" << channelTagTime.restart() << "ms";
    }


    qDebug() << "\tSubject channels";
    const int subjectChannelId = writeChannel(QString("By Subject"), QString(),
                                              "default/book.png", booksChannelId);
    const QHash<QString, QStringList> lccs = catalog.categoryHierarchy();
    QHashIterator<QString, QStringList> it(lccs);
    while (it.hasNext()) {
        it.next();
        const int channelId = writeChannel(it.key(), QString(), "default/book.png", subjectChannelId);

        if (it.value().isEmpty()) {
            // this guy has no subcategories, so we'll put tags on it
            writeChannelTags(channelId, m_categoryTagIds.value(it.key()));
            qDebug() << "\t\tTagged channel" << channelId << it.key()
                     << "in" << channelTagTime.restart() << "ms";
        } else {
            foreach (const QString &subChannel, it.value()) {
                const int subChannelId = writeChannel(subChannel, QString(), "default/book.png", channelId);
                /*
                qDebug() << "CHANNEL" << channelId << it.key() << subChannelId << subChannel
                         << m_categoryTagIds.value(it.key()) << m_subCategoryTagIds.value(subChannel);
                */
                writeChannelTags(subChannelId, m_categoryTagIds.value(it.key()));
                writeChannelTags(subChannelId, m_subCategoryTagIds.value(subChannel));
                qDebug() << "\t\tTagged channel" << subChannelId << it.key() << "/" << subChannel
                         << "in" << channelTagTime.restart() << "ms";
            }
        }
    }

    qDebug() << "\tWriting all channel tags took" << t.elapsed() / 1000. << "secs";
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

    const int id = writeAsset(query, book.title(), QString(),
                              m_licenseId, partnerId(), QLatin1String("1.0"),
                              epubFile.url.toString(), filePrefix + fi.fileName(), cover);
    return id;
}

void GutenbergDatabase::writeBookAssetTags(const Ebook &book, int assetId)
{
    foreach (const QString &author, book.authors()) {
        writeAssetTags(assetId, authorId(author));
    }

    foreach (const QString &code, book.languages()) {
        writeAssetTags(assetId, m_languageTagIds.value(code));
    }

    foreach (const QString &altTitle, book.alternativeTitles()) {
        writeAssetTags(assetId, tagId(m_descriptionTagTypeId, altTitle));
    }

    //qDebug()<<"Book = "<< book.title();
    Gutenberg::File epubFile = book.epubFile();
    writeAssetTags(assetId, m_ebookMimetypeTag);

    Gutenberg::LCC lcc = book.lcc();
    const QHash<QString, QStringList> lccs = lcc.categories();
    QHashIterator<QString, QStringList> it(lccs);
    //qDebug() << "==========> " << book.title() << assetId;
    while (it.hasNext()) {
        it.next();

        //qDebug()<<"\tchannelName = "<<lccName;
        Q_ASSERT(m_categoryTagIds.contains(it.key()));
        const int categoryTagId = m_categoryTagIds[it.key()];
        Q_ASSERT(categoryTagId);
        //qDebug() << "main cat:" << it.key() << categoryTagId;
        writeAssetTags(assetId, categoryTagId);

        foreach (const QString &subCat, it.value()) {
            const int subCategoryTagId = m_subCategoryTagIds[subCat];
            //qDebug() << "\tsub cat:" << subCat << subCategoryTagId;
            writeAssetTags(assetId, subCategoryTagId);
        }
    }
}

int GutenbergDatabase::languageId(const QString &lang)
{
    int id = m_languageIds.value(lang);

    if (id < 1) {
        QSqlQuery query;
        query.prepare("select id from languages where code = :lang");
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


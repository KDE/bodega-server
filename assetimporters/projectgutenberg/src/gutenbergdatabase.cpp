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


void GutenbergDatabase::write(const Catalog &catalog, bool clearOldData)
{
    GutenbergDatabase db;

    Q_ASSERT(catalog.isCompiled());
    if (!catalog.isCompiled()) {
        qDebug()<<"Catalog must be compiled";
        return;
    }
    db.writeInit(clearOldData);
    //db.writeLanguages(catalog);
    db.writeCategoryTags(catalog);
    db.writeBooks(catalog);
    db.writeBookChannels(catalog);
    db.writeBookDeviceChannels(catalog);
}

GutenbergDatabase::GutenbergDatabase()
    : Database(),
      m_partnerId(0),
      m_authorTagId(0),
      m_categoryTagId(0),
      m_licenseId(0),
      m_contributorTagId(0),
      m_createdTagId(0),
      m_mimetypeTagId(0)
{
}

void GutenbergDatabase::writeInit(bool clearOldData)
{
    QSqlDatabase::database().transaction();

    m_partnerId = partnerQuery();
    if (m_partnerId <= 0) {
        QSqlQuery query;
        if (!query.exec("insert into partners (name, developer, distributor) "
                        "values ('Project Gutenberg', false, true);")) {
            showError(query);
            QSqlDatabase::database().rollback();
            return;
        }
        m_partnerId = partnerQuery();
    }
    //qDebug()<<"partner id = "<<m_partnerId;

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
    m_contributorTagId = this->contributorTagId();
    if (!m_contributorTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create contributor tag id");
        return;
    }
    m_createdTagId = this->createdTagId();
    if (!m_createdTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create contributor tag id");
        return;
    }
    m_mimetypeTagId = this->mimetypeTagId();
    if (!m_mimetypeTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create contributor tag id");
        return;
    }

    m_licenseId = createLicenseId();
    if (!m_licenseId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create Project Gutenberg license id");
        return;
    }

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

    QSqlDatabase::database().commit();
}

void GutenbergDatabase::writeLanguages(const Catalog &catalog)
{
    QStringList langs = catalog.languages();

    QSqlDatabase::database().transaction();

    foreach(QString lang, langs) {
        QLocale locale(lang);

        if (locale != QLocale::c()) {
            if (languageQuery(lang) || languageQuery(locale.name())) {
                qDebug()<<"Language = "<<lang
                        <<" already in the database";
                continue;
            } else {
                //XXX: locale.nativeLanguageName() in Qt 4.8
                QString langName = QLocale::languageToString(locale.language());
                QSqlQuery query;
                query.prepare("insert into languages "
                              "(code, name) "
                              "values (:code, :name);");
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
    QSqlDatabase::database().commit();
}


void GutenbergDatabase::writeCategoryTags(const Catalog &catalog)
{
    const QHash<LCC::Category, QString> map = LCC::categoryMap();
    QHash<LCC::Category, QString>::const_iterator itr;
    for (itr = map.constBegin(); itr != map.constEnd(); ++itr) {
        int category = categoryId(itr.value());
        Q_ASSERT(category);
        m_categoryTagIds[itr.value()] = category;
    }
}

void GutenbergDatabase::writeBooks(const Catalog &catalog)
{
    QTime time;
    time.start();

    bool transaction = QSqlDatabase::database().transaction();

    if (!transaction) {
        qWarning()<<"Couldn't initiate transaction!";
    }

    QHash<QString, Ebook> books = catalog.ebooks();
    QHash<QString, Ebook>::const_iterator itr;
    int numSkipped = 0;
    int numBooksWritten = 0;
    // report progress every 5%
    const int reportIncrement = books.count() / 20.;
    int lastReport = 0;

    QSqlQuery registerJobQuery;
    registerJobQuery.prepare("update batchJobsInProgress set doWork = :working where job = 'gutenberg'");
    registerJobQuery.bindValue(":working", true);
    if (!registerJobQuery.exec()) {
        showError(registerJobQuery);
    }

    QSqlQuery query;
    query.prepare("insert into assets "
                  "(name, license, author, version, path, file, externid, image) "
                  "values "
                  "(:name, :license, :author, :version, :path, :file, :externid, :image) "
                  "returning id;");

    for (itr = books.constBegin(); itr != books.constEnd(); ++itr) {
        const Ebook &book = *itr;

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
            writeBookAssetTags(book, assetId);
            ++numBooksWritten;
        }

        int booksProcessed = numBooksWritten + numSkipped;
        if (booksProcessed - lastReport > reportIncrement) {
            double written = booksProcessed;
            int percent = (written/books.count()) * 100;
            qDebug() << "Written "<< percent << "%...";
            lastReport = booksProcessed;
        }
    }

    registerJobQuery.bindValue(":working", false);
    if (!registerJobQuery.exec()) {
        showError(registerJobQuery);
    }

    if (!QSqlDatabase::database().commit()) {
        qWarning() << "Couldn't commit db data!";
    }

    int elapsed = time.elapsed();

    qDebug()<< "Writing took "<< elapsed / 1000. << " secs. Inserted"
            << numBooksWritten << "and skipped" << numSkipped;
}


void GutenbergDatabase::writeBookChannels(const Catalog &catalog)
{
    const QHash<LCC::Category, QString> map = LCC::categoryMap();
    QHash<LCC::Category, QString>::const_iterator itr;
    for (itr = map.constBegin(); itr != map.constEnd(); ++itr) {

        writeChannels(itr.value(), itr.value(), "default/book.png");

        int channel = channelId(
            itr.value(),
            itr.value(),
            booksChannel);
        if (!channel) {
            return;
        }

        m_channelIds[itr.value()] = channel;
    }
}

void GutenbergDatabase::writeBookDeviceChannels(const Catalog &catalog)
{
    QHash<QString, int>::const_iterator itr;
    for (itr = m_channelIds.constBegin(); itr != m_channelIds.constEnd();
         ++itr) {
        const int channelId = itr.value();

        writeDeviceChannels(channelId);
    }

    for (itr = m_extraChannelIds.constBegin();
         itr != m_extraChannelIds.constEnd();
         ++itr) {
        const int channelId = itr.value();

        writeDeviceChannels(channelId);
    }
}

int GutenbergDatabase::bookAssetQuery(const Ebook &book) const
{
    QSqlQuery query;
    query.prepare("select id from assets where "
                  "name=:name and externid=:externid;");

    query.bindValue(":name", book.titles().first());
    query.bindValue(":externid", book.bookId());

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

int GutenbergDatabase::writeBookAsset(const Ebook &book, QSqlQuery &query)
{
    Gutenberg::File epubFile = book.epubFile();
    QFileInfo fi(epubFile.url.path());
    Gutenberg::File coverFile = book.coverImage();

    QString cover = QFileInfo(coverFile.url.path()).fileName();
    if (cover.isEmpty()) {
        cover = QLatin1String("default/book.png");
    }

    cover.prepend("gutenberg/");

    return writeAsset(query, book.titles().first(), QString(), m_licenseId, m_partnerId, QLatin1String("1.0"), epubFile.url.toString(), fi.fileName(), book.bookId(), cover);
}

void GutenbergDatabase::writeBookAssetTags(const Ebook &book, int assetId)
{
    QStringList authors = book.creators();
    foreach (QString author, authors) {
        int authorId = this->authorId(author);
        writeAssetTags(assetId, authorId);
    }

    QStringList contributors = book.contributors();
    foreach (QString contributor, contributors) {
        int contributorId = this->contributorId(contributor);
        writeAssetTags(assetId, contributorId);
    }

    Gutenberg::File epubFile = book.epubFile();
    int mimetypeId = tagId(m_mimetypeTagId,
                           epubFile.format,  &m_mimetypeIds);
    writeAssetTags(assetId, mimetypeId);

    int createdId = tagId(m_createdTagId,
                          book.created(),  &m_createdIds);
    writeAssetTags(assetId, createdId);

    Gutenberg::LCC lcc = book.lcc();
    QStringList lccNames = lcc.topCategories();
    //qDebug()<<"Book = "<< book.titles();
    foreach (QString lccName, lccNames) {
        //qDebug()<<"\tchannelName = "<<lccName;
        Q_ASSERT(m_categoryTagIds.contains(lccName));
        int categoryTagId = m_categoryTagIds[lccName];
        Q_ASSERT(categoryTagId);
        writeAssetTags(assetId, categoryTagId);
    }
}

void GutenbergDatabase::writeBookChannelTags()
{
    QHash<QString, int>::const_iterator itr;
    for (itr = m_channelIds.constBegin(); itr != m_channelIds.constEnd();
        ++itr) {
        Q_ASSERT(m_categoryTagIds.contains(itr.key()));
        int categoryTagId = m_categoryTagIds[itr.key()];
        Q_ASSERT(categoryTagId);

        writeChannelTags(itr.value(), categoryTagId);
    }
}

int GutenbergDatabase::partnerQuery()
{
    QSqlQuery query;
    if (!query.exec("select id from partners "
                    "where name='Project Gutenberg';")) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    return res.toInt();
}

int GutenbergDatabase::languageQuery(const QString &lang)
{
    QSqlQuery query;
    query.prepare("select id from languages where code=:lang;");
    query.bindValue(":lang", lang);
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

int GutenbergDatabase::createLicenseId()
{
    QSqlQuery query;
    if (!query.exec("select id from licenses where name = 'Project Gutenberg License';")) {
        showError(query);
        return 0;
    }

    if (query.first()) {
        return query.value(0).toInt();
    }

    query.prepare("insert into licenses "
                  "(name, text) "
                  "values "
                  "(:licenseName, :licenseText) returning id;");

    query.bindValue(":licenseName",
                    QObject::tr("Project Gutenberg License"));
    query.bindValue(":licenseText",
                    QObject::tr("http://www.gutenberg.org/wiki/Gutenberg:The_Project_Gutenberg_License"));

    if (!query.exec()) {
        showError(query);
    }

    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    return res.toInt();
}

int GutenbergDatabase::categoryId(const QString &name)
{
    int catId = categoryQuery(name);
    if (!catId) {
        catId = categoryCreate(name);
    }
    return catId;
}

int GutenbergDatabase::contributorId(const QString &contributor)
{
    return tagId(m_contributorTagId, contributor, &m_contributorIds);
}

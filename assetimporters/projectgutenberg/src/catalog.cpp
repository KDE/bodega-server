#include "catalog.h"

#include <QDebug>
#include <QFileInfo>
#include <QMap>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QSet>

using namespace Gutenberg;

Catalog::Catalog()
    : m_dirty(false)
{
}

QHash<QString, Gutenberg::Ebook> Catalog::ebooks() const
{
    return m_ebooks;
}

void Catalog::addBook(const Ebook &book)
{
    QString bookId = book.bookId();
    Q_ASSERT(!bookId.isEmpty());
    m_ebooks[bookId] = book;
    m_dirty = true;
}

Gutenberg::Ebook Catalog::bookWithId(const QString &bookId) const
{
    return m_ebooks[bookId];
}

void Catalog::addFile(const File &file)
{
    QString bookId = file.bookId;
    Q_ASSERT(!bookId.isEmpty());
    if (!m_ebooks.contains(bookId)) {
        return;
    }
    Ebook book = m_ebooks[bookId];
    book.addFile(file);
    m_ebooks[bookId] = book;
    m_dirty = true;
}

bool Catalog::isCompiled() const
{
    return m_dirty;
}

void Catalog::compile(const QString &imageCachePath)
{
    QSet<QString> languages;
    QSet<QString> formats;
    QSet<QString> lccs;
    QSet<QString> authors;

    const QFileInfo imageCacheInfo(imageCachePath);
    const bool fetchImages = imageCacheInfo.isDir() && imageCacheInfo.isWritable();
    m_coversToDownload.clear();


    removeNonEpubBooks();

    QHash<QString, Ebook> books = ebooks();
    QHash<QString, Ebook>::const_iterator itr;

    for (itr = books.constBegin(); itr != books.constEnd(); ++itr) {
        const Ebook &book = *itr;
        QStringList langs = book.languages();
        foreach (QString lang, langs) {
            languages.insert(lang);
        }
        if (fetchImages) {
            const QUrl image = book.coverImage().url;
            if (!image.isEmpty()) {
                const QString path = imageCachePath + '/' + QFileInfo(image.path()).fileName();
                if (!QFile::exists(path)) {
                     m_coversToDownload.insert(image, path);
                }
            }
        }
        QList<Gutenberg::File> files = book.files();
        foreach (const Gutenberg::File &file, files) {
            QStringList lst = file.format.split(';');
            Q_ASSERT(!lst.isEmpty());
            formats.insert(lst[0]);
        }
        Gutenberg::LCC xl = book.lcc();
        QStringList l = xl.topCategories();
        foreach (QString lcc, l) {
            lccs.insert(lcc);
        }
        l = book.lcsh();
        foreach (QString lcsh, l) {
            if (m_lcshs[lcsh]) {
                m_lcshs[lcsh] = m_lcshs[lcsh] + 1;
            } else {
                m_lcshs.insert(lcsh, 1);
            }
        }
        l = book.creators();
        foreach (QString creator, l) {
            authors.insert(creator);
        }
    }
    m_languages = languages.values();
    m_authors = authors.values();
    m_formats = formats.values();
    m_lccs = lccs.values();
    dumpDebugInfo();
}

QStringList Catalog::languages() const
{
    return m_languages;
}

QStringList Catalog::authors() const
{
    return m_authors;
}

QHash<QUrl, QString> Catalog::covers() const
{
    return m_coversToDownload;
}

void Catalog::removeNonEpubBooks()
{
    QHash<QString, Gutenberg::Ebook>::iterator itr;
    int numRemoved = 0;

    itr = m_ebooks.begin();
    while (itr != m_ebooks.end()) {
        Ebook book = *itr;
        if (!book.hasEpubFile() || book.rights() != Ebook::Rights_Gutenberg) {
            //qDebug()<<"Erasing "<<book;
            itr = m_ebooks.erase(itr);
            ++numRemoved;
        } else {
            ++itr;
        }
    }
    qDebug() << "Number of non epub and copyrighted ebooks = " << numRemoved;
}

void Catalog::dumpDebugInfo()
{
    QHash<QString, Ebook> books = ebooks();

    qDebug() << "========== Parse Results ==========";
    qDebug() << "Number of books:" << books.count();
    qDebug() << "Number of authors:" << m_authors.count();
    qDebug() << "===================================";

    int i = 0;
#if 0
    foreach (const QString &author, m_authors) {
        qDebug()<< i <<") "<<author;
        ++i;
    }
    i = 0;
    qDebug()<<"---------- Num languages = "<< m_languages.count();
    foreach (const QString &lang, m_languages) {
        qDebug()<< i <<") "<<lang;
        ++i;
    }
    i = 0;
    qDebug()<<"---------- Num formats = "<< m_formats.count();
    foreach (const QString &format, m_formats) {
        qDebug()<< i <<") "<<format;
        ++i;
    }
#endif
#if 0
    i = 0;
    qDebug()<<"---------- Num lcc = "<< m_lccs.count();
    foreach (const QString &lcc, m_lccs) {
        qDebug()<< i <<") "<<lcc;
        ++i;
    }
    i = 0;
    qDebug()<<"---------- Num lcsh = "<< m_lcshs.count();
    {
        QMap<QString, int>::iterator itrx;
        for (itrx = m_lcshs.begin(); itrx != m_lcshs.end(); ++itrx) {
            if (itrx.value() < 100) {
                m_lcshs.erase(itrx);
            }
        }
    }
    QMap<QString, int>::const_iterator itrx;
    qDebug()<<"---------- xxxx Num lcsh = "<< m_lcshs.count();
    for (itrx = m_lcshs.constBegin(); itrx != m_lcshs.constEnd(); ++itrx) {
        qDebug()<< i <<") "<<itrx.key() << " = "<<itrx.value();
        ++i;
        if (i >= 80) {
            break;
        }
    }
#endif
#if 0
    i = 0;
    QHash<QString, Ebook>::const_iterator itr;
    for (itr = books.constBegin(); itr != books.constEnd(); ++itr) {
        const Ebook &book = *itr;
        QStringList l = book.lcsh();
        bool hasCatagory = false;
        foreach (QString lcsh, l) {
            if (m_lcshs.contains(lcsh)) {
                hasCatagory = true;
                break;
            }
        }
        if (!hasCatagory) {
            qDebug() << "Book with no large category: "<<book.titles();
        }
    }
#endif
}

FileFetcher::FileFetcher(const Catalog &catalog, QObject *parent)
    : QObject(parent),
      m_network(new QNetworkAccessManager(this)),
      m_coversToDownload(catalog.covers()),
      m_coversIt(m_coversToDownload),
      m_progress(m_coversToDownload.count())
{
    qDebug() << "About to download" << m_progress << "covers .. this could take a while";
}

void FileFetcher::fetchCovers()
{
    //qDebug() << "fetching covers...";
    if (!m_coversIt.hasNext()) {
        //qDebug() << "we are DONE!";
        emit coversFetched();
        return;
    }

    int i = 0;
    while (i < 4 && m_coversIt.hasNext()) {
        m_coversIt.next();
        QFile *cover = new QFile(m_coversIt.value());
        if (!cover->open(QIODevice::Truncate | QIODevice::WriteOnly)) {
            qDebug() << "failed to open" << m_coversIt.value();
            delete cover;
            continue;
        }

        ++i;
        --m_progress;
        if (m_progress % 50 == 0) {
            qDebug() << "..." << m_progress << "more covers to go!";
        }

        //qDebug() << "downloading" << m_coversIt.key() << "to" << m_coversIt.value();
        QNetworkReply *reply = m_network->get(QNetworkRequest(m_coversIt.key()));
        connect(reply, SIGNAL(finished()), this, SLOT(coverFetchFinished()));
        connect(reply, SIGNAL(readyRead()), this, SLOT(coverDataRecvd()));
        m_coversBeingFetched.insert(reply, cover);
    }

    if (i == 0) {
        emit coversFetched();
    }
}

void FileFetcher::coverFetchFinished()
{
    QNetworkReply *reply = qobject_cast<QNetworkReply *>(sender());
    //qDebug() << "CfF" << reply << sender();
    if (!reply) {
        return;
    }

    QFile *cover = m_coversBeingFetched.value(reply);
    if (!cover) {
        return;
    }

    delete cover;
    m_coversBeingFetched.remove(reply);
    reply->deleteLater();

    if (m_coversBeingFetched.isEmpty()) {
        fetchCovers();
    }
}

void FileFetcher::coverDataRecvd()
{
    QNetworkReply *reply = qobject_cast<QNetworkReply *>(sender());
    //qDebug() << "CRD" << reply << sender();
    if (!reply) {
        return;
    }

    QFile *cover = m_coversBeingFetched.value(reply);
    if (!cover) {
        // shouldn't happen though
        coverFetchFinished();
        return;
    }

    //qDebug() << "writing! ";
    cover->write(reply->readAll());
}

#include <catalog.moc>



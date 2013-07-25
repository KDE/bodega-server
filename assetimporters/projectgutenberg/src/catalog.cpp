/* 
    Copyright 2012 Coherent Theory LLC

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

#include "catalog.h"

#include <QDebug>
#include <QFileInfo>
#include <QMap>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QSet>

using namespace Gutenberg;

Catalog::Catalog()
    : m_clean(false)
{
}

bool Catalog::isCompiled() const
{
    return m_clean;
}

void Catalog::compile(const QString &imageCachePath)
{
    QSet<QString> languages;
    QSet<QString> formats;
    QSet<QString> topLccs;
    QSet<QString> subLccs;
    QSet<QString> authors;

    const QFileInfo imageCacheInfo(imageCachePath);
    const bool fetchImages = imageCacheInfo.isDir() && imageCacheInfo.isWritable();
    m_coversToDownload.clear();


    removeNonEpubBooks();

    QListIterator<Ebook> itr(m_ebooks);

    while (itr.hasNext()) {
        const Ebook &book = itr.next();
        QStringList langs = book.languages();
        foreach (QString lang, langs) {
            languages.insert(lang);
        }
        if (fetchImages) {
            const QUrl image = book.coverImage();
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
        Gutenberg::LCC lcc = book.lcc();
        QHash<QString, QStringList> cats = lcc.categories();
        QHashIterator<QString, QStringList> catIt(cats);
        while (catIt.hasNext()) {
            catIt.next();
            topLccs.insert(catIt.key());

            foreach (const QString lcc, catIt.value()) {
                subLccs.insert(lcc);
            }
        }

        QStringList l = lcc.subjects();
        foreach (const QString &lcsh, l) {
            if (m_lcshs[lcsh]) {
                m_lcshs[lcsh] = m_lcshs[lcsh] + 1;
            } else {
                m_lcshs.insert(lcsh, 1);
            }
        }

        l = book.authors();
        foreach (const QString &author, l) {
            authors.insert(author);
        }
    }

    m_languages = languages.values();
    m_formats = formats.values();
    m_lccs = topLccs.values();
    m_subLccs = subLccs.values();
    m_authors = authors.values();
    dumpDebugInfo();
    m_clean = true;
}

QStringList Catalog::topLevelCategories() const
{
    return m_lccs;
}

QStringList Catalog::subCategories() const
{
    return m_subLccs;
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
    QMutableListIterator<Gutenberg::Ebook> itr(m_ebooks);
    int numRemoved = 0;

    while (itr.hasNext()) {
        const Ebook &book = itr.next();
        if (!book.hasEpubFile() || book.rights() != Ebook::Rights_Gutenberg) {
            //qDebug()<<"Erasing "<<book;
            itr.remove();
            ++numRemoved;
        }
    }
    qDebug() << "Number of non epub and copyrighted ebooks = " << numRemoved;
}

void Catalog::dumpDebugInfo()
{
    qDebug() << "========== Parse Results ==========";
    qDebug() << "Number of books:" << m_ebooks.count();
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
    if (m_progress > 0) {
        qDebug() << "About to download" << m_progress << "covers .. this could take a while";
    }
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



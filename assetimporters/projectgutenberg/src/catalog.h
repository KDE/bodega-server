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

#ifndef CATALOG_H
#define CATALOG_H

#include "ebook.h"

#include <QObject>
#include <QHash>

class QFile;
class QNetworkAccessManager;
class QNetworkReply;
class QXmlStreamReader;

namespace Gutenberg
{

class Catalog
{
public:
    Catalog();

    void addBook(const Ebook &book);

    bool isCompiled() const;
    void compile(const QString &imageCachePath);

    QStringList languages() const;
    QStringList authors() const;
    QHash<QUrl, QString> covers() const;

    QList<Gutenberg::Ebook> m_ebooks;

private:
    void removeNonEpubBooks();
    void dumpDebugInfo();

private:
    bool m_dirty;
    QStringList m_languages;
    QStringList m_authors;
    QStringList m_formats;
    QStringList m_lccs;
    QHash<QString, int> m_lcshs;
    QHash<QUrl, QString> m_coversToDownload;
};

class FileFetcher : public QObject
{
    Q_OBJECT

public:
    FileFetcher(const Catalog &catalog, QObject *parent = 0);

public Q_SLOTS:
    void fetchCovers();

Q_SIGNALS:
    void coversFetched();

private Q_SLOTS:
    void coverFetchFinished();
    void coverDataRecvd();

private:
    QHash<QUrl, QString> m_coversToDownload;
    QHashIterator<QUrl, QString> m_coversIt;
    QHash<QNetworkReply *, QFile *> m_coversBeingFetched;
    QNetworkAccessManager *m_network;
    int m_progress;
};

}

#endif

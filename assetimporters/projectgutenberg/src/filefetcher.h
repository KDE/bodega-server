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

#ifndef FILEFETCHER_H
#define FILEFETCHER_H

#include <QtCore>

class Catalog;
class QFile;
class QNetworkAccessManager;
class QNetworkReply;

#include "catalog.h"

namespace Gutenberg
{

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

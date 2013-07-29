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

#include "filefetcher.h"

#include <QtNetwork>

using namespace Gutenberg;

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

#include <filefetcher.moc>



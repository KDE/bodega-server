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
#include "gutenbergdatabase.h"

#include "reader.h"

#include <QtCore>

QStringList paths;
Gutenberg::Catalog catalog;

#define TESTING 1

void descend(const QString &path)
{
    QDir dir(path);
    const QString absPath = dir.absolutePath() + '/';
    //qDebug() << "dir:" << path;
    int count = 0;
    foreach (const QString subdir, dir.entryList(QDir::AllDirs | QDir::NoDotAndDotDot)) {
        //qDebug() << "dirs are" << absPath << subdir;
        descend(absPath + subdir);
#ifdef TESTING
        ++count;
        if (count > 10) {
            break;
        }
#endif
    }

    foreach (const QString file, dir.entryList(QStringList() << "*.rdf", QDir::Files)) {
        //qDebug() << absPath + file;
        paths.append(absPath + file);
    }
}

void addEbook(const Gutenberg::Ebook &book)
{
    if (book.title().isEmpty()) {
        qDebug() << "no title on book" << book.bookId();
        return;
    }

#ifdef TESTING
    qDebug() << book;
#endif
}

int main(int argc, char **argv)
{
    if (argc < 2) {
        qWarning() << "Usage:";
        qWarning() << "\t" << argv[0] << "path/to/epub/files [imageCacheDir]";
        return 0;
    }

    Gutenberg::Catalog catalog;
    descend(argv[1]);
    qDebug() << "we have" << paths.size() << "files to process now";
    paths <<
        "/home/aseigo/kdesrc/extragear/network/bodega-server/assetimporters/projectgutenberg/rdf/cache/epub/10040/pg10040.rdf";

    foreach (const QString &path, paths) { qDebug() << path; }
    Gutenberg::Reader::init();
    catalog.m_ebooks = QtConcurrent::blockingMapped<QList<Gutenberg::Ebook> >(paths, Gutenberg::Reader::parseRdf);
    catalog.compile(argc > 2 ? QString::fromLatin1(argv[2]) : QString());
    qDebug() << "we have" << catalog.m_ebooks.size() << "books to process now";

    Gutenberg::GutenbergDatabase::write(catalog, argv[2], true);
    return 1;

    QCoreApplication app(argc, argv);
    /*
    if (argc > 2) {
        // only fetch if we were given a cache dir
        Gutenberg::FileFetcher *fetcher = new Gutenberg::FileFetcher(catalog);
        QObject::connect(fetcher, SIGNAL(coversFetched()), &app, SLOT(quit()));
        QTimer::singleShot(0, fetcher, SLOT(fetchCovers()));
    }*/
    return app.exec();
}

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
#include "filefetcher.h"
#include "gutenbergdatabase.h"
#include "reader.h"

#include <QtCore>

QStringList paths;
Gutenberg::Catalog catalog;

//#define TESTING 1

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
        if (count > 10000) {
            break;
        }
#endif
    }

    foreach (const QString file, dir.entryList(QStringList() << "*.rdf", QDir::Files)) {
        //qDebug() << absPath + file;
        paths.append(absPath + file);
    }
}

int main(int argc, char **argv)
{
    if (argc < 3) {
        qWarning() << "Usage:";
        qWarning() << "\t" << argv[0] << "rdfFilesPath bodegaContentPath epubRepositoryPath";
        return 0;
    }

    QTime t;
    t.start();

    Gutenberg::Catalog catalog;
    descend(argv[1]);
    qDebug() << "Found" << paths.size() << "RDF files to process in" << t.restart() / 1000. << "seconds";

#ifdef TESTING
    //foreach (const QString &path, paths) { qDebug() << path; }
#endif

    Gutenberg::Reader::init();
    catalog.m_ebooks = QtConcurrent::blockingMapped<QList<Gutenberg::Ebook> >(paths, Gutenberg::Reader::parseRdf);
    qDebug() << "Parsed" << catalog.m_ebooks.size() << "books in" << t.restart() / 1000. << "seconds";
    catalog.compile(QString());
    qDebug() << "Compiled" << catalog.m_ebooks.size() << "books in" << t.restart() / 1000. << "seconds";

    Gutenberg::GutenbergDatabase::write(catalog, argv[2], argv[3],
#ifdef TESTING
            true
#else
            false
#endif
            );

    /*
     * better to just grab the images from the mirrored content
    if (argc > 2) {
        // only fetch if we were given a cache dir
        QCoreApplication app(argc, argv);
        Gutenberg::FileFetcher *fetcher = new Gutenberg::FileFetcher(catalog);
        QObject::connect(fetcher, SIGNAL(coversFetched()), &app, SLOT(quit()));
        QTimer::singleShot(0, fetcher, SLOT(fetchCovers()));
        return app.exec();
    } else {
        return 0;
    }
    */
}

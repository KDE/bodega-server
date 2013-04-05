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
#include "database.h"
#include "parser.h"

#include <QtCore>


int main(int argc, char **argv)
{
    if (argc < 2) {
        qWarning() << "Usage:";
        qWarning() << "\t" << argv[0] << "catalog.rdf [imageCacheDir]";
        return 0;
    }

    QCoreApplication app(argc, argv);
    Gutenberg::Catalog catalog = Gutenberg::Parser::parse(QString::fromLatin1(argv[1]));
    catalog.compile(argc > 2 ? QString::fromLatin1(argv[2]) : QString());

    Gutenberg::Database::write(catalog, false);

    if (argc > 2) {
        // only fetch if we were given a cache dir
        Gutenberg::FileFetcher *fetcher = new Gutenberg::FileFetcher(catalog);
        QObject::connect(fetcher, SIGNAL(coversFetched()), &app, SLOT(quit()));
        QTimer::singleShot(0, fetcher, SLOT(fetchCovers()));

        return app.exec();
    }
}

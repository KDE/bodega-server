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

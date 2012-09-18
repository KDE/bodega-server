#include "database.h"
#include "catalog.h"

#include <QtCore>


int main(int argc, char **argv)
{
    QCoreApplication app(argc, argv);

    if (argc < 2) {
        qWarning() << "Usage:";
        qWarning() << "\t"<< argv[0] << "uncompressed wallpapers dir";
        exit(1);
    }

    Catalog catalog(argv[1]);

    //TODO: make the write delete the data based on a command line switch
    Database::write(catalog, false);

    return app.exec();
}

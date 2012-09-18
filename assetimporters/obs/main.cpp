#include "packagedatabase.h"

#include <QtCore>


int main(int argc, char **argv)
{
    QCoreApplication app(argc, argv);

    if (argc < 4) {
        qWarning() << "Usage:";
        qWarning() << "\t"<< argv[0] << "<Channels descriptor ini file> <packages ini file> <server asset path>";
        exit(1);
    }


    PackageDatabase db(argv[1], argv[2], argv[3]);
    db.write(false);

    return app.exec();
}

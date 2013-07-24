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
    db.write();

    return app.exec();
}

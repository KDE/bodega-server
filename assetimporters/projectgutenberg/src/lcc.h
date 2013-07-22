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

#ifndef LCC_H
#define LCC_H

#include <QtCore>

namespace Gutenberg
{

/*
 * http://www.loc.gov/catdir/cpso/lcco/
 * http://en.wikipedia.org/wiki/Library_of_Congress_Classification
 */

class LCC
{
public:
    LCC();

    void setCategories(const QStringList &lccCodes);
    QHash<QString, QStringList> categories() const;

    void setSubjects(const QStringList &subjects);
    QStringList subjects() const;

private:
    void addCategory(const QString &code);
    QStringList generalSubCats(const QString &code);
    QString bSubCats(const QString &code, QStringList &subs);
    QStringList cSubCats(const QString &code);

    void refineUsingSubjects();

    QHash<QString, QStringList> m_categories;
    QStringList m_subjects;
    bool m_refinementPending;
};

}

#endif

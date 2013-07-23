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
    QString aSubCats(const QString &code);
    QString bSubCats(const QString &code, QString &subCat);
    QString cSubCats(const QString &code);
    QString dSubCats(const QString &code);
    QString eSubCats(const QString &code);
    QString fSubCats(const QString &code);
    QString gSubCats(const QString &code);
    QString hSubCats(const QString &code);
    QString jSubCats(const QString &code);
    QString kSubCats(const QString &code);
    QString lSubCats(const QString &code);
    QString mSubCats(const QString &code);
    QString nSubCats(const QString &code);
    QString pSubCats(const QString &code);
    QString qSubCats(const QString &code);
    QString rSubCats(const QString &code);
    QString sSubCats(const QString &code);
    QString tSubCats(const QString &code);
    QString uSubCats(const QString &code);
    QString vSubCats(const QString &code);
    QString zSubCats(const QString &code);

    void refineUsingSubjects();

    QHash<QString, QStringList> m_categories;
    QStringList m_subjects;
    bool m_refinementPending;
};

}

#endif

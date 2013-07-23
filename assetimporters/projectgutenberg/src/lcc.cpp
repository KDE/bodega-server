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

#include "lcc.h"

#include <QLocale>
#include <QDebug>

using namespace Gutenberg;

LCC::LCC()
    : m_refinementPending(false)
{
}

QHash<QString, QStringList> LCC::categories() const
{
    return m_categories;
}

QString LCC::aSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'c':
            return QString::fromLatin1("Collections");
            break;
        case 'e':
            return QString::fromLatin1("Encyclopedias");
            break;
        case 'g':
            return QString::fromLatin1("Dictionaries");
            break;
        case 'i':
            return QString::fromLatin1("Indexes");
            break;
        case 'm':
            return QString::fromLatin1("Museums and collecting");
            break;
        case 'n':
            return QString::fromLatin1("Newspapers");
            break;
        case 'p':
            return QString::fromLatin1("Periodicals");
            break;
        case 's':
            return QString::fromLatin1("Academies");
            break;
        case 'y':
            return QString::fromLatin1("Yearbooks and almanacs");
            break;
        case 'z':
            return QString::fromLatin1("History of scholarship");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::bSubCats(const QString &code, QString &subCat)
{
    QString cat(QLatin1String("Religion"));
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'c':
            cat = QString::fromLatin1("Philosophy");
            subCat = QString::fromLatin1("Logic");
            break;
        case 'd':
            cat = QString::fromLatin1("Philosophy");
            subCat = QString::fromLatin1("Speculative");
            break;
        case 'f':
            cat = QString::fromLatin1("Psychology");
            break;
        case 'h':
            cat = QString::fromLatin1("Philosophy");
            subCat = QString::fromLatin1("Aesthetics");
            break;
        case 'j':
            cat = QString::fromLatin1("Philosophy");
            subCat = QString::fromLatin1("Ethics");
            break;
        case 'l':
            subCat = QString::fromLatin1("General");
            m_refinementPending = true;
            break;
        case 'm':
            subCat = QString::fromLatin1("Judaism");
            break;
        case 'p':
            subCat = QString::fromLatin1("Islam");
            m_refinementPending = true;
            break;
        case 'q':
            subCat = QString::fromLatin1("Buddhism");
            break;
        case 'r':
        case 'x':
            subCat = QString::fromLatin1("Christianity");
            break;
        case 's':
            subCat = QString::fromLatin1("The Bible");
            break;
        case 't':
        case 'v':
            subCat = QString::fromLatin1("Theology");
            break;
        default:
            cat = QString::fromLatin1("Philosophy");
            subCat = QString::fromLatin1("General");
            break;
    }

    return cat;
}

QString LCC::cSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'b':
            return QString::fromLatin1("Civilization");
            break;
        case 'c':
            return QString::fromLatin1("Archeology");
            break;
        case 'd':
            return QString::fromLatin1("Diplomatics");
            break;
        case 'e':
            return QString::fromLatin1("Chronology");
            break;
        case 'j':
            return QString::fromLatin1("Numismatics");
            break;
        case 'n':
            return QString::fromLatin1("Inscriptions");
            break;
        case 'r':
            return QString::fromLatin1("Heraldry");
            break;
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::dSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::eSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::fSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::gSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::hSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::jSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::kSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::lSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::mSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::nSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::pSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::qSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::rSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::sSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::tSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::uSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::vSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

QString LCC::zSubCats(const QString &code)
{
    QStringList subs;
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 's':
            return QString::fromLatin1("Geneology");
            break;
        default:
            break;
    }

    return QString();
}

void LCC::setCategories(const QStringList &lccCodes)
{
    m_categories.clear();

    foreach (const QString &code, lccCodes) {
        addCategory(code);
    }
}

void LCC::addCategory(const QString &code)
{
    if (code.isEmpty()) {
        return;
    }

    char firstCharacter = code[0].toLower().toAscii();
    QString sub;
    QString cat;

    switch (firstCharacter) {
    case 'a':
        cat = QLatin1String("General");
        sub = aSubCats(code);
        break;
    case 'b':
        cat = bSubCats(code, sub);
        break;
    case 'c':
        if (code.toLower() == QLatin1String("ct")) {
            cat = QString::fromLatin1("Biographies");
        } else {
            cat = QString::fromLatin1("History");
            sub = cSubCats(code);
        }
        break;
    case 'd':
        cat = QString::fromLatin1("History");
        sub = dSubCats(code);
        break;
    case 'e':
        break;
    case 'f':
        break;
    case 'g':
        break;
    case 'h':
        break;
    case 'j':
        break;
    case 'k':
        break;
    case 'l':
        break;
    case 'm':
        break;
    case 'n':
        break;
    case 'p':
        break;
    case 'q':
        break;
    case 'r':
        break;
    case 's':
        break;
    case 't':
        break;
    case 'u':
        break;
    case 'v':
        break;
    case 'z':
        break;
    default:
        qDebug() << "Unrecognized lcc class = " << code;
        break;
    }

    if (!cat.isEmpty()) {
        refineUsingSubjects();
        m_categories[cat].append(sub);
    }
}

void LCC::setSubjects(const QStringList &subjects)
{
    m_subjects = subjects;
    refineUsingSubjects();
}

QStringList LCC::subjects() const
{
    return m_subjects;
}

void LCC::refineUsingSubjects()
{
    if (!m_refinementPending || m_subjects.isEmpty() || m_categories.isEmpty()) {
        return;
    }

    m_refinementPending = false;

    const QString religion(QLatin1String("Religion"));
    if (m_categories.contains(religion)) {
        const QString islam(QLatin1String("Islam"));
        const QRegExp bahaiRE(QLatin1String("Baha[']?i"));
        const QString bahai(QLatin1String("Baha'i"));
        const QString theosophyStem(QLatin1String("Theoso"));
        const QString theosophy(QLatin1String("Theosophy"));
        const QString general(QLatin1String("General"));
        const QString taoismStem(QLatin1String("Tao"));
        const QString taoism(QLatin1String("Taoism"));

        QStringList subs = m_categories.value(religion);
        if (subs.contains(islam)) {
            foreach (const QString &subject, m_subjects) {
                if (subject.contains(bahaiRE)) {
                    subs.removeAll(islam);
                    subs.append(bahai);
                    break;
                } else if (subs.contains(theosophyStem)) {
                    subs.removeAll(islam);
                    subs.append(theosophy);
                    break;
                }
            }
        } else if (subs.contains(general)) {
            foreach (const QString &subject, m_subjects) {
                if (subject.contains(taoismStem)) {
                    subs.removeAll(general);
                    subs.append(taoism);
                    break;
                }
            }
        }

        m_categories[religion] = subs;
    }
}


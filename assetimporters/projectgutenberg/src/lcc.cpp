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

QStringList LCC::generalCats(const QString &lcc)
{
    QStringList cats;
    char sub = lcc.size() > 1 ? lcc[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'c':
            cats << QString::fromLatin1("Collections");
            break;
        case 'e':
            cats << QString::fromLatin1("Encyclopedias");
            break;
        case 'g':
            cats << QString::fromLatin1("Dictionaries");
            break;
        case 'i':
            cats << QString::fromLatin1("Indexes");
            break;
        case 'm':
            cats << QString::fromLatin1("Museums and collecting");
            break;
        case 'n':
            cats << QString::fromLatin1("Newspapers");
            break;
        case 'p':
            cats << QString::fromLatin1("Periodicals");
            break;
        case 's':
            cats << QString::fromLatin1("Academies");
            break;
        case 'y':
            cats << QString::fromLatin1("Yearbooks and almanacs");
            break;
        case 'z':
            cats << QString::fromLatin1("History of scholarship");
            break;
        default:
            break;
    }

    return cats;
}

QString LCC::parseBCat(const QString &code, QStringList &subs)
{
    QString cat(QLatin1String("Religion"));
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'c':
            cat = QString::fromLatin1("Philosophy");
            subs << QString::fromLatin1("Logic");
            break;
        case 'd':
            cat = QString::fromLatin1("Philosophy");
            subs << QString::fromLatin1("Speculative");
            break;
        case 'f':
            cat = QString::fromLatin1("Psychology");
            break;
        case 'h':
            cat = QString::fromLatin1("Philosophy");
            subs << QString::fromLatin1("Aesthetics");
            break;
        case 'j':
            cat = QString::fromLatin1("Philosophy");
            subs << QString::fromLatin1("Ethics");
            break;
        case 'l':
            subs << QString::fromLatin1("General");
            m_refinementPending = true;
            break;
        case 'm':
            subs << QString::fromLatin1("Judaism");
            break;
        case 'p':
            subs << QString::fromLatin1("Islam");
            m_refinementPending = true;
            break;
        case 'q':
            subs << QString::fromLatin1("Buddhism");
            break;
        case 'r':
        case 'x':
            subs << QString::fromLatin1("Christianity");
            break;
        case 's':
            subs << QString::fromLatin1("The Bible");
            break;
        case 't':
        case 'v':
            subs << QString::fromLatin1("Theology");
            break;
        default:
            cat = QString::fromLatin1("Philosophy");
            subs << QString::fromLatin1("General");
            break;
    }

    refineUsingSubjects();
    return cat;
}

void LCC::setCategories(const QStringList &lccCodes)
{
    m_categories.clear();

    foreach (const QString &code, lccCodes) {
        parseCategory(code);
    }
}

void LCC::parseCategory(const QString &lcc)
{
    if (lcc.isEmpty()) {
        return;
    }

    char firstCharacter = lcc[0].toLower().toAscii();

    switch (firstCharacter) {
    case 'a':
        m_categories["General"].append(generalCats(lcc));
        break;
    case 'b': {
        QStringList subs;
        const QString cat = parseBCat(lcc, subs);

        if (!cat.isEmpty()) {
            m_categories[cat].append(subs);
        }
    }
        break;
    case 'c':
        break;
    case 'd':
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
        qDebug()<<"Unrecognized lcc class = "<<lcc;
        break;
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


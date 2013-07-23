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

    return QString::fromLatin1("General");
}

QString LCC::bSubCats(const QString &code, QString &cat)
{
    cat = QString::fromLatin1("Religion");
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'c':
            cat = QString::fromLatin1("Philosophy");
            return QString::fromLatin1("Logic");
            break;
        case 'd':
            cat = QString::fromLatin1("Philosophy");
            return QString::fromLatin1("Speculative");
            break;
        case 'f':
            cat = QString::fromLatin1("Psychology");
            break;
        case 'h':
            cat = QString::fromLatin1("Philosophy");
            return QString::fromLatin1("Aesthetics");
            break;
        case 'j':
            cat = QString::fromLatin1("Philosophy");
            return QString::fromLatin1("Ethics");
            break;
        case 'l':
            m_refinementPending = true;
            return QString::fromLatin1("General");
            break;
        case 'm':
            return QString::fromLatin1("Judaism");
            break;
        case 'p':
            m_refinementPending = true;
            return QString::fromLatin1("Islam");
            break;
        case 'q':
            return QString::fromLatin1("Buddhism");
            break;
        case 'r':
        case 'x':
            return QString::fromLatin1("Christianity");
            break;
        case 's':
            return QString::fromLatin1("The Bible");
            break;
        case 't':
        case 'v':
            return QString::fromLatin1("Theology");
            break;
        default:
            cat = QString::fromLatin1("Philosophy");
            break;
    }

    return QString::fromLatin1("General");
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

    return QString::fromLatin1("General");
}

QString LCC::dSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'a':
            if (code.size() > 2) {
                //DAW
                return QString::fromLatin1("Central Europe");
            }

            return QString::fromLatin1("Great Britain");
            break;
        case 'b':
            return QString::fromLatin1("Central Europe");
            break;
        case 'c':
            return QString::fromLatin1("France");
            break;
        case 'd':
            return QString::fromLatin1("Germany");
            break;
        case 'e':
            return QString::fromLatin1("Greco-Roman World");
            break;
        case 'f':
            return QString::fromLatin1("Greece");
            break;
        case 'g':
            return QString::fromLatin1("Italy");
            break;
        case 'h':
        case 'j':
            if (code.size() > 2) {
                // DJK
                return QString::fromLatin1("Eastern Europe");
            }

            return QString::fromLatin1("Benelux");
            break;
        case 'k':
            return QString::fromLatin1("Russia");
            break;
        case 'l':
            return QString::fromLatin1("Scandanavia");
            break;
        case 'p':
            return QString::fromLatin1("Spain and Portugal");
            break;
        case 'q':
            return QString::fromLatin1("Switzerland");
            break;
        case 'r':
            return QString::fromLatin1("Balkans");
            break;
        case 's':
            return QString::fromLatin1("Asia");
            break;
        case 't':
            return QString::fromLatin1("Africa");
            break;
        case 'u':
            return QString::fromLatin1("Oceania");
            break;
        case 'x':
            return QString::fromLatin1("Romanies");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::fSubCats(const QString &code)
{
    if (code.size() < 2) {
        return QString();
    }

    bool ok;
    int number = code.right(code.size() - 1).toInt(&ok);
    if (!ok || number < 1) {
        return QString();
    }

    if (number <= 975) {
        return QString::fromLatin1("United States");
    }

    if (number <= 1145) {
        return QString::fromLatin1("Canada");
    }

    if (number <= 1170) {
        return QString::fromLatin1("French America");
    }

    if (number <= 3799) {
        return QString::fromLatin1("Latin America");
    }

    return QString::fromLatin1("General");
}

QString LCC::gSubCats(const QString &code, QString &cat)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;
    cat = QString::fromLatin1("Geography");

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Cartography");
            break;
        case 'b':
            return QString::fromLatin1("Geology and Hydrology");
            break;
        case 'c':
            return QString::fromLatin1("Oceanography");
            break;
        case 'e':
            cat = QString::fromLatin1("Science");
            return QString::fromLatin1("Environmental");
            break;
        case 'f':
        case 'n':
        case 't':
            cat = QString::fromLatin1("Anthropology");
            break;
        case 'r':
            cat = QString::fromLatin1("Folklore");
            break;
        case 'v':
            cat = QString::fromLatin1("Recreation and Leisure");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::hSubCats(const QString &code, QString &cat)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;
    cat = QString::fromLatin1("Social Sciences");

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Statistics");
            break;
        case 'b':
            cat = QString::fromLatin1("Economics");
            return QString::fromLatin1("Theory");
            break;
        case 'c':
            cat = QString::fromLatin1("Economics");
            return QString::fromLatin1("History");
            break;
        case 'd':
            return QString::fromLatin1("Industry and Labor");
            break;
        case 'e':
            return QString::fromLatin1("Transportation and Communication");
            break;
        case 'f':
            cat = QString::fromLatin1("Economics");
            return QString::fromLatin1("Commerce");
            break;
        case 'g':
            cat = QString::fromLatin1("Economics");
            return QString::fromLatin1("Finance (Private)");
            break;
        case 'j':
            cat = QString::fromLatin1("Economics");
            return QString::fromLatin1("Finance (Public)");
            break;
        case 'm':
            return QString::fromLatin1("Sociology");
            break;
        case 'n':
            return QString::fromLatin1("Social history");
            break;
        case 'q':
            return QString::fromLatin1("Family and Marriage");
            break;
        case 's':
            return QString::fromLatin1("Societies");
            break;
        case 't':
            return QString::fromLatin1("Communities");
            break;
        case 'v':
            return QString::fromLatin1("Pathology and Criminology");
            break;
        case 'x':
            return QString::fromLatin1("Socialism and Communism");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::jSubCats(const QString &code, QString &cat)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;
    cat = QString::fromLatin1("Political Science");

    switch (sub) {
        case 'a':
            return QString::fromLatin1("General");
            break;
        case 'c':
            return QString::fromLatin1("Theory");
            break;
        case 'f':
        case 'j':
        case 'k':
        case 'l':
        case 'n':
        case 'q':
            return QString::fromLatin1("Government (National)");
            break;
        case 's':
            return QString::fromLatin1("Government (Local)");
            break;
        case 'v':
            return QString::fromLatin1("Immigration");
            break;
        case 'x':
            cat = QString::fromLatin1("Law");
            return QString::fromLatin1("International");
            break;
        case 'z':
            return QString::fromLatin1("International Relations");
            break;
        default:
            break;
    }

    return QString::fromLatin1("Legislative and executive papers");
}

QString LCC::kSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'b':
            return QString::fromLatin1("Religious");
            break;
        case 'd':
            if (code.size() > 2 && code[2].toLower().toAscii() == 'z') {
                return QString::fromLatin1("Americas");
            }
            return QString::fromLatin1("United Kingdom and Ireland");
            break;
        case 'e':
            return QString::fromLatin1("Canada");
            break;
        case 'f':
            return QString::fromLatin1("United States");
            break;
        case 'g':
            return QString::fromLatin1("Central America");
            break;
        case 'h':
            return QString::fromLatin1("South America");
            break;
        case 'j':
            return QString::fromLatin1("Europe");
            break;
        case 'l':
            return QString::fromLatin1("Asia and Africa");
            break;
        case 'z':
            return QString::fromLatin1("National");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::lSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'a':
            return QString::fromLatin1("History");
            break;
        case 'b':
            return QString::fromLatin1("Theory and Practice");
            break;
        case 'c':
            return QString::fromLatin1("General");
            break;
        case 'd':
        case 'e':
        case 'f':
        case 'g':
            return QString::fromLatin1("Individual Institutions");
            break;
        case 'h':
            return QString::fromLatin1("School Periodicals");
            break;
        case 'j':
            return QString::fromLatin1("Fraternities and Societies");
            break;
        case 't':
            return QString::fromLatin1("Textbooks");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::mSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'l':
            return QString::fromLatin1("Literature");
            break;
        case 't':
            return QString::fromLatin1("Instruction");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::nSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Architecture");
            break;
        case 'b':
            return QString::fromLatin1("Sculpture");
            break;
        case 'c':
            return QString::fromLatin1("Drawing and Illustration");
            break;
        case 'd':
            return QString::fromLatin1("Painting");
            break;
        case 'e':
            return QString::fromLatin1("Print");
            break;
        case 'k':
            return QString::fromLatin1("Decorative");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::pSubCats(const QString &code, QString &cat)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;
    cat = QString::fromLatin1("Linguistics");

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Greek");
            break;
        case 'b':
            return QString::fromLatin1("Modern");
            break;
        case 'c':
            return QString::fromLatin1("Romance");
            break;
        case 'd':
        case 'f':
            return QString::fromLatin1("Germanic");
            break;
        case 'e':
            return QString::fromLatin1("English");
            break;
        case 'g':
            return QString::fromLatin1("Slavic");
            break;
        case 'h':
            return QString::fromLatin1("Uralic and Basque");
            break;
        case 'j':
            return QString::fromLatin1("Oriental");
            break;
        case 'k':
            return QString::fromLatin1("Indo-Iranian");
            break;
        case 'l':
            return QString::fromLatin1("African and Oceania");
            break;
        case 'm':
            return QString::fromLatin1("Indian");
            break;
        case 'n':
            cat = QString::fromLatin1("Literature");
            return QString::fromLatin1("General");
            break;
        case 'q':
            cat = QString::fromLatin1("Literature");
            return QString::fromLatin1("Romance Languages");
            break;
        case 'r':
            cat = QString::fromLatin1("Literature");
            return QString::fromLatin1("English");
            break;
        case 's':
            cat = QString::fromLatin1("Literature");
            return QString::fromLatin1("American");
            break;
        case 't':
            cat = QString::fromLatin1("Literature");
            return QString::fromLatin1("Germanic");
            break;
        case 'z':
            cat = QString::fromLatin1("Literature");
            return QString::fromLatin1("Fiction");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::qSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Mathematics");
            break;
        case 'b':
            return QString::fromLatin1("Astronomy");
            break;
        case 'c':
            return QString::fromLatin1("Physics");
            break;
        case 'd':
            return QString::fromLatin1("Chemistry");
            break;
        case 'e':
            return QString::fromLatin1("Geology");
            break;
        case 'h':
            return QString::fromLatin1("Biology");
            break;
        case 'k':
            return QString::fromLatin1("Botany");
            break;
        case 'l':
            return QString::fromLatin1("Zoology");
            break;
        case 'm':
            return QString::fromLatin1("Human Anatomy");
            break;
        case 'p':
            return QString::fromLatin1("Physiology");
            break;
        case 'r':
            return QString::fromLatin1("Microbiology");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::rSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Public Medicine");
            break;
        case 'b':
            return QString::fromLatin1("Pathology");
            break;
        case 'c':
            return QString::fromLatin1("Internal Medicine");
            break;
        case 'd':
            return QString::fromLatin1("Surgery");
            break;
        case 'e':
            return QString::fromLatin1("Opthalmology");
            break;
        case 'f':
            return QString::fromLatin1("Otorhinolaryngology");
            break;
        case 'g':
            return QString::fromLatin1("Genycology and Obstetrics");
            break;
        case 'j':
            return QString::fromLatin1("Pediatrics");
            break;
        case 'k':
            return QString::fromLatin1("Dentistry");
            break;
        case 'l':
            return QString::fromLatin1("Dermatology");
            break;
        case 'm':
        case 's':
            return QString::fromLatin1("Pharmacology");
            break;
        case 't':
            return QString::fromLatin1("Nursing");
            break;
        case 'v':
        case 'x':
        case 'z':
            return QString::fromLatin1("Alternative Medicine");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::sSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'b':
            return QString::fromLatin1("Plant Culture");
            break;
        case 'd':
            return QString::fromLatin1("Forestry");
            break;
        case 'f':
            return QString::fromLatin1("Animal Culture");
            break;
        case 'h':
            return QString::fromLatin1("Aquaculture and Fishing");
            break;
        case 'k':
            return QString::fromLatin1("Hunting");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::tSubCats(const QString &code, QString &cat)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;
    cat = QString::fromLatin1("Engineering");

    switch (sub) {
        case 'a':
            return QString::fromLatin1("General");
            break;
        case 'c':
            return QString::fromLatin1("Hydraulic and Ocean");
            break;
        case 'd':
            return QString::fromLatin1("Environmental and Sanitary");
            break;
        case 'e':
            return QString::fromLatin1("Roads and Highways");
            break;
        case 'f':
            return QString::fromLatin1("Railroads");
            break;
        case 'g':
            return QString::fromLatin1("Bridges");
            break;
        case 'h':
            return QString::fromLatin1("Construction");
            break;
        case 'j':
            return QString::fromLatin1("Mechanical");
            break;
        case 'k':
            return QString::fromLatin1("Electrical");
            break;
        case 'l':
            return QString::fromLatin1("Transportation");
            break;
        case 'n':
            return QString::fromLatin1("Mining and Metallurgy");
            break;
        case 'p':
            cat = QString::fromLatin1("Science");
            return QString::fromLatin1("Chemistry");
            break;
        case 'r':
            cat = QString::fromLatin1("Fine Arts");
            return QString::fromLatin1("Photography");
            break;
        case 's':
            return QString::fromLatin1("Manufacturing");
            break;
        case 't':
            cat = QString::fromLatin1("Fine Arts");
            return QString::fromLatin1("Crafts");
            break;
        case 'x':
            return QString::fromLatin1("Hospitality");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::uSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Armies");
            break;
        case 'b':
            return QString::fromLatin1("Administration");
            break;
        case 'c':
            return QString::fromLatin1("Maintenance and Transportation");
            break;
        case 'd':
            return QString::fromLatin1("Infantry");
            break;
        case 'e':
            return QString::fromLatin1("Cavalry and Armor");
            break;
        case 'f':
            return QString::fromLatin1("Artillery");
            break;
        case 'g':
            return QString::fromLatin1("Engineering and Air Forces");
            break;
        case 'h':
            return QString::fromLatin1("Medical and Services");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
}

QString LCC::vSubCats(const QString &code)
{
    char sub = code.size() > 1 ? code[1].toLower().toAscii() : 0;

    switch (sub) {
        case 'a':
            return QString::fromLatin1("Navies");
            break;
        case 'b':
            return QString::fromLatin1("Administration");
            break;
        case 'c':
            return QString::fromLatin1("Maintenance");
            break;
        case 'd':
            return QString::fromLatin1("Seamen");
            break;
        case 'e':
            return QString::fromLatin1("Marines");
            break;
        case 'f':
            return QString::fromLatin1("Ordnance");
            break;
        case 'g':
            return QString::fromLatin1("Misc. Services");
            break;
        case 'k':
            return QString::fromLatin1("Navigation");
            break;
        case 'm':
            return QString::fromLatin1("Shipbuilding and Engineering");
            break;
        default:
            break;
    }

    return QString::fromLatin1("General");
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
        sub = bSubCats(code, cat);
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
        cat = QString::fromLatin1("History");
        sub = QString::fromLatin1("United States");
        break;
    case 'f':
        cat = QString::fromLatin1("History");
        sub = fSubCats(code);
        break;
    case 'g':
        cat = gSubCats(code, sub);
        break;
    case 'h':
        sub = hSubCats(code, cat);
        break;
    case 'j':
        sub = jSubCats(code, cat);
        break;
    case 'k':
        cat = QString::fromLatin1("Law");
        sub = kSubCats(code);
        break;
    case 'l':
        cat = QString::fromLatin1("Education");
        sub = lSubCats(code);
        break;
    case 'm':
        cat = QString::fromLatin1("Music");
        sub = mSubCats(code);
        break;
    case 'n':
        cat = QString::fromLatin1("Fine Arts");
        sub = nSubCats(code);
        break;
    case 'p':
        sub = pSubCats(code, cat);
        break;
    case 'q':
        cat = QString::fromLatin1("Science and Math");
        sub = qSubCats(code);
        break;
    case 'r':
        cat = QString::fromLatin1("Medicine");
        sub = rSubCats(code);
        break;
    case 's':
        cat = QString::fromLatin1("Agriculture");
        sub = sSubCats(code);
        break;
    case 't':
        sub = tSubCats(code, cat);
        break;
    case 'u':
        cat = QString::fromLatin1("Military Science");
        sub = uSubCats(code);
        break;
    case 'v':
        cat = QString::fromLatin1("Naval Science");
        sub = vSubCats(code);
        break;
    case 'z':
        cat = QString::fromLatin1("Library Science");
        break;
    default:
        qDebug() << "Unrecognized lcc class = " << code;
        break;
    }

    if (!cat.isEmpty()) {
        refineUsingSubjects();
        if (sub.isEmpty()) {
            if (!m_categories.contains(cat)) {
                m_categories[cat] = QStringList();
            }
        } else {
            m_categories[cat].append(sub);
        }
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
    const QString history(QLatin1String("History"));
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


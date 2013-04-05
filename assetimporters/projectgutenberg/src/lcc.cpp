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

LCC::LCC(const QString &lcc)
    : m_categories(LCC_Miscellaneous)
{
    m_original += lcc;
    m_categories = parse(lcc);
}

LCC::LCC(const QStringList &lccs)
    : m_categories(LCC_Miscellaneous),
      m_original(lccs)
{
    foreach(const QString &lcc, lccs) {
        m_categories |= parse(lcc);
    }
}

LCC::Categories LCC::categories() const
{
    return m_categories;
}

QStringList LCC::topCategories() const
{
    QStringList c;

    if (m_categories == LCC_Miscellaneous) {
        return QStringList() << QObject::tr("Miscellaneous");
    }

    if ((m_categories & LCC_A_GeneralWorks)) {
        c += QObject::tr("General Works");
    }
    if ((m_categories & LCC_B_PhilosophyPsychologyReligion)) {
        c += QObject::tr("Philosophy, Psychology, Religion");
    }
    if ((m_categories & LCC_C_AuxiliarySciencesOfHistory)) {
        c += QObject::tr("Auxiliary Sciences of History (General)");
    }
    if ((m_categories & LCC_D_WorldHistory)) {
        c += QObject::tr("World History (except American History)");
    }
    if ((m_categories & LCC_E_HistoryOfTheAmericas) ||
        (m_categories & LCC_F_HistoryOfTheAmericas)) {
        c += QObject::tr("American History");
    }
    if ((m_categories & LCC_G_GeographyAnthropologyRecreation)) {
        c += QObject::tr("Geography, Anthropology, Recreation");
    }
    if ((m_categories & LCC_H_SocialSciences)) {
        c += QObject::tr("Social Sciences");
    }
    if ((m_categories & LCC_J_PoliticalScience)) {
        c += QObject::tr("Political Science");
    }
    if ((m_categories & LCC_K_Law)) {
        c += QObject::tr("Law");
    }
    if ((m_categories & LCC_L_Education)) {
        c += QObject::tr("Education");
    }
    if ((m_categories & LCC_M_MusicAndBooksOnMusic)) {
        c += QObject::tr("Music");
    }
    if ((m_categories & LCC_N_FineArts)) {
        c += QObject::tr("Fine Arts");
    }
    if ((m_categories & LCC_P_LanguageAndLiterature)) {
        c += QObject::tr("Language and Literature");
    }
    if ((m_categories & LCC_Q_Science)) {
        c += QObject::tr("Science");
    }
    if ((m_categories & LCC_R_Medicine)) {
        c += QObject::tr("Medicine");
    }
    if ((m_categories & LCC_S_Agriculture)) {
        c += QObject::tr("Agriculture");
    }
    if ((m_categories & LCC_T_Technology)) {
        c += QObject::tr("Technology");
    }
    if ((m_categories & LCC_U_MilitaryScience)) {
        c += QObject::tr("Military Science");
    }
    if ((m_categories & LCC_V_NavalScience)) {
        c += QObject::tr("Naval Science");
    }
    if ((m_categories & LCC_Z_BibliographyLibraryScienceInformationResources)) {
        c += QObject::tr("Bibliography, Library Science");
    }
    return c;
}

LCC::Category LCC::parse(const QString &lcc)
{
    if (lcc.isEmpty()) {
        return LCC_Miscellaneous;
    }

    char firstCharacter = lcc[0].toLower().toAscii();

    switch (firstCharacter) {
    case 'a':
        return LCC_A_GeneralWorks;
        break;
    case 'b':
        return LCC_B_PhilosophyPsychologyReligion;
        break;
    case 'c':
        return LCC_C_AuxiliarySciencesOfHistory;
        break;
    case 'd':
        return LCC_D_WorldHistory;
        break;
    case 'e':
        return LCC_E_HistoryOfTheAmericas;
        break;
    case 'f':
        return LCC_F_HistoryOfTheAmericas;
        break;
    case 'g':
        return LCC_G_GeographyAnthropologyRecreation;
        break;
    case 'h':
        return LCC_H_SocialSciences;
        break;
    case 'j':
        return LCC_J_PoliticalScience;
        break;
    case 'k':
        return LCC_K_Law;
        break;
    case 'l':
        return LCC_L_Education;
        break;
    case 'm':
        return LCC_M_MusicAndBooksOnMusic;
        break;
    case 'n':
        return LCC_N_FineArts;
        break;
    case 'p':
        return LCC_P_LanguageAndLiterature;
        break;
    case 'q':
        return LCC_Q_Science;
        break;
    case 'r':
        return LCC_R_Medicine;
        break;
    case 's':
        return LCC_S_Agriculture;
        break;
    case 't':
        return LCC_T_Technology;
        break;
    case 'u':
        return LCC_U_MilitaryScience;
        break;
    case 'v':
        return LCC_V_NavalScience;
        break;
    case 'z':
        return LCC_Z_BibliographyLibraryScienceInformationResources;
        break;
    default:
        qDebug()<<"Unrecognized lcc class = "<<lcc;
        break;
    }
    return LCC_Miscellaneous;
}

QStringList LCC::originalText() const
{
    return m_original;
}

QHash<LCC::Category, QString> LCC::categoryMap()
{
    static QHash<LCC::Category, QString> cat;

    if (cat.isEmpty()) {
        cat.insert(LCC_Miscellaneous,
                   QObject::tr("Miscellaneous"));
        cat.insert(LCC_A_GeneralWorks,
                   QString::fromLatin1("General Works"));
        cat.insert(LCC_B_PhilosophyPsychologyReligion,
                   QString::fromLatin1("Philosophy, Psychology, Religion"));
        cat.insert(
            LCC_C_AuxiliarySciencesOfHistory,
            QString::fromLatin1("Auxiliary Sciences of History (General)"));
        cat.insert(
            LCC_D_WorldHistory,
            QString::fromLatin1("World History (except American History)"));
        cat.insert(LCC_E_HistoryOfTheAmericas,
                   QString::fromLatin1("American History"));
        cat.insert(LCC_F_HistoryOfTheAmericas,
                   QString::fromLatin1("American History"));
        cat.insert(LCC_G_GeographyAnthropologyRecreation,
                   QString::fromLatin1("Geography, Anthropology, Recreation"));
        cat.insert(LCC_H_SocialSciences,
                   QString::fromLatin1("Social Sciences"));
        cat.insert(LCC_J_PoliticalScience,
                   QString::fromLatin1("Political Science"));
        cat.insert(LCC_K_Law,
                   QString::fromLatin1("Law"));
        cat.insert(LCC_L_Education,
                   QString::fromLatin1("Education"));
        cat.insert(LCC_M_MusicAndBooksOnMusic,
                   QString::fromLatin1("Music"));
        cat.insert(LCC_N_FineArts,
                   QString::fromLatin1("Fine Arts"));
        cat.insert(LCC_P_LanguageAndLiterature,
                   QString::fromLatin1("Language and Literature"));
        cat.insert(LCC_Q_Science,
                   QString::fromLatin1("Science"));
        cat.insert(LCC_R_Medicine,
                   QString::fromLatin1("Medicine"));
        cat.insert(LCC_S_Agriculture,
                   QString::fromLatin1("Agriculture"));
        cat.insert(LCC_T_Technology,
                   QString::fromLatin1("Technology"));
        cat.insert(LCC_U_MilitaryScience,
                   QString::fromLatin1("Military Science"));
        cat.insert(LCC_V_NavalScience,
                   QString::fromLatin1("Naval Science"));
        cat.insert(LCC_Z_BibliographyLibraryScienceInformationResources,
                   QString::fromLatin1("Bibliography, Library Science"));
    }

    return cat;
}

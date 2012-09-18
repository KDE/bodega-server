#ifndef LCC_H
#define LCC_H

#include <QStringList>

namespace Gutenberg
{


/*
 * http://www.loc.gov/catdir/cpso/lcco/
 * http://en.wikipedia.org/wiki/Library_of_Congress_Classification
 */
class LCC
{
public:
    enum Category
    {
        LCC_Miscellaneous                           = 0,
        LCC_A_GeneralWorks                          = 1 << 0,
        LCC_B_PhilosophyPsychologyReligion          = 1 << 1,
        LCC_C_AuxiliarySciencesOfHistory            = 1 << 2,
        LCC_D_WorldHistory                          = 1 << 3,
        LCC_E_HistoryOfTheAmericas                  = 1 << 4,
        LCC_F_HistoryOfTheAmericas                  = 1 << 5,
        LCC_G_GeographyAnthropologyRecreation       = 1 << 6,
        LCC_H_SocialSciences                        = 1 << 7,
        LCC_J_PoliticalScience                      = 1 << 8,
        LCC_K_Law                                   = 1 << 9,
        LCC_L_Education                             = 1 << 10,
        LCC_M_MusicAndBooksOnMusic                  = 1 << 11,
        LCC_N_FineArts                              = 1 << 12,
        LCC_P_LanguageAndLiterature                 = 1 << 13,
        LCC_Q_Science                               = 1 << 14,
        LCC_R_Medicine                              = 1 << 15,
        LCC_S_Agriculture                           = 1 << 16,
        LCC_T_Technology                            = 1 << 17,
        LCC_U_MilitaryScience                       = 1 << 18,
        LCC_V_NavalScience                          = 1 << 19,
        LCC_Z_BibliographyLibraryScienceInformationResources = 1 << 20
    };
    Q_DECLARE_FLAGS(Categories, Category)
public:
    static QHash<Category, QString> categoryMap();
public:
    explicit LCC(const QString &lcc=QString());
    explicit LCC(const QStringList &lccs);

    Categories categories() const;
    QStringList topCategories() const;

    QStringList originalText() const;
private:
    Category parse(const QString &lcc);
private:
    Categories m_categories;
    QStringList m_original;
};

}

#endif

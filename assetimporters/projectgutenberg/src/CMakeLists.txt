set(QT_USE_QTSQL TRUE)
include_directories(${QT_INCLUDES} ${CMAKE_CURRENT_BINARY_DIR})
#include(${QT_USE_FILE})


set(gutimport_SRCS
    catalog.cpp
    gutenbergdatabase.cpp
    ebook.cpp
    languages.cpp
    lcc.cpp
    reader.cpp
    main.cpp
    ../../common/database.cpp
)

qt4_automoc(${gutimport_SRCS})

add_definitions(${QT_DEFINITIONS})

add_executable(bodega_gutimport ${gutimport_SRCS})
target_link_libraries(bodega_gutimport ${QT_QTCORE_LIBRARIES} ${QT_QTSQL_LIBRARIES} ${QT_QTNETWORK_LIBRARIES})
install(TARGETS bodega_gutimport RUNTIME DESTINATION bin)

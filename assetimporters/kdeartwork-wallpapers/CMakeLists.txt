set(QT_USE_QTSQL TRUE)
include_directories(${QT_INCLUDES} ${CMAKE_CURRENT_BINARY_DIR})
#include(${QT_USE_FILE})


set(wallpapersimport_SRCS
    catalog.cpp
    kdewallpapersdatabase.cpp
    main.cpp
    ../common/database.cpp
   )

qt4_automoc(${wallpapersimport_SRCS})

add_definitions(${QT_DEFINITIONS})

add_executable(bodega_wallpapersimport ${wallpapersimport_SRCS})
target_link_libraries(bodega_wallpapersimport ${QT_QTCORE_LIBRARIES} ${QT_QTSQL_LIBRARIES} ${QT_QTNETWORK_LIBRARIES})

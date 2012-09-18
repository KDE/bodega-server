cmake_minimum_required(VERSION 2.6)
find_package(Qt4 REQUIRED)
set(QT_USE_QTSQL TRUE)
include_directories(${QT_INCLUDES} ${CMAKE_CURRENT_BINARY_DIR})
#include(${QT_USE_FILE})


set(wallpapersimport_SRCS
    catalog.cpp
    database.cpp
    main.cpp
   )

qt4_automoc(${wallpapersimport_SRCS})

add_definitions(${QT_DEFINITIONS})

add_executable(wallpapersimport ${wallpapersimport_SRCS})
target_link_libraries(wallpapersimport ${QT_QTCORE_LIBRARIES} ${QT_QTSQL_LIBRARIES} ${QT_QTNETWORK_LIBRARIES})

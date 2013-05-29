set(QT_USE_QTSQL TRUE)
include_directories(${QT_INCLUDES} ${CMAKE_CURRENT_BINARY_DIR})
#include(${QT_USE_FILE})


set(packagesimport_SRCS
    packagecatalog.cpp
    packagedatabase.cpp
    channelscatalog.cpp
    ../database-common/database.cpp
    main.cpp
   )

qt4_automoc(${packagesimport_SRCS})

add_definitions(${QT_DEFINITIONS})

add_executable(packagesimport ${packagesimport_SRCS})
target_link_libraries(packagesimport ${QT_QTCORE_LIBRARIES} ${QT_QTSQL_LIBRARIES} ${QT_QTNETWORK_LIBRARIES})

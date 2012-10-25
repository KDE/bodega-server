
set(QT_USE_QTSQL TRUE)
include_directories(${QT_INCLUDES} ${CMAKE_CURRENT_BINARY_DIR})
#include(${QT_USE_FILE})


set(gutimport_SRCS ebook.cpp catalog.cpp parser.cpp database.cpp lcc.cpp main.cpp)
qt4_automoc(${gutimport_SRCS})

add_definitions(${QT_DEFINITIONS})

add_executable(gutimport ${gutimport_SRCS})
target_link_libraries(gutimport ${QT_QTCORE_LIBRARIES} ${QT_QTSQL_LIBRARIES} ${QT_QTNETWORK_LIBRARIES})
install(TARGETS gutimport RUNTIME DESTINATION bin)

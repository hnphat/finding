setlocal enabledelayedexpansion
set "source=%1"
set "dest=%2"

xcopy "!source!" "!dest!" /c /i /e /h /y
exit
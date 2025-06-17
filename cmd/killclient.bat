powershell -noprofile -command "& {[system.threading.thread]::sleep(500)}"
taskkill /IM FINDING.exe /F
taskkill /IM Electron.exe /F
powershell -noprofile -command "& {[system.threading.thread]::sleep(500)}"
exit
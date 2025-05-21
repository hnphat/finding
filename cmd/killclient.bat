powershell -noprofile -command "& {[system.threading.thread]::sleep(500)}"
taskkill /IM QLCVAPP.exe /F
taskkill /IM Electron.exe /F
powershell -noprofile -command "& {[system.threading.thread]::sleep(500)}"
exit
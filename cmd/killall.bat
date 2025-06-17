powershell -noprofile -command "& {[system.threading.thread]::sleep(500)}"
taskkill /IM node.exe /F
taskkill /IM Electron.exe /F
taskkill /IM FINDING.exe /F
taskkill /IM server-win.exe /F
powershell -noprofile -command "& {[system.threading.thread]::sleep(500)}"
net use M: /delete
exit
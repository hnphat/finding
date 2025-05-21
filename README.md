# electron
Electron init first build for all project startup
Để sử dụng được Sqlite3 trên electron khi dùng npm start
buộc phải 
1. Cài đặt python 3.10.0
2. Chạy lệnh: npm install --global --production windows-build-tools
3. Chạy lệnh: npm config set msvs_version 2022
để electron có thể build thành công

# các lệnh
npm run make => xuất file cài đặt cho ứng dụng electron -> tạm thời không dùng -> sử dụng npm run dist
npm start => chạy dự án electron
npm run dist => build dự án bằng electron-builder -> nên dùng vì nó tạo ra file app.asar
node ./server.js => chạy server cho electron
# Nén file nodejs thành exe bằng pkg
Cài đặt: npm install –g pkg
Chạy lệnh: pkg <tên file main.js>
# clone branch NodeServerQLCV trên git
git clone --branch NodeServerQLCV https://github.com/hnphat/electron.git
# Sử dụng nvm để tải và chọn phiên bản node cần sử dụng đang sử dụng Node 16.20.1
# nvm install <node version> // cài phiên bản node
# nvm list // Danh sách node đã cài
# nvm use <node version> // Sử dụng node

# Phân phối ứng dụng thủ công 
Tải electron-v24.7.0-win32-x64.zip trên release electron. Tiến hành giải nén electron-v24.7.0-win32-x64.zip ra thư mục (1) electron-v24.7.0-win32-x64
-> Vào thư mục resources -> xoá tất cả thư mục trong đó -> tạo thư mục mới tên app
-> chép tất cả mã nguồn electron (trừ thư mục out, thư mục dist) vào thư mục mới tên app (2)
-> Chép xong tiến hành cắt tất cả file trừ các file, thư mục sau:
+ js
+ pages
+ vendor
+ .gitignore
+ forge.config.js
+ index.html
+ package.json
+ package.json.lock
+ README.md
+ server.js
=> trở về thư mục gốc của electron-v24.7.0-win32-x64 đã giải nén -> chép tất cả file cắt vào đấy
=> Tại thư mục gốc chép thư mục node_modules vào thư mục app (trong thư mục resources)
=> Mở package.json chỉnh sửa thông số "main.js" thành "../../main.js"
=> Chạy ứng dụng electron.exe trong thư mục gốc electron-v24.7.0-win32-x64
=> đóng gói thành file cài sử dụng phần mềm innosetup (google tìm)

# Giải nén file .asar (từ electron-build)
npx asar extract app.asar H:\a

# Không chạy file setup.bat nếu dùng electron-builder chỉ sử dụng khi dùng npm run make trong out folder
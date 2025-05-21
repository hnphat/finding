require('dotenv').config();
var express = require('express');
const fs = require('fs');
const path = require('path');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('port', process.env.PORT || 3000); // CẤU HÌNH PORT CHẠY TRÊN SERVER
//---------- START ROUTE -------------
app.get('/', function(req, res){   
    res.json({
        status: 200
    });
});
// ================== FINDING ==================
function getFileType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.pdf') return 'PDF';
    if (ext === '.doc' || ext === '.docx') return 'Word';
    if (ext === '.xls' || ext === '.xlsx') return 'Excel';
    if (ext === '.ppt' || ext === '.pptx') return 'PowerPoint';
    if (['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(ext)) return 'Image';
    if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) return 'Video';
    if (ext === '.txt') return 'Text';
    if (ext === '.json') return 'JSON';
    return ext ? ext.slice(1).toUpperCase() : 'Unknown';
}

// Đệ quy duyệt file và lọc theo keyword
function searchFiles(dir, keyword, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            searchFiles(fullPath, keyword, results); // Đệ quy
        } else {
            if (entry.name.toLowerCase().includes(keyword.toLowerCase())) {
                results.push({
                    tenfile: entry.name,
                    duongdan: path.dirname(fullPath),
                    loai: getFileType(entry.name),
                    ghichu: "",
                });
            }
        }
    }
    return results;
}

app.get('/system/finding', function(req, res){     
  const duongdan = req.query.duongdan;
  const vanban = req.query.vanban;
  if (!duongdan || !vanban) {
      let result = [];
      let obj = {};
      obj.tenfile = "Vui lòng tìm kiếm";
      obj.duongdan = "";
      obj.loai = "";
      obj.ghichu = "";
      result.push(obj);
      res.json({
          total: 0,
          data: result,
          code: 400,
          message: "Không có thông tin đường dẫn hoặc từ khoá tìm kiếm"
      });
  } else {
    try {
        const foundFiles = searchFiles(duongdan, vanban);
        setTimeout(() => {
          res.json({
            total: foundFiles.length,
            data: foundFiles,
            code: 200,
            message: "Đã tìm thấy các file"
          });
        }, 3000);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi tìm kiếm' });
    } 
  }  
});
// -----------------
// custom 404 page
app.use(function(req, res){ 			// APP.USE SỬ DỤNG MIDDLEWARE  CHO LỖI 404 CLIENT
  res.type('text/plain');    // TRẢ VỀ NỘI DUNG  DẠNG TEXT/PLAIN CHO CLIENT
  res.status(404);   // TRẢ VỀ NỘI DUNG CHO CLIENT  STATUS CODE
  res.send('404 - Not Found');   // TRẢ VỀ NỘI DUNG CHO CLIENT TƯƠNG ỨNG VỚI RES.TYPE
});
// custom 500 page
app.use(function(err, req, res, next){        // APP.USE SỬ DỤNG MIDDLEWARE  CHO LỖI 500 SERVER
  console.error(err.stack);   // IN LỖI RA CONSOLE Ở MÁY CHỦ
  res.type('text/plain');
  res.status(500);
  res.send('500 - Server Error');
});

app.listen(app.get('port'), process.env.IPCONNECT, function(){    // SERVER LẮNG NGHE KẾT NỐI VỚI PORT ĐÃ ĐƯỢC XÁC ĐỊNH TRƯỚC ĐÓ
  console.log('Finding Server started on http://' + process.env.IPCONNECT + ':' +
  app.get('port') + '; press Ctrl-C to terminate.' );
});
// Chạy server: node server.js
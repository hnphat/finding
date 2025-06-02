require('dotenv').config();
var express = require('express');
const fs = require('fs');
const fse = require('fs-extra');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.json());
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

// Đọc nội dung file dựa trên định dạng
async function readFileContent(fullPath, ext) {
    if (ext === '.txt') {
        return fs.readFileSync(fullPath, 'utf8');
    }
    if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }
    if (ext === '.docx') {
        const data = await mammoth.extractRawText({ path: fullPath });
        return data.value;
    }
    // Có thể mở rộng thêm cho các loại file khác
    return '';
}


async function searchFilesByContent(dir, keyword, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const tasks = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Đệ quy song song
            tasks.push(searchFilesByContent(fullPath, keyword, results));
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.pdf', '.docx'].includes(ext)) { // chỉ tìm pdf, docx
                // Đọc file song song
                tasks.push(
                    (async () => {
                        try {
                            const content = await readFileContent(fullPath, ext);
                            if (content && content.toLowerCase().includes(keyword.toLowerCase())) {
                                const stats = fs.statSync(fullPath);
                                const created = stats.birthtime;
                                const createdStr = `${created.getHours().toString().padStart(2, '0')}:${created.getMinutes().toString().padStart(2, '0')}:${created.getSeconds().toString().padStart(2, '0')} ${created.getDate().toString().padStart(2, '0')}/${(created.getMonth()+1).toString().padStart(2, '0')}/${created.getFullYear()}`;
                                results.push({
                                    tenfile: entry.name,
                                    duongdan: path.dirname(fullPath),
                                    loai: getFileType(entry.name),
                                    ghichu: "",
                                    ngaytao: createdStr,
                                    trang: ""
                                });
                              //   results.push({
                              //     tenfile: entry.name,
                              //     duongdan: path.dirname(fullPath),
                              //     loai: getFileType(entry.name),
                              //     ghichu: "",
                              //     ngaytao: createdStr,
                              //     trang: content.foundPages.join(', ') // VD: "2, 5, 7"
                              // });
                            }                            
                        } catch (e) {
                            // Bỏ qua file lỗi
                        }
                    })()
                );
            }
        }
    }
    await Promise.all(tasks);
    return results;
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
                const stats = fs.statSync(fullPath);
                const created = stats.birthtime;
                // Định dạng: giờ:phút:giây ngày/tháng/năm
                const createdStr = `${created.getHours().toString().padStart(2, '0')}:${created.getMinutes().toString().padStart(2, '0')}:${created.getSeconds().toString().padStart(2, '0')} ${created.getDate().toString().padStart(2, '0')}/${(created.getMonth()+1).toString().padStart(2, '0')}/${created.getFullYear()}`;
                results.push({
                    tenfile: entry.name,
                    duongdan: path.dirname(fullPath),
                    loai: getFileType(entry.name),
                    ghichu: "",
                    trang: "",
                    ngaytao: createdStr
                });
            }
        }
    }
    return results;
}

function countFiles(dir) {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            count += countFiles(fullPath);
        } else {
            count++;
        }
    }
    return count;
}

app.get('/system/finding', async function(req, res){     
  const duongdan = req.query.duongdan;
  const vanban = req.query.vanban;
  const phuongthuc = req.query.phuongthuc;  
  const MAX_FILES = req.query.maxfile; // Ngưỡng tối đa
  if (!duongdan || !vanban) {
      let result = [];
      let obj = {};
      obj.tenfile = "";
      obj.duongdan = "";
      obj.loai = "";
      obj.ghichu = "";
      obj.ngaytao = "";
      obj.trang = "";
      result.push(obj);
      res.json({
          total: 0,
          data: result,
          code: 400,
          message: "Không có thông tin đường dẫn hoặc từ khoá tìm kiếm"
      });
  } else {   
    if (phuongthuc == "1") {
      try {
        const foundFiles = searchFiles(duongdan, vanban);
          res.json({
            total: foundFiles.length,
            data: foundFiles,
            code: 200,
            message: "Hoàn tất lệnh"
          });
      } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Đã xảy ra lỗi khi tìm kiếm' });
      } 
    } else if (phuongthuc == "2") { 
      let totalFiles = 0;
      try {
          totalFiles = countFiles(duongdan);
      } catch (err) {
          return res.status(500).json({ code: 500, message: "Không thể truy cập thư mục hoặc thư mục quá lớn!" });
      }
      if (totalFiles > MAX_FILES) {
          return res.json({
              code: 413,
              message: `Thư mục bạn chọn có ${totalFiles} tập tin, vượt quá ngưỡng tối ưu (${MAX_FILES} file). Vui lòng chọn thư mục nhỏ hơn để đảm bảo tốc độ tìm kiếm, hoặc chia nhỏ thư mục.`
          });
      }
      
      const foundFiles = await searchFilesByContent(duongdan, vanban);
        res.json({
          total: foundFiles.length,
          data: foundFiles,
          code: 200,
          message: "Hoàn tất lệnh"
        });
    } else {
      res.json({
          code: 500,
          message: "Không có phương thức tìm kiếm nào được xác định"
      });
    }
  }  
});

app.post('/system/finding/copy', async function(req, res) {
    const files = req.body.files || [];
    if (!files.length || files[0].tenfile == "") {
        return res.json({ code: 200, message: "Không tìm thấy thông tin tập tin cần lưu" });
    }
    const destFolder = req.body.destFolder || "";
    if (!destFolder) {
        return res.json({ code: 200, message: "Vui lòng chọn thư mục lưu" });
    }
    try {
        for (const file of files) {
            const srcPath = path.join(file.duongdan, file.tenfile);
            const destPath = path.join(destFolder, file.tenfile);
            await fse.copy(srcPath, destPath);
        }
        return res.json({ code: 200, message: "Đã chép tất cả tập tin thành công! Vui lòng xem tại thư mục lưu: " + destFolder });
    } catch (err) {
        console.error(err);
        return res.json({ code: 500, message: "Có lỗi khi chép tập tin", error: err.message });
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
require('dotenv').config();
var express = require('express');
const fs = require('fs');
const fse = require('fs-extra');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
var bodyParser = require('body-parser');
const os = require('os');
// --------------------- New Gemini
const { execFileSync } = require('child_process'); 
// ------------------- Thuc hien truoc khi khoi tao poppler
let popplerBinDirPath = "";
if (process.env.PRODUCTION != 1) {
    // Khi chạy trong môi trường phát triển (npm start/node app.js)
    // Đây là đường dẫn mặc định nơi pdf-poppler mong đợi tìm thấy binaries
    popplerBinDirPath = path.join(__dirname, 'node_modules', 'pdf-poppler', 'lib', 'win', 'poppler-0.51', 'bin');
} 
process.env.POPPLER_PATH = popplerBinDirPath;
//console.log(`POPPLER_PATH hiện tại là: ${process.env.POPPLER_PATH}`);
// ----------------------------
const Poppler = require('pdf-poppler');

// -------------------------
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

// app.use(express.static(path.join(__dirname, 'pdf-parse')));
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
                                console.log("Founded: ", fullPath);
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
                            }                            
                        } catch (e) {
                           console.error("ERROR READING: ", fullPath, e);
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

function removeVietnameseTones(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
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
  // Kiểm tra ngày hết hạn
    // const today = new Date();
    // const expireDate = new Date(2026, 1, 1); // Tháng 6 là tháng 7 vì JS đếm từ 0
    // if (today >= expireDate) {
    //     return res.json({
    //         code: 403,
    //         message: "Error: 0000000x8b201!"
    //     });
    // }
  // ------------------------------     
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
              message: `Thư mục bạn chọn có ${totalFiles} tập tin, vượt quá ngưỡng tối ưu (${MAX_FILES} file). Vui lòng chọn thư mục nhỏ hơn để đảm bảo tốc độ tìm kiếm tránh quá tải tài nguyên hệ thống, hoặc chia nhỏ thư mục.`
          });
      }

      const foundFiles = await searchFilesByContent(duongdan, vanban);
         res.json({
            total: foundFiles.length,
            data: foundFiles,
            code: 200,
            message: "Hoàn tất lệnh"
        });
    } else if (phuongthuc == "3") {
        const tesseractPath = path.join(process.cwd(), 'tesseract', 'tesseract.exe');

        if (!duongdan || !fs.existsSync(duongdan)) {
            return res.json({ code: 400, message: "Thiếu hoặc sai đường dẫn thư mục" });
        }

        // Đệ quy lấy danh sách file PDF trong thư mục
        function getPdfFiles(dir, files = []) {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        getPdfFiles(fullPath, files);
                    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf') {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Lỗi khi đọc thư mục ${dir}:`, error.message);
            }
            return files;
        }

        const pdfFiles = getPdfFiles(duongdan);
        let results = [];
        const tmpDir = os.tmpdir(); // Lấy thư mục tạm thời của hệ điều hành

        for (const pdfPath of pdfFiles) {
            let pageImagePath = '';
            try {
                const dataBuffer = fs.readFileSync(pdfPath);
                const pdfData = await pdfParse(dataBuffer);
                const numPages = pdfData.numpages;

                if (numPages > process.env.SOTRANG) {
                    console.log(`Bỏ qua file ${pdfPath} vì có hơn 20 trang.`);
                    continue;
                }

                const text = pdfData.text || '';
                const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
                const created = fs.statSync(pdfPath).birthtime;
                const createdStr = `${created.getHours().toString().padStart(2, '0')}:${created.getMinutes().toString().padStart(2, '0')}:${created.getSeconds().toString().padStart(2, '0')} ${created.getDate().toString().padStart(2, '0')}/${(created.getMonth() + 1).toString().padStart(2, '0')}/${created.getFullYear()}`;
                if (hasVietnamese && text.toLowerCase().includes(vanban.toLowerCase())) {
                    console.log(`Founded content: ${pdfPath}`);
                    results.push({
                        tenfile: path.basename(pdfPath),
                        duongdan: path.dirname(pdfPath),
                        loai: getFileType(pdfPath),
                        ghichu: "Tìm thấy trong nội dung text PDF",
                        trang: "text",
                        ngaytao: createdStr
                    });
                    continue;
                }

                // Nếu không trích xuất được tiếng Việt hoặc không tìm thấy từ khóa, mới dùng OCR
                //console.log(`Không tìm thấy trong nội dung text, bắt đầu OCR cho file: ${pdfPath}`);
                console.log(`OCR ....: ${pdfPath}`);

                for (let i = 1; i <= numPages; i++) {
                    // Chuyển từng trang PDF thành ảnh PNG bằng pdf-poppler
                    const outputDir = tmpDir;
                    const outPrefix = `page_${Date.now()}_${Math.floor(Math.random()*10000)}`;
                    const opts = {
                        format: 'png',
                        out_dir: outputDir,
                        out_prefix: outPrefix,
                        page: i,
                        resolution: process.env.RESOLUTION ? process.env.RESOLUTION : 150 // mặc định 150 hoặc 100, 150, 200 tùy chất lượng scan
                       // popplerPath: popplerPath // Đường dẫn đến thư mục chứa poppler
                    };
                    try {
                        // Xử lý file có dấu tiếng việt
                        let safePdfPath = pdfPath;
                        if (/[^\x00-\x7F]/.test(path.basename(pdfPath))) {
                            const tmpDir = os.tmpdir();
                            const tmpName = removeVietnameseTones(path.basename(pdfPath)).replace(/\s+/g, '_');
                            const tmpPath = path.join(tmpDir, tmpName);
                            fs.copyFileSync(pdfPath, tmpPath);
                            safePdfPath = tmpPath;                           
                        }
                        // -----------------------------------
                        await Poppler.convert(safePdfPath, opts);
                        pageImagePath = path.join(outputDir, `${outPrefix}-${i}.png`);
                        if (!fs.existsSync(pageImagePath)) {
                           // console.error(`Ảnh không tồn tại sau khi tạo: ${pageImagePath}. Bỏ qua trang ${i} của file ${pdfPath}`);
                            continue;
                        }
                        const stats = fs.statSync(pageImagePath);
                        if (stats.size === 0) {
                           // console.error(`Ảnh rỗng: ${pageImagePath}. Bỏ qua trang ${i} của file ${pdfPath}`);
                            fs.unlinkSync(pageImagePath);
                            continue;
                        }
                        if (stats.size > 10 * 1024 * 1024) {
                          //  console.error(`Ảnh quá lớn (${(stats.size / (1024 * 1024)).toFixed(2)} MB), bỏ qua trang ${i} của file ${pdfPath}`);
                            fs.unlinkSync(pageImagePath);
                            continue;
                        }

                      //  console.log(`OCR Page ${i}: ${pdfPath}: ${pageImagePath}`);

                        let ocrText = '';
                        try {
                            ocrText = execFileSync(
                                tesseractPath,
                                [pageImagePath, 'stdout', '-l', 'vie'],
                                { encoding: 'utf8', timeout: 300000 }
                            );
                           // console.log(`OCR Done Page ${i}: ${pdfPath}.`);
                        } catch (e) {
                            console.error(`ERROR CALL tesseract ON PAGE ${i}: ${pdfPath}: ${e.message}`);
                        } finally {
                            if (fs.existsSync(pageImagePath)) {
                                fs.unlinkSync(pageImagePath);
                              //  console.log(`DELETED TEMPLE IMAGE: ${pageImagePath}`);
                            }
                        }

                        if (ocrText && ocrText.toLowerCase().includes(vanban.toLowerCase())) {
                            console.log(`Founded content: ${pdfPath}`);
                            results.push({
                                tenfile: path.basename(pdfPath),
                                duongdan: path.dirname(pdfPath),
                                loai: getFileType(pdfPath),
                                ghichu: `Tìm thấy qua OCR ở trang ${i}`,
                                trang: i,
                                ngaytao: createdStr
                            });
                            break; // Đã tìm thấy, không cần kiểm tra các trang còn lại của PDF này
                        }

                        // Xử lý xong thì xóa file tạm nếu đã copy
                        if (safePdfPath !== pdfPath && fs.existsSync(safePdfPath)) {
                            fs.unlinkSync(safePdfPath);                           
                        }
                        // ----------------------------------------
                    } catch (e) {
                        console.error(`ERROR CONVERT PDF TO IMAGE OR OCR PAGE ${i}: ${pdfPath}:`, e);
                        if (fs.existsSync(pageImagePath)) {
                            fs.unlinkSync(pageImagePath);
                          //  console.log(`DELETED TEMPLE IMAGE AFTER ERROR: ${pageImagePath}`);
                        }
                    }
                }
            } catch (e) {
                console.error(`ERROR CAN NOT HANDLE PDF ${pdfPath}:`, e);
                if (pageImagePath && fs.existsSync(pageImagePath)) {
                    fs.unlinkSync(pageImagePath);
                 //   console.log(`DELETED TEMPLE IMAGE AFTER COMMON ERROR: ${pageImagePath}`);
                }
            }
        }

        res.json({
            total: results.length,
            data: results,
            code: 200,
            message: `Đã tìm xong. Có ${results.length} file chứa từ khóa.`
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
let host = ""; 
let basepath = "";
let phienban = "";
let isConnecting = false;
let reconnect = 5000;
let countreconnect = 5000; 
let starting = 0;
if (typeof(Storage) !== "undefined") {
    host = sessionStorage.host
    basepath = sessionStorage.basepath;
    phienban = sessionStorage.phienban;
}
$(document).ready(function() { 
    if (sessionStorage.production == 1) {
        $("#loading").attr("src", basepath + "/assets/loading.gif?rand=" + Math.random());
    } else {
        $("#loading").attr("src", "../assets/loading.gif?rand=" + Math.random());
    }   
    setTimeout(() => {
        $('#titlemain').text("FINDING v" + phienban);
    }, 2000);
    function reconnect() {
        $("#mainshow").hide();
        $("#sthanhcong").hide();
        $("#scanhbao").show();
        $("#canhbao").text("Mất kết nối đến máy chủ!");
        let count = 1;
        let reconnect = setInterval(() => {            
            $.ajax({
                url: host,
                type: "get",
                dataType: "json", 
                success: function(response) {  
                    if (response.status == 200) {
                        isConnecting = true;
                    }
                },
                error: function(e) {
                    console.log(e);
                    isConnecting = false;
                }
            }); 
            $("#canhbao").text("Đang thử kết nối lại server lần " + count); 
            if (isConnecting) {
                $("#scanhbao").hide();
                clearInterval(reconnect);
                console.log("Đã khôi phục kết nối");
                $("#sthanhcong").show();
                $("#mainshow").show();
            }
            else
                count++;      
        }, countreconnect);
        let setti = setTimeout(() => {           
            if (count > 5 && !isConnecting)                
            window.electronAPI.runSignout(); 
            clearTimeout(setti);
        }, countreconnect * 6);
    }

    function autoloaddata() {
        table.ajax.reload();
    }

    $("#statusconnect").css("color", "red");
    //--------------
    $("#connectserver").click(function (){
        $.ajax({
            url: host,
            type: "get",
            dataType: "json",
            beforeSend: function () {
                $("#statusconnect").text("Đang kết nối vui lòng đợi....");
                $("#statusconnect").css("color", "blue");
            }, 
            success: function(response) {  
                if (response.status == 200) {
                    $("#statusconnect").text("Đã kết nối");
                    $("#statusconnect").css("color", "green");
                    autoloaddata();
                }
            },
            error: function() {
                $("#statusconnect").text("Kết nối không thành công");
                $("#statusconnect").css("color", "red");
                reconnect();
            }
        });
    });    
    
    setTimeout(() => {
        table = $('#dataTable').DataTable({
            responsive: true,
            dom: 'Blfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            ajax: host + "/system/finding",
            type: "get",
            order: [[0, 'desc']],
            columns: [     
                { "data": "tenfile" },               
                { "data": "duongdan" },
                { "data": "loai" },  
                { 
                    "data": null,
                    render: function(data, type, row) {
                        if (row.duongdan == null || row.duongdan == "") {
                            return "";
                        } else
                        return "<button id='openFileFolder' data-id='"+row.duongdan+"' class='btn btn-info btn-sm'>Mở thư mực chứa</button>"
                        + "&nbsp;&nbsp;<button id='openFile' data-id='"+row.duongdan+"' data-tenfile='"+row.tenfile+"' class='btn btn-primary btn-sm'>Mở tập tin</button>";
                    } 
                },
            ]
        });        
        $('#dataTable').on('xhr.dt', function (e, settings, json, xhr) {
            // Sự kiện này được gọi khi DataTable nhận dữ liệu từ server (dù thành công hay lỗi)
            $("#loading").hide();
        });
    }, 1000);
    //------------  

    $("#findnow").click(function(){
        $("#loading").show();
         $("#loading").show();
            let duongdan = $("input[name=duongdan]").val();
            let vanban = $("input[name=vanban]").val();
            let phuongthuc = $("select[name=phuongthuc]").val();
            console.log(phuongthuc);
            table.ajax.url(host + '/system/finding?duongdan=' + duongdan + "&vanban=" + vanban + "&phuongthuc=" + phuongthuc).load();
    });    

    $("input[name=vanban]").keypress(function (e) {
        if (e.which == 13) {
            $("#loading").show();
            let duongdan = $("input[name=duongdan]").val();
            let vanban = $("input[name=vanban]").val();
            let phuongthuc = $("select[name=phuongthuc]").val();
            table.ajax.url(host + '/system/finding?duongdan=' + duongdan + "&vanban=" + vanban + "&phuongthuc=" + phuongthuc).load();
        }
    });

    $("#toFinding").click(function(){
        open('./finding.html','_self');
    });    

    $("#btnChonThuMuc").click(function() {
        window.electronAPI.handleGetPath();
    });   

    $("#btnChonThuMucLuu").click(function() {
        window.electronAPI.handleGetPathSave();
    }); 

    window.electronAPI.getPathValue((event, value) => {        
        if (value) {
            $('#duongdan').val(value);
        } 
    })

    window.electronAPI.getPathSaveValue((event, value) => {        
        if (value) {
            $('#duongdanluu').val(value);
        } 
    })

    $(document).on('click','#openFileFolder', function(){
        const folderPath = $(this).attr('data-id');
        if (folderPath) {
            window.electronAPI.openFolderPath(folderPath);
        }
    });  

    $(document).on('click','#openFile', function(){
        const folderPath = $(this).attr('data-id');
        const fileName = $(this).attr('data-tenfile');
        if (folderPath && fileName) {
            // Nối đường dẫn file theo kiểu Windows
            let filePath = folderPath;
            if (!filePath.endsWith('\\') && !filePath.endsWith('/')) {
                filePath += '\\';
            }
            filePath += fileName;
            console.log(filePath);
            window.electronAPI.openFilePath(filePath);
        }
    });
});





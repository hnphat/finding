let host = ""; 
let basepath = "";
let ver = "";
let isConnecting = false;
let reconnect = 5000;
let countreconnect = 5000; 
window.electronAPI.handleGetBasePath((event, value) => {
    sessionStorage.host = value.host + ":" + value.port;
    host = value.host + ":" + value.port;
    console.log("Host: " + host);   
    sessionStorage.basepath = value.basepath;
    basepath = value.basepath;
    sessionStorage.ver = value.ver;
    ver = value.ver;
});
$(document).ready(function() {    
    setTimeout(() => {
        $('#titlemain').text("FINDING v" + ver);
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
                    { "data": "ghichu" }, 
                    { 
                        "data": null,
                        render: function(data, type, row) {
                            if (row.duongdan == null || row.duongdan == "") {
                                return "";
                            } else
                            return "<button id='openFile' data-id='"+row.duongdan+"' class='btn btn-info btn-sm'>Mở</button>";
                        } 
                    },
                ]
            });        
        }, 1000);
        //------------  

        $("#findnow").click(function(){
            let duongdan = $("input[name=duongdan]").val();
            let vanban = $("input[name=vanban]").val();
            table.ajax.url(host + '/system/finding?duongdan=' + duongdan + "&vanban=" + vanban).load();
        });    

        $("#toFinding").click(function(){
            open('./index.html','_self');
        });    

        $("#btnChonThuMuc").click(function() {
            window.electronAPI.handleGetPath();
        });   

        window.electronAPI.getPathValue((event, value) => {        
            if (value) {
                $('#duongdan').val(value);
            } 
        })

        $(document).on('click','#openFile', function(){
            const folderPath = $(this).attr('data-id');
            if (folderPath) {
                window.electronAPI.openFolderPath(folderPath);
            }
        });  
    }, 2000);  
});





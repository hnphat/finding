$(document).ready(function() {
    window.electronAPI.handleGetBasePath((event, value) => {
        if (typeof(Storage) !== "undefined") {
            sessionStorage.host = value.host + ":" + value.port;            
            sessionStorage.basepath = value.basepath;
            sessionStorage.phienban = value.phienban;
            sessionStorage.production = value.production;
        }       
    })
    $("#loginbtn").click(function(){
        open('pages/finding.html','_self');
    });
});
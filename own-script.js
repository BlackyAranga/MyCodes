
document.addEventListener('DOMContentLoaded',() => {
    

    var codeArray = document.getElementsByTagName('code');
    var codeArrayCount = codeArray.length;
    if(codeArrayCount != 0){
        for(var i =0; i < codeArrayCount; i++){
            var codeData = codeArray[i].innerHTML;
            codeData = codeData.replace(/&lt;(.*?)&gt;/g,"<span class='code-element'>&lt;$1&gt;</span>");
            
            codeData = codeData.replace(/"(.*?)"/g,"<span class='code-str'>&quot;$1&quot;</span>");
            
            
            codeData = codeData.replace(/\/\* (.*?) \*\//g,'<span class="code-cmt">/* $1 */</span>');
            
            
            codeArray[i].innerHTML = codeData;
        }
    }
    
    
});
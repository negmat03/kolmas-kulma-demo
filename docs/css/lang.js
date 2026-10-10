(function(){
  var KEY='kk-lang', nodes=document.querySelectorAll('[data-fi]');
  var btns=document.querySelectorAll('.lang button');
  function apply(l){
    nodes.forEach(function(n){
      var t=n.getAttribute('data-'+l);
      if(t!==null) n.textContent=t;
    });
    btns.forEach(function(b){b.setAttribute('aria-pressed', b.dataset.set===l?'true':'false');});
    document.documentElement.lang = l;
    try{localStorage.setItem(KEY,l);}catch(e){}
  }
  var start='fi';
  try{ var s=localStorage.getItem(KEY); if(s==='fi'||s==='en') start=s; }catch(e){}
  btns.forEach(function(b){ b.addEventListener('click',function(){apply(b.dataset.set);}); });
  if(start!=='fi') apply(start);
})();

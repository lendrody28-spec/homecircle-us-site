/* Overdose page: quick exit (button + Esc) and share. No tracking. */
(function(){
  function wipe(st){ try{ for(var i=st.length-1;i>=0;i--){ var k=st.key(i); if(k && /^(hc|kai)/i.test(k)) st.removeItem(k); } }catch(e){} }
  function exit(){ wipe(window.localStorage); wipe(window.sessionStorage); try{document.body.innerHTML="";}catch(e){} location.replace("https://www.google.com"); }
  var q=document.getElementById("quick-exit"); if(q) q.addEventListener("click", exit);
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && !document.querySelector("dialog[open]")) exit(); });
  var s=document.getElementById("fam-share"), st=document.getElementById("fam-share-status");
  if(s) s.addEventListener("click", function(){
    var url=location.href.split("#")[0];
    if(navigator.share){ navigator.share({title:document.title,url:url}).catch(function(){}); return; }
    if(navigator.clipboard){ navigator.clipboard.writeText(url).then(function(){st.textContent="Link copied.";},function(){st.textContent=url;}); }
    else st.textContent=url;
  });
})();

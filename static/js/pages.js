const REPO="Aghil-Echresh/IPTV";
const RAW="https://raw.githubusercontent.com/Aghil-Echresh/IPTV/main/";
const SOURCES=[RAW+"playlist.m3u8",RAW+"persian.m3u8","./playlist.m3u8","./persian.m3u8"];
const video=document.getElementById("video"),list=document.getElementById("channels"),search=document.getElementById("search"),group=document.getElementById("group"),stats=document.getElementById("stats"),now=document.getElementById("now"),source=document.getElementById("source"),refresh=document.getElementById("refresh");
let channels=[],hls=null,loading=false;

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function parseM3U(text){
 const out=[]; let item=null;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();
  if(line.startsWith("#EXTINF:")){
   const m=line.match(/^#EXTINF:-?\d+\s*(.*?),(.*)$/);
   if(!m) continue;
   const attrs={}; for(const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]]=a[2];
   item={name:(m[2]||attrs["tvg-name"]||"Unknown").trim(),logo:attrs["tvg-logo"]||"",group:attrs["group-title"]||"Other",id:attrs["tvg-id"]||""};
  }else if(item&&line&&!line.startsWith("#")){item.url=line;out.push(item);item=null}
 }
 return out;
}
function render(){
 const q=search.value.trim().toLowerCase(),g=group.value;
 const data=channels.filter(c=>(!g||c.group===g)&&(!q||c.name.toLowerCase().includes(q)||c.group.toLowerCase().includes(q)));
 stats.textContent=data.length+" شبکه";
 list.innerHTML=data.length?data.map((c,i)=>'<article class="card" tabindex="0" data-i="'+i+'">'+(c.logo?'<img loading="lazy" src="'+esc(c.logo)+'" onerror="this.style.display=\'none\'" alt="">':'')+'<h3>'+esc(c.name)+'</h3><small>'+esc(c.group)+'</small></article>').join(""):'<div class="empty">شبکه‌ای با این جستجو پیدا نشد.</div>';
 list.querySelectorAll(".card").forEach((el,i)=>{el.onclick=()=>play(data[i]);el.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")play(data[i])}});
}
function play(c){
 if(!c?.url)return;
 now.textContent="▶ "+c.name;
 if(hls){hls.destroy();hls=null}
 video.pause();video.removeAttribute("src");video.load();
 if(video.canPlayType("application/vnd.apple.mpegurl")){video.src=c.url;video.play().catch(()=>{})}
 else if(window.Hls&&Hls.isSupported()){
  hls=new Hls({enableWorker:true,lowLatencyMode:true});
  hls.loadSource(c.url);hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{}));
  hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)now.textContent="⚠️ این شبکه فعلاً قابل پخش نیست"});
 }else now.textContent="⚠️ مرورگر شما از HLS پشتیبانی نمی‌کند";
}
async function load(){
 if(loading)return; loading=true; refresh.disabled=true; stats.textContent="در حال بارگذاری...";
 list.innerHTML='<div class="empty">⏳ در حال دریافت فهرست شبکه‌ها...</div>';
 let lastError=null;
 for(const url of SOURCES){
  try{
   const r=await fetch(url,{cache:"no-store"});
   if(!r.ok)throw new Error("HTTP "+r.status);
   const text=await r.text(),parsed=parseM3U(text);
   if(!parsed.length)throw new Error("Playlist خالی است");
   channels=parsed;
   const groups=[...new Set(channels.map(c=>c.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
   group.innerHTML='<option value="">همه دسته‌ها</option>'+groups.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join("");
   source.textContent=(url.startsWith(RAW)?"⚡ منبع GitHub Raw":"📺 منبع محلی")+" · "+channels.length+" شبکه · "+groups.length+" دسته";
   render(); loading=false; refresh.disabled=false; return;
  }catch(e){lastError=e}
 }
 channels=[];stats.textContent="خطا";source.textContent="❌ دریافت Playlist ناموفق بود"+(lastError?.message?": "+lastError.message:"");list.innerHTML='<div class="empty">فهرست شبکه‌ها در دسترس نیست. دکمه «تازه‌سازی» را بزنید.</div>';
 loading=false;refresh.disabled=false;
}
search.addEventListener("input",render);
group.addEventListener("change",render);
refresh.addEventListener("click",load);
load();
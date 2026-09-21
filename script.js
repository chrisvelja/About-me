(()=>{const root=document.documentElement,toggle=document.getElementById('theme-toggle'),sun=document.getElementById('icon-sun'),moon=document.getElementById('icon-moon');function theme(t){root.setAttribute('data-theme',t);sun.style.display=t==='dark'?'none':'block';moon.style.display=t==='dark'?'block':'none'}theme(localStorage.getItem('theme')||'light');toggle.onclick=()=>{let n=root.getAttribute('data-theme')==='dark'?'light':'dark';theme(n);localStorage.setItem('theme',n)};const pages=document.querySelectorAll('.page'),nav=document.querySelectorAll('.nav-btn');function show(id){if(!document.getElementById('page-'+id))id='me';pages.forEach(p=>p.hidden=p.id!=='page-'+id);nav.forEach(b=>b.classList.toggle('is-active',b.dataset.page===id));scrollTo(0,0)}nav.forEach(b=>b.onclick=()=>{show(b.dataset.page);history.replaceState(null,'','#'+b.dataset.page)});document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{show(b.dataset.goto);history.replaceState(null,'','#'+b.dataset.goto)});function swipe(el,prev,next){let x=null,drag=false;el.onpointerdown=e=>{x=e.clientX;drag=false};el.onpointermove=e=>{if(x!==null&&Math.abs(e.clientX-x)>6)drag=true};el.onpointerup=e=>{if(x===null)return;let d=e.clientX-x;if(d>40)prev();else if(d<-40)next();x=null};el.wasDragged=()=>drag}
const CLIENT='ca46c981f9f54996b08404871f793f51';
const REDIRECT=window.location.origin+window.location.pathname.replace(/[^/]*$/,'')+'spotify-callback.html';
const SCOPE='user-read-recently-played';
const rand=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);let s='';a.forEach(v=>s+='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[v%62]);return s};
const b64url=buffer=>{const bytes=new Uint8Array(buffer);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
async function login(){
  try{
    if(!window.isSecureContext||!window.crypto?.subtle)throw new Error('Web Crypto is unavailable in this browser context.');
    const verifier=rand(64);
    localStorage.setItem('spv',verifier);
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
    const challenge=b64url(digest);
    const authUrl=new URL('https://accounts.spotify.com/authorize');
    authUrl.search=new URLSearchParams({client_id:CLIENT,response_type:'code',redirect_uri:REDIRECT,scope:SCOPE,code_challenge_method:'S256',code_challenge:challenge}).toString();
    window.location.href=authUrl.toString();
  }catch(err){
    console.error('Spotify login failed:',err);
    const box=document.getElementById('spotify-connect');
    if(box)box.querySelector('p').textContent='Spotify login error: '+(err?.message||String(err));
  }
}
async function token(){
  const t=localStorage.getItem('spt'),e=Number(localStorage.getItem('spe')||0);
  if(t&&Date.now()<e-5000)return t;
  const r=localStorage.getItem('spr');
  if(!r)return null;
  const q=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:r,client_id:CLIENT})});
  const d=await q.json();
  if(d.access_token){localStorage.setItem('spt',d.access_token);localStorage.setItem('spe',String(Date.now()+d.expires_in*1000));return d.access_token}
  return null;
}
async function auth(){
  const params=new URLSearchParams(window.location.search),code=params.get('code'),error=params.get('error');
  if(error){console.warn('Spotify authorization error:',error);return;}
  if(!code)return;
  const verifier=localStorage.getItem('spv');
  if(!verifier)return;
  const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:REDIRECT,client_id:CLIENT,code_verifier:verifier})});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error_description||d.error||'Spotify token exchange failed');
  localStorage.setItem('spt',d.access_token);localStorage.setItem('spe',String(Date.now()+d.expires_in*1000));
  if(d.refresh_token)localStorage.setItem('spr',d.refresh_token);
  localStorage.removeItem('spv');
}
async function recent(){
  const t=await token();
  if(!t)return[];
  const r=await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=24',{headers:{Authorization:'Bearer '+t}});
  if(r.status===401){localStorage.removeItem('spt');localStorage.removeItem('spe');return[]}
  if(!r.ok)return[];
  const d=await r.json(),seen={},a=[];
  (d.items||[]).forEach(x=>{const al=x.track.album;if(seen[al.id])return;seen[al.id]=1;a.push({title:al.name,artist:x.track.artists.map(z=>z.name).join(', '),cover:al.images?.[0]?.url||'',url:al.external_urls?.spotify||''})});
  return a;
}
let stage=document.querySelector('.vinyl-stage'),track=document.getElementById('vinyl-track'),albums=[],gi=0;const pos=[{x:0,y:-24,r:-2,s:1.08},{x:50,y:14,r:5,s:.97},{x:0,y:48,r:-4,s:.95},{x:-50,y:14,r:4,s:.97}];function render(){track.innerHTML='';let g=albums.slice(gi*4,gi*4+4);g.forEach((a,i)=>{let e=document.createElement('div');e.className='vinyl-card';e.style.backgroundImage=a.cover?'url("'+a.cover+'")':'linear-gradient(135deg,var(--accent),#7C8A6E)';e.style.backgroundSize='cover';e.style.backgroundPosition='center';let p=pos[i];e.style.transform=`translate(-50%,-50%) translate(${p.x}px,${p.y}px) rotate(${p.r}deg) scale(${p.s})`;e.onclick=()=>{if(!stage.wasDragged()){document.getElementById('music-shelf').hidden=true;document.getElementById('vinyl-detail').hidden=false;detail=i+gi*4;fill()}};track.appendChild(e)})}swipe(stage,()=>{if(gi)gi--,render()},()=>{if(gi<Math.ceil(albums.length/4)-1)gi++,render()});let detail=0;function fill(){let a=albums[detail];document.getElementById('vinyl-title').textContent=a.title;document.getElementById('vinyl-artist').textContent=a.artist;document.getElementById('vinyl-played').textContent='Recently played';document.getElementById('vinyl-disc-pop').style.backgroundImage=a.cover?'url("'+a.cover+'")':'';document.getElementById('vinyl-play').onclick=()=>open(a.url)}document.getElementById('vinyl-back').onclick=()=>{document.getElementById('vinyl-detail').hidden=true;document.getElementById('music-shelf').hidden=false;gi=Math.floor(detail/4);render()};document.getElementById('spotify-connect-btn').onclick=login;async function music(){await auth();albums=await recent();if(albums.length){document.getElementById('spotify-connect').hidden=true;document.getElementById('music-shelf').hidden=false;render()}}music();const books=[['Book One','Author Name','A summary of what the book is about and why it stuck with you.','#'],['Book Two','Author Name','A summary of what the book is about and why it stuck with you.','#'],['Book Three','Author Name','A summary of what the book is about and why it stuck with you.','#'],['Book Four','Author Name','A summary of what the book is about and why it stuck with you.','#']];let bi=0;function book(){let b=books[bi];document.getElementById('book-title').textContent=b[0];document.getElementById('book-author').textContent='by '+b[1];document.getElementById('book-about').textContent=b[2];document.getElementById('book-link').href=b[3];document.getElementById('book-cover').style.background='linear-gradient(135deg,var(--accent),#2A2E32)'}document.getElementById('book-prev').onclick=()=>{if(bi)bi--,book()};document.getElementById('book-next').onclick=()=>{if(bi<books.length-1)bi++,book()};swipe(document.getElementById('book-spread'),()=>{if(bi)bi--,book()},()=>{if(bi<books.length-1)bi++,book()});book();show((location.hash||'#me').slice(1))})()
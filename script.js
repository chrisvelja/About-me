(function(){
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  var sun = document.getElementById('icon-sun');
  var moon = document.getElementById('icon-moon');
  function applyTheme(t){
    if(t){ root.setAttribute('data-theme', t); }
    var isDark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    sun.style.display = isDark ? 'none' : 'block';
    moon.style.display = isDark ? 'block' : 'none';
  }
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch(e){}
  applyTheme(saved);
  toggle.addEventListener('click', function(){
    var current = root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch(e){}
  });

  var pages = document.querySelectorAll('.page');
  var navBtns = document.querySelectorAll('.nav-btn');
  function showPage(id){
    if(!document.getElementById('page-' + id)) id = 'me';
    pages.forEach(function(p){ p.hidden = p.id !== 'page-' + id; });
    navBtns.forEach(function(b){ b.classList.toggle('is-active', b.dataset.page === id); });
    window.scrollTo(0, 0);
  }
  navBtns.forEach(function(b){
    b.addEventListener('click', function(){ showPage(b.dataset.page); history.replaceState(null, '', '#' + b.dataset.page); });
  });
  document.querySelectorAll('[data-goto]').forEach(function(el){
    el.addEventListener('click', function(){ showPage(el.dataset.goto); history.replaceState(null, '', '#' + el.dataset.goto); });
  });

  function addSwipe(el, onPrev, onNext){
    var sx = null, dragged = false;
    el.addEventListener('pointerdown', function(e){ sx = e.clientX; dragged = false; });
    window.addEventListener('pointermove', function(e){ if(sx !== null && Math.abs(e.clientX - sx) > 6) dragged = true; });
    window.addEventListener('pointerup', function(e){
      if(sx === null) return;
      var dx = e.clientX - sx;
      if(dx > 40) onPrev(); else if(dx < -40) onNext();
      sx = null;
    });
    el.wasDragged = function(){ return dragged; };
  }

  /* ---------- Spotify (PKCE, client-side only) ----------
     1. Create an app at https://developer.spotify.com/dashboard
     2. Add this page's exact URL as a Redirect URI in the app settings
     3. Paste the app's Client ID below                              */
  var SPOTIFY_CLIENT_ID = 'ca46c981f9f54996b08404871f793f51';
  var SPOTIFY_REDIRECT_URI = 'https://chrisvelja.github.io/About-me/';
  var SPOTIFY_SCOPES = 'user-read-recently-played';

  function randomString(len){
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var out = '', arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    arr.forEach(function(v){ out += possible[v % possible.length]; });
    return out;
  }
  function sha256(plain){ return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain)); }
  function base64UrlEncode(buf){
    var bytes = new Uint8Array(buf), str = '';
    bytes.forEach(function(b){ str += String.fromCharCode(b); });
    return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  async function spotifyLogin(){
    var verifier = randomString(64);
    var challenge = base64UrlEncode(await sha256(verifier));
    try { localStorage.setItem('sp_verifier', verifier); } catch(e){}
    var authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: SPOTIFY_REDIRECT_URI,
      scope: SPOTIFY_SCOPES, code_challenge_method: 'S256', code_challenge: challenge
    });
    window.location.href = authUrl;
  }
  function saveTokens(data){
    var expiresAt = Date.now() + (data.expires_in * 1000);
    try {
      localStorage.setItem('sp_access_token', data.access_token);
      if(data.refresh_token) localStorage.setItem('sp_refresh_token', data.refresh_token);
      localStorage.setItem('sp_expires_at', String(expiresAt));
    } catch(e){}
  }
  async function handleSpotifyRedirect(){
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    if(!code) return;
    var verifier = null;
    try { verifier = localStorage.getItem('sp_verifier'); } catch(e){}
    if(!verifier) return;
    var res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({grant_type:'authorization_code', code:code, redirect_uri:SPOTIFY_REDIRECT_URI, client_id:SPOTIFY_CLIENT_ID, code_verifier:verifier})
    });
    var data = await res.json();
    if(data.access_token){ saveTokens(data); history.replaceState(null, '', window.location.pathname + window.location.hash); }
  }
  async function refreshAccessToken(){
    var refreshToken = null;
    try { refreshToken = localStorage.getItem('sp_refresh_token'); } catch(e){}
    if(!refreshToken) return null;
    var res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({grant_type:'refresh_token', refresh_token:refreshToken, client_id:SPOTIFY_CLIENT_ID})
    });
    var data = await res.json();
    if(data.access_token){ saveTokens(data); return data.access_token; }
    return null;
  }
  async function getValidAccessToken(){
    var token = null, expiresAt = 0;
    try { token = localStorage.getItem('sp_access_token'); expiresAt = Number(localStorage.getItem('sp_expires_at') || 0); } catch(e){}
    if(!token) return null;
    if(Date.now() > expiresAt - 5000){ token = await refreshAccessToken(); }
    return token;
  }
  function dayLabelFor(iso){
    var d = new Date(iso), now = new Date();
    var d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((n0 - d0) / 86400000);
    if(diff <= 0) return 'Today';
    if(diff === 1) return 'Yesterday';
    return diff + ' days ago';
  }
  async function fetchRecentlyPlayed(){
    var token = await getValidAccessToken();
    if(!token) return null;
    var res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=24', { headers: {'Authorization':'Bearer ' + token} });
    if(!res.ok) return null;
    var data = await res.json();
    var seen = {}, items = [];
    (data.items || []).forEach(function(it){
      var track = it.track, album = track.album;
      if(seen[album.id]) return;
      seen[album.id] = true;
      items.push({
        title: album.name,
        artist: track.artists.map(function(ar){ return ar.name; }).join(', '),
        cover: album.images && album.images[0] ? album.images[0].url : '',
        spotifyUrl: album.external_urls ? album.external_urls.spotify : '',
        dayLabel: dayLabelFor(it.played_at)
      });
    });
    return items;
  }

  var currentSvc = 'spotify';
  try { currentSvc = localStorage.getItem('musicSvc') || 'spotify'; } catch(e){}
  document.querySelectorAll('.svc-btn').forEach(function(b){
    b.classList.toggle('is-active', b.dataset.svc === currentSvc);
    b.addEventListener('click', function(){
      currentSvc = b.dataset.svc;
      document.querySelectorAll('.svc-btn').forEach(function(x){ x.classList.toggle('is-active', x === b); });
      try { localStorage.setItem('musicSvc', currentSvc); } catch(e){}
    });
  });
  function playUrl(a){
    if(currentSvc === 'spotify' && a.spotifyUrl) return a.spotifyUrl;
    var q = encodeURIComponent(a.title + ' ' + a.artist);
    return currentSvc === 'apple' ? 'https://music.apple.com/search?term=' + q : 'https://open.spotify.com/search/' + q;
  }

  function vinylCardSize(){ return Math.max(140, Math.min(200, window.innerWidth * 0.17)); }
  function discPopSize(){ return Math.max(155, Math.min(230, window.innerWidth * 0.2)); }
  var positionRatios = [
    {x:0, y:-0.1875, r:-2, s:1.08},
    {x:0.39, y:0.109, r:5, s:0.97},
    {x:0, y:0.375, r:-4, s:0.95},
    {x:-0.39, y:0.109, r:4, s:0.97}
  ];
  var albums = [], groups = [], groupIndex = 0, detailIndex = 0;
  var vTrack = document.getElementById('vinyl-track');
  var vStage = document.querySelector('.vinyl-stage');
  var dayLabelEl = document.getElementById('music-day-label');
  var vDetail = document.getElementById('vinyl-detail');

  function setupLiveAlbums(items){
    albums = items;
    groups = [];
    for(var i = 0; i < albums.length; i += 4){
      var idxs = [];
      for(var j = i; j < Math.min(i + 4, albums.length); j++) idxs.push(j);
      groups.push({label: albums[i].dayLabel, indices: idxs});
    }
    groupIndex = 0;
  }
  function renderCluster(){
    vTrack.style.opacity = '0';
    setTimeout(function(){
      vTrack.innerHTML = '';
      var grp = groups[groupIndex];
      dayLabelEl.textContent = grp.label;
      var size = vinylCardSize();
      vStage.style.height = Math.round(size * 1.85) + 'px';
      grp.indices.forEach(function(flatIdx, pos){
        var p = positionRatios[pos] || positionRatios[positionRatios.length - 1];
        var a = albums[flatIdx];
        var el = document.createElement('div');
        el.className = 'vinyl-card';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        if(a.cover){ el.style.backgroundImage = "url('" + a.cover + "')"; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
        else { el.style.background = 'linear-gradient(135deg,var(--accent),#7C8A6E)'; el.innerHTML = '<span class="cover-label">' + a.title + '</span>'; }
        el.style.transform = 'translate(-50%,-50%) translate(' + (p.x * size) + 'px,' + (p.y * size) + 'px) rotate(' + p.r + 'deg) scale(' + p.s + ')';
        el.style.zIndex = String(10 - pos);
        el.addEventListener('click', function(){ if(vStage.wasDragged()) return; openDetail(flatIdx); });
        vTrack.appendChild(el);
      });
      vTrack.style.opacity = '1';
    }, 140);
  }
  addSwipe(vStage, function(){ if(groupIndex > 0){ groupIndex--; renderCluster(); } }, function(){ if(groupIndex < groups.length - 1){ groupIndex++; renderCluster(); } });

  function fillDetail(){
    var a = albums[detailIndex];
    document.getElementById('vinyl-played').textContent = 'Played ' + a.dayLabel.toLowerCase();
    document.getElementById('vinyl-title').textContent = a.title;
    document.getElementById('vinyl-artist').textContent = a.artist;
    var pop = document.getElementById('vinyl-disc-pop');
    var dSize = discPopSize();
    pop.style.width = dSize + 'px';
    pop.style.height = dSize + 'px';
    if(a.cover){ pop.style.backgroundImage = "url('" + a.cover + "')"; pop.style.backgroundSize = 'cover'; pop.style.backgroundPosition = 'center'; }
    else { pop.style.background = 'linear-gradient(135deg,var(--accent),#7C8A6E)'; }
    document.getElementById('vinyl-play').onclick = function(){ window.open(playUrl(a), '_blank', 'noopener'); };
  }
  function openDetail(i){
    detailIndex = i;
    document.getElementById('music-shelf').hidden = true;
    vDetail.hidden = false;
    fillDetail();
    var pop = document.getElementById('vinyl-disc-pop');
    pop.classList.remove('is-out');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ pop.classList.add('is-out'); }); });
  }
  addSwipe(vDetail, function(){ if(detailIndex > 0){ detailIndex--; fillDetail(); } }, function(){ if(detailIndex < albums.length - 1){ detailIndex++; fillDetail(); } });
  document.getElementById('vinyl-back').addEventListener('click', function(){
    vDetail.hidden = true;
    var lbl = albums[detailIndex].dayLabel;
    for(var g = 0; g < groups.length; g++){ if(groups[g].label === lbl){ groupIndex = g; break; } }
    document.getElementById('music-shelf').hidden = false;
    renderCluster();
  });

  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
      if(albums.length && !document.getElementById('music-shelf').hidden) renderCluster();
      if(!vDetail.hidden) fillDetail();
    }, 150);
  });

  document.getElementById('spotify-connect-btn').addEventListener('click', spotifyLogin);
  async function bootMusic(){
    try{
      await handleSpotifyRedirect();
      var token = await getValidAccessToken();
      if(token){
        var items = await fetchRecentlyPlayed();
        if(items && items.length){
          setupLiveAlbums(items);
          document.getElementById('spotify-connect').hidden = true;
          document.getElementById('music-shelf').hidden = false;
          renderCluster();
          return;
        }
      }
    } catch(e){}
    document.getElementById('spotify-connect').hidden = false;
    document.getElementById('music-shelf').hidden = true;
  }
  bootMusic();

  var books = [
    {title:'Book One', author:'Author Name', about:'A summary of what the book is about and why it stuck with you.', link:'#'},
    {title:'Book Two', author:'Author Name', about:'A summary of what the book is about and why it stuck with you.', link:'#'},
    {title:'Book Three', author:'Author Name', about:'A summary of what the book is about and why it stuck with you.', link:'#'},
    {title:'Book Four', author:'Author Name', about:'A summary of what the book is about and why it stuck with you.', link:'#'}
  ];
  var bookCovers = ['#B8783C','#4C6FA5','#A55C7A','#5C8F6B'];
  var bookIndex = 0;
  function renderBook(){
    var b = books[bookIndex];
    document.getElementById('book-title').textContent = b.title;
    document.getElementById('book-author').textContent = 'by ' + b.author;
    document.getElementById('book-about').textContent = b.about;
    document.getElementById('book-link').href = b.link;
    document.getElementById('book-cover').style.background = 'linear-gradient(135deg,' + bookCovers[bookIndex % bookCovers.length] + ',#2A2E32)';
  }
  document.getElementById('book-prev').addEventListener('click', function(){ if(bookIndex > 0){ bookIndex--; renderBook(); } });
  document.getElementById('book-next').addEventListener('click', function(){ if(bookIndex < books.length - 1){ bookIndex++; renderBook(); } });
  addSwipe(document.getElementById('book-spread'), function(){ if(bookIndex > 0){ bookIndex--; renderBook(); } }, function(){ if(bookIndex < books.length - 1){ bookIndex++; renderBook(); } });
  renderBook();

  showPage((location.hash || '#me').slice(1));
})();

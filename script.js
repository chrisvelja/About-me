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

    var wheelAccum = 0, wheelTimer = null, wheelLocked = false;
    el.addEventListener('wheel', function(e){
      if(Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if(wheelLocked) return;
      wheelAccum += e.deltaX;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function(){ wheelAccum = 0; }, 200);
      if(Math.abs(wheelAccum) > 60){
        wheelLocked = true;
        if(wheelAccum > 0) onNext(); else onPrev();
        wheelAccum = 0;
        setTimeout(function(){ wheelLocked = false; }, 400);
      }
    }, {passive:false});
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

  function dayLabelFor(iso){
    var d = new Date(iso), now = new Date();
    var d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((n0 - d0) / 86400000);
    if(diff <= 0) return 'Today';
    if(diff === 1) return 'Yesterday';
    return diff + ' days ago';
  }

  function vinylCardSize(){ return Math.max(140, Math.min(200, window.innerWidth * 0.17)); }
  function discPopSize(){ return Math.max(155, Math.min(230, window.innerWidth * 0.2)); }
  var positionRatios = [
    {x:0, y:-0.34, r:-3, s:1.08},
    {x:0.68, y:0.20, r:6, s:0.96},
    {x:0, y:0.68, r:-5, s:0.94},
    {x:-0.68, y:0.20, r:5, s:0.96}
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
      vStage.style.height = Math.round(size * 2.1) + 'px';
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

  async function loadMusicData(){
    try{
      var res = await fetch('music-data.json', {cache:'no-store'});
      if(!res.ok) throw new Error('missing');
      var raw = await res.json();
      if(!raw || !raw.length) throw new Error('empty');
      setupLiveAlbums(raw.map(function(e){
        return {title:e.title, artist:e.artist, cover:e.cover, spotifyUrl:e.spotifyUrl, dayLabel: dayLabelFor(e.playedAt)};
      }));
      document.getElementById('music-empty').hidden = true;
      document.getElementById('music-shelf').hidden = false;
      renderCluster();
    } catch(e){
      document.getElementById('music-empty').hidden = false;
      document.getElementById('music-shelf').hidden = true;
    }
  }
  loadMusicData();

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

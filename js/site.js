(function(){
  const page=document.body.dataset.page||"me";
  const nav=[
    ["me","Me","index.html","ME"],
    ["projects","Project","projects.html","PROJECT"],
    ["news","News","news.html","NEWS"],
    ["music","Music","music.html","MUSIC"],
    ["books","Books","books.html","BOOKS"],
    ["contact","Contact","contact.html","CONTACT"]
  ];

  document.querySelectorAll("[data-nav-placeholder]").forEach(m=>{
    const n=document.createElement("nav");
    n.className="bottom-nav";
    n.innerHTML=nav.map(([id,label,href,abbr])=>
      '<a class="nav-item '+(page===id?"active":"")+'" href="'+href+'"><span class="nav-icon">'+abbr+'</span><span>'+label+'</span></a>'
    ).join("");
    m.replaceWith(n);
  });

  /* Theme */
  const root=document.documentElement;
  const themeKey="cv-theme";
  if(localStorage.getItem(themeKey)==="dark") root.dataset.theme="dark";
  const syncTheme=()=>{
    document.querySelectorAll("[data-theme-icon]").forEach(x=>{
      x.textContent=root.dataset.theme==="dark"?"☾":"☼";
    });
  };
  syncTheme();
  document.querySelectorAll("[data-theme-toggle]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(root.dataset.theme==="dark") delete root.dataset.theme;
      else root.dataset.theme="dark";
      localStorage.setItem(themeKey,root.dataset.theme||"light");
      syncTheme();
    });
  });

  /* Project modal */
  const modal=document.getElementById("project-modal");
  const title=document.getElementById("modal-title");
  const copy=document.getElementById("modal-copy");
  const kicker=document.getElementById("modal-kicker");
  document.querySelectorAll("[data-project]").forEach(button=>{
    button.addEventListener("click",()=>{
      const p=window.SITE_DATA.projects?.[button.dataset.project];
      if(!p || !modal) return;
      kicker.textContent=p.kicker;
      title.textContent=p.title;
      copy.textContent=p.copy;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden","false");
    });
  });
  document.querySelectorAll("[data-project-close]").forEach(el=>{
    el.addEventListener("click",()=>{
      modal?.classList.remove("open");
      modal?.setAttribute("aria-hidden","true");
    });
  });

  /* Music: exactly four records per set, arranged like the supplied sketch. */
  const music=window.SITE_DATA.music||[];
  const musicStage=document.querySelector("[data-music-carousel]");
  const musicPhone=document.querySelector("[data-music-phone]");
  const setCurrent=document.querySelector("[data-vinyl-set-current]");
  const setTotal=document.querySelector("[data-vinyl-set-total]");
  let musicSet=0;
  let musicIndex=0;
  let activeService="spotify";

  const totalSets=Math.max(1,Math.ceil(music.length/4));
  if(setTotal) setTotal.textContent=String(totalSets).padStart(2,"0");

  function cardFor(item,index,slot){
    const card=document.createElement("button");
    card.type="button";
    card.className="vinyl-card";
    card.dataset.slot=String(slot);
    card.dataset.musicIndex=String(index);
    card.setAttribute("aria-label","Select "+item.title+" by "+item.artist);
    card.innerHTML=
      '<span class="vinyl-art '+(item.coverClass||"cover-a")+'">'+
        '<span class="vinyl-number">'+item.number+"</span>"+
        '<span class="vinyl-title">'+item.title+"</span>"+
      "</span>";
    card.addEventListener("click",()=>selectMusic(index,true));
    return card;
  }

  function renderSet(){
    if(!musicStage) return;
    musicStage.innerHTML="";
    if(!music.length) return;
    const start=musicSet*4;
    const currentSetItems=[];
    for(let slot=0;slot<4;slot++){
      const index=start+slot;
      if(index<music.length){
        currentSetItems.push({item:music[index],index,slot});
      }
    }
    currentSetItems.forEach(({item,index,slot})=>{
      musicStage.appendChild(cardFor(item,index,slot));
    });
    if(setCurrent) setCurrent.textContent=String(musicSet+1).padStart(2,"0");
  }

  function selectMusic(index,openPhone){
    if(!music[index]) return;
    musicIndex=index;
    musicSet=Math.floor(index/4);
    renderSet();
    const item=music[index];
    const titleEl=document.querySelector("[data-current-title]");
    const artistEl=document.querySelector("[data-current-artist]");
    const artEl=document.querySelector("[data-current-art]");
    if(titleEl) titleEl.textContent=item.title;
    if(artistEl) artistEl.textContent=item.artist;
    if(artEl){
      artEl.className="phone-album-art album-art "+(item.coverClass||"cover-a");
      artEl.innerHTML="<span>"+item.number+"</span>";
    }
    if(openPhone && musicPhone){
      musicPhone.classList.add("visible");
      musicPhone.scrollIntoView({behavior:"smooth",block:"center"});
    }
  }

  function changeSet(direction){
    if(!music.length) return;
    musicSet=(musicSet+direction+totalSets)%totalSets;
    const firstIndex=musicSet*4;
    musicIndex=Math.min(firstIndex,music.length-1);
    renderSet();
    selectMusic(musicIndex,false);
  }

  renderSet();
  if(music.length) selectMusic(0,false);

  let touchStartX=null;
  musicStage?.addEventListener("touchstart",e=>{
    touchStartX=e.changedTouches[0].clientX;
  },{passive:true});
  musicStage?.addEventListener("touchend",e=>{
    if(touchStartX===null) return;
    const dx=e.changedTouches[0].clientX-touchStartX;
    if(Math.abs(dx)>45) changeSet(dx<0?1:-1);
    touchStartX=null;
  },{passive:true});

  let pointerStartX=null;
  musicStage?.addEventListener("pointerdown",e=>{pointerStartX=e.clientX});
  musicStage?.addEventListener("pointerup",e=>{
    if(pointerStartX===null) return;
    const dx=e.clientX-pointerStartX;
    if(Math.abs(dx)>60) changeSet(dx<0?1:-1);
    pointerStartX=null;
  });

  /* Music service choice */
  document.querySelectorAll("[data-service-select]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      activeService=btn.dataset.serviceSelect;
      document.querySelectorAll("[data-service-select]").forEach(x=>x.classList.toggle("active",x===btn));
    });
  });

  const serviceModal=document.querySelector("[data-service-modal]");
  const spotifyLink=document.querySelector("[data-spotify-link]");
  const appleLink=document.querySelector("[data-apple-link]");
  const serviceTitle=document.querySelector("#service-title");
  const serviceArtist=document.querySelector("#service-artist");

  function openServiceModal(){
    const item=music[musicIndex];
    if(!item || !serviceModal) return;
    serviceTitle.textContent=item.title;
    serviceArtist.textContent=item.artist;
    spotifyLink.href=item.spotify||"#";
    appleLink.href=item.apple||"#";
    serviceModal.classList.add("open");
    serviceModal.setAttribute("aria-hidden","false");
  }
  document.querySelector("[data-listen-open]")?.addEventListener("click",openServiceModal);
  document.querySelectorAll("[data-service-close]").forEach(el=>{
    el.addEventListener("click",()=>{
      serviceModal?.classList.remove("open");
      serviceModal?.setAttribute("aria-hidden","true");
    });
  });
  document.querySelector("[data-music-phone-close]")?.addEventListener("click",()=>{
    musicPhone?.classList.remove("visible");
  });

  /* Spotify OAuth 2.0 Authorization Code with PKCE.
     The client ID is safe to expose in a browser app; do not put a client secret here. */
  const spotifyConfig=window.SITE_DATA.spotify||{};
  const spotifyClientId=spotifyConfig.clientId||"";
  const spotifyRedirectUri=spotifyConfig.redirectUri||(
    window.location.origin+window.location.pathname
  );
  const spotifyScopes="user-read-currently-playing user-read-recently-played";

  const connectButton=document.querySelector("[data-spotify-connect]");
  const connectLabel=document.querySelector("[data-spotify-connect-label]");
  const statusDot=document.querySelector("[data-spotify-status-dot]");
  const spotifyMessage=document.querySelector("[data-spotify-message]");
  const historyList=document.querySelector("[data-spotify-history-list]");
  const historyTitle=document.querySelector("[data-history-title]");

  function setSpotifyUi(connected,message){
    connectButton?.classList.toggle("connected",connected);
    if(connectLabel) connectLabel.textContent=connected?"Spotify connected":"Connect Spotify";
    if(statusDot) statusDot.classList.toggle("connected",connected);
    if(message && spotifyMessage) spotifyMessage.textContent=message;
  }

  function randomString(length=64){
    const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const bytes=new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>chars[b%chars.length]).join("");
  }

  async function sha256(value){
    const data=new TextEncoder().encode(value);
    return crypto.subtle.digest("SHA-256",data);
  }

  function base64Url(buffer){
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }

  async function startSpotifyLogin(){
    if(!spotifyClientId){
      setSpotifyUi(false,"Add your Spotify Client ID in data/content.js first. The client secret must never be added to this site.");
      return;
    }
    const verifier=randomString(64);
    const challenge=base64Url(await sha256(verifier));
    const state=randomString(32);
    localStorage.setItem("spotify_pkce_verifier",verifier);
    localStorage.setItem("spotify_oauth_state",state);

    const url=new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("response_type","code");
    url.searchParams.set("client_id",spotifyClientId);
    url.searchParams.set("scope",spotifyScopes);
    url.searchParams.set("redirect_uri",spotifyRedirectUri);
    url.searchParams.set("state",state);
    url.searchParams.set("code_challenge_method","S256");
    url.searchParams.set("code_challenge",challenge);
    window.location.href=url.toString();
  }

  async function exchangeSpotifyCode(code){
    const verifier=localStorage.getItem("spotify_pkce_verifier");
    if(!verifier || !spotifyClientId) throw new Error("Missing PKCE state.");
    const body=new URLSearchParams({
      grant_type:"authorization_code",
      code,
      redirect_uri:spotifyRedirectUri,
      client_id:spotifyClientId,
      code_verifier:verifier
    });
    const response=await fetch("https://accounts.spotify.com/api/token",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body
    });
    if(!response.ok) throw new Error("Spotify token exchange failed.");
    const token=await response.json();
    localStorage.setItem("spotify_access_token",token.access_token);
    if(token.refresh_token) localStorage.setItem("spotify_refresh_token",token.refresh_token);
    localStorage.setItem("spotify_token_expires",String(Date.now()+((token.expires_in||3600)-60)*1000));
    localStorage.removeItem("spotify_pkce_verifier");
    localStorage.removeItem("spotify_oauth_state");
    return token.access_token;
  }

  async function refreshSpotifyToken(){
    const refreshToken=localStorage.getItem("spotify_refresh_token");
    if(!refreshToken) return null;
    const body=new URLSearchParams({
      grant_type:"refresh_token",
      refresh_token:refreshToken,
      client_id:spotifyClientId
    });
    const response=await fetch("https://accounts.spotify.com/api/token",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body
    });
    if(!response.ok){
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("spotify_refresh_token");
      return null;
    }
    const token=await response.json();
    localStorage.setItem("spotify_access_token",token.access_token);
    if(token.refresh_token) localStorage.setItem("spotify_refresh_token",token.refresh_token);
    localStorage.setItem("spotify_token_expires",String(Date.now()+((token.expires_in||3600)-60)*1000));
    return token.access_token;
  }

  async function getSpotifyToken(){
    const access=localStorage.getItem("spotify_access_token");
    const expires=Number(localStorage.getItem("spotify_token_expires")||0);
    if(access && Date.now()<expires) return access;
    return await refreshSpotifyToken();
  }

  function spotifySearchLinks(track){
    const q=encodeURIComponent((track.name||"")+" "+(track.artists?.map(a=>a.name).join(" ")||""));
    return {
      spotify:"https://open.spotify.com/search/"+q,
      apple:"https://music.apple.com/us/search?term="+q
    };
  }

  function displayHistory(items){
    if(!historyList) return;
    historyList.innerHTML="";
    if(!items.length){
      historyList.innerHTML='<p class="history-empty">No recent Spotify tracks were returned.</p>';
      return;
    }
    items.slice(0,12).forEach((entry,index)=>{
      const track=entry.track;
      const links=spotifySearchLinks(track);
      const row=document.createElement("a");
      row.className="history-row";
      row.href=activeService==="spotify"?links.spotify:links.apple;
      row.target="_blank";
      row.rel="noreferrer";
      const image=track.album?.images?.[0]?.url||"";
      row.innerHTML=
        '<span class="history-number">'+String(index+1).padStart(2,"0")+"</span>"+
        '<span class="history-cover" style="background-image:url('+JSON.stringify(image)+')"></span>'+
        '<span class="history-track"><strong>'+escapeHtml(track.name||"Unknown track")+"</strong><small>"+escapeHtml(track.artists?.map(a=>a.name).join(", ")||"Unknown artist")+"</small></span>"+
        '<span class="history-arrow">↗</span>';
      historyList.appendChild(row);
    });
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#039;"}[c]));
  }

  async function loadSpotifyHistory(){
    const token=await getSpotifyToken();
    if(!token){
      setSpotifyUi(false,"Connect your Spotify account to replace the placeholders with your recently played music.");
      if(historyTitle) historyTitle.textContent="Connect your account";
      return;
    }
    setSpotifyUi(true,"");
    if(historyTitle) historyTitle.textContent="Recently played";
    if(spotifyMessage) spotifyMessage.textContent="Your recent Spotify listening appears here.";
    const response=await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20",{
      headers:{Authorization:"Bearer "+token}
    });
    if(response.status===401){
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("spotify_token_expires");
      return loadSpotifyHistory();
    }
    if(!response.ok){
      setSpotifyUi(true,"Spotify returned an error while loading your listening history.");
      return;
    }
    const data=await response.json();
    displayHistory(data.items||[]);
  }

  /* Handle the PKCE callback when Spotify returns to music.html. */
  (async function handleSpotifyCallback(){
    const params=new URLSearchParams(window.location.search);
    const code=params.get("code");
    const returnedState=params.get("state");
    const error=params.get("error");
    if(error){
      setSpotifyUi(false,"Spotify authorization was not completed.");
      history.replaceState({},document.title,window.location.pathname);
      return;
    }
    if(code){
      const savedState=localStorage.getItem("spotify_oauth_state");
      if(!savedState || returnedState!==savedState){
        setSpotifyUi(false,"Spotify login state could not be verified. Please connect again.");
        history.replaceState({},document.title,window.location.pathname);
        return;
      }
      try{
        await exchangeSpotifyCode(code);
        history.replaceState({},document.title,window.location.pathname);
        await loadSpotifyHistory();
      }catch(err){
        setSpotifyUi(false,"Spotify connection failed. Check the app's redirect URI and Client ID.");
      }
      return;
    }
    if(localStorage.getItem("spotify_refresh_token")||localStorage.getItem("spotify_access_token")){
      await loadSpotifyHistory();
    }
  })();

  connectButton?.addEventListener("click",async()=>{
    const token=await getSpotifyToken();
    if(token) await loadSpotifyHistory();
    else await startSpotifyLogin();
  });
  document.querySelector("[data-spotify-history-refresh]")?.addEventListener("click",loadSpotifyHistory);

  /* Books */
  const books=window.SITE_DATA.books||[];
  let bookIndex=0;
  const bookTitle=document.querySelector("[data-current-book-title]");
  const bookAuthor=document.querySelector("[data-current-book-author]");
  const bookDescription=document.querySelector("[data-current-book-description]");
  const bookYear=document.querySelector("[data-current-book-year]");
  const bookCover=document.querySelector("[data-current-book-cover]");
  const bookOpen=document.querySelector("[data-book-open]");

  function updateBook(item){
    if(!item) return;
    if(bookTitle) bookTitle.textContent=item.title;
    if(bookAuthor) bookAuthor.textContent=item.author;
    if(bookDescription) bookDescription.textContent=item.description;
    if(bookYear) bookYear.textContent=item.year;
    if(bookCover){
      bookCover.className="book-cover "+item.coverClass;
      bookCover.innerHTML='<span class="cover-number">'+item.number+'</span><span class="cover-title">'+item.cover.replace(/\n/g,"<br>")+"</span>";
    }
    if(bookOpen) bookOpen.dataset.bookIndex=String(bookIndex);
  }

  document.querySelector("[data-book-prev]")?.addEventListener("click",()=>{
    bookIndex=(bookIndex-1+books.length)%books.length;
    updateBook(books[bookIndex]);
  });
  document.querySelector("[data-book-next]")?.addEventListener("click",()=>{
    bookIndex=(bookIndex+1)%books.length;
    updateBook(books[bookIndex]);
  });

  const bookArchive=document.querySelector("[data-book-archive]");
  if(bookArchive){
    books.forEach((item,index)=>{
      const row=document.createElement("button");
      row.type="button";
      row.className="book-archive-row";
      row.innerHTML=
        '<span class="book-row-number">'+item.number+"</span>"+
        '<span class="book-row-title"><strong>'+item.title+"</strong><small>"+item.author+"</small></span>"+
        '<span class="book-row-year">'+item.year+"</span>"+
        '<span class="book-row-arrow">→</span>';
      row.addEventListener("click",()=>{
        bookIndex=index;
        updateBook(item);
        document.querySelector(".book-feature")?.scrollIntoView({behavior:"smooth",block:"center"});
      });
      bookArchive.appendChild(row);
    });
    const count=document.querySelector("[data-book-count]");
    if(count) count.textContent=String(books.length).padStart(2,"0")+" BOOKS";
  }
  if(books.length) updateBook(books[0]);

  const bookModal=document.querySelector("[data-book-modal]");
  const bookModalTitle=document.querySelector("#book-modal-title");
  const bookModalAuthor=document.querySelector("#book-modal-author");
  const bookModalLink=document.querySelector("[data-book-link]");
  document.querySelector("[data-book-open]")?.addEventListener("click",()=>{
    const item=books[bookIndex];
    if(!item || !bookModal) return;
    bookModalTitle.textContent=item.title;
    bookModalAuthor.textContent=item.author;
    bookModalLink.href=item.link;
    bookModalLink.style.display=item.link==="#"?"none":"inline-flex";
    bookModal.classList.add("open");
    bookModal.setAttribute("aria-hidden","false");
  });
  document.querySelectorAll("[data-book-close]").forEach(el=>{
    el.addEventListener("click",()=>{
      bookModal?.classList.remove("open");
      bookModal?.setAttribute("aria-hidden","true");
    });
  });

  /* Global keyboard controls */
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      document.querySelectorAll(".overlay.open,.service-modal.open,.book-modal.open").forEach(el=>{
        el.classList.remove("open");
        el.setAttribute("aria-hidden","true");
      });
    }
    if(document.body.dataset.page==="music"){
      if(e.key==="ArrowLeft") changeSet(-1);
      if(e.key==="ArrowRight") changeSet(1);
    }
    if(document.body.dataset.page==="books"){
      if(e.key==="ArrowLeft") document.querySelector("[data-book-prev]")?.click();
      if(e.key==="ArrowRight") document.querySelector("[data-book-next]")?.click();
    }
  });
})();
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

  const modal=document.getElementById("project-modal");
  const title=document.getElementById("modal-title");
  const copy=document.getElementById("modal-copy");
  const kicker=document.getElementById("modal-kicker");
  document.querySelectorAll("[data-project]").forEach(button=>{
    button.addEventListener("click",()=>{
      const p=window.SITE_DATA.projects[button.dataset.project];
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

  const music=window.SITE_DATA.music||[];
  const musicCarousel=document.querySelector("[data-music-carousel]");
  let musicIndex=0;

  const musicCard=(item,index,archive=false)=>{
    const card=document.createElement("button");
    card.className=archive?"archive-record":"vinyl-card";
    card.type="button";
    card.dataset.musicIndex=index;
    card.setAttribute("aria-label","Open "+item.title+" by "+item.artist);
    card.innerHTML=
      '<span class="vinyl-sleeve">'+
        '<span class="album-art '+item.coverClass+'"><span>'+item.number+'</span></span>'+
        '<span class="sleeve-label"><small>'+item.date+'</small><strong>'+item.title+'</strong><em>'+item.artist+'</em></span>'+
      '</span>';
    card.addEventListener("click",()=>selectMusic(index));
    return card;
  };

  function renderMusicCarousel(){
    if(!musicCarousel) return;
    musicCarousel.innerHTML="";
    const total=music.length;
    if(!total) return;
    const positions=[-1,0,1,2];
    positions.forEach((offset,pos)=>{
      const i=(musicIndex+offset+total)%total;
      const card=musicCard(music[i],i);
      card.style.setProperty("--slot",pos);
      card.classList.toggle("is-active",offset===0);
      musicCarousel.appendChild(card);
    });
  }

  function selectMusic(index){
    if(!music[index]) return;
    musicIndex=index;
    renderMusicCarousel();
    updateCurrentMusic(music[index]);
  }

  function updateCurrentMusic(item){
    const titleEl=document.querySelector("[data-current-title]");
    const artistEl=document.querySelector("[data-current-artist]");
    const dateEl=document.querySelector("#current-listen-date");
    const artEl=document.querySelector("[data-current-art]");
    if(titleEl) titleEl.textContent=item.title;
    if(artistEl) artistEl.textContent=item.artist;
    if(dateEl) dateEl.textContent=item.date;
    if(artEl){
      artEl.className="album-art album-art-large "+item.coverClass;
      artEl.innerHTML="<span>"+item.number+"</span>";
    }
  }

  document.querySelector("[data-music-prev]")?.addEventListener("click",()=>{
    musicIndex=(musicIndex-1+music.length)%music.length;
    renderMusicCarousel();
    updateCurrentMusic(music[musicIndex]);
  });
  document.querySelector("[data-music-next]")?.addEventListener("click",()=>{
    musicIndex=(musicIndex+1)%music.length;
    renderMusicCarousel();
    updateCurrentMusic(music[musicIndex]);
  });

  const archive=document.querySelector("[data-music-archive]");
  if(archive){
    music.forEach((item,index)=>archive.appendChild(musicCard(item,index,true)));
    const count=document.querySelector("[data-music-count]");
    if(count) count.textContent=String(music.length).padStart(2,"0")+" RECORDS";
  }
  if(music.length) {
    selectMusic(0);
  }

  const serviceModal=document.querySelector("[data-service-modal]");
  const spotify=document.querySelector("[data-spotify-link]");
  const apple=document.querySelector("[data-apple-link]");
  const serviceTitle=document.querySelector("#service-title");
  const serviceArtist=document.querySelector("#service-artist");
  document.querySelector("[data-listen-open]")?.addEventListener("click",()=>{
    const item=music[musicIndex];
    if(!item || !serviceModal) return;
    serviceTitle.textContent=item.title;
    serviceArtist.textContent=item.artist;
    spotify.href=item.spotify;
    apple.href=item.apple;
    serviceModal.classList.add("open");
    serviceModal.setAttribute("aria-hidden","false");
  });
  document.querySelector("[data-clear-listen]")?.addEventListener("click",()=>{
    selectMusic(0);
  });
  document.querySelectorAll("[data-service-close]").forEach(el=>{
    el.addEventListener("click",()=>{
      serviceModal?.classList.remove("open");
      serviceModal?.setAttribute("aria-hidden","true");
    });
  });

  let musicTouchStartX=null;
  musicCarousel?.addEventListener("touchstart",e=>{musicTouchStartX=e.changedTouches[0].clientX},{passive:true});
  musicCarousel?.addEventListener("touchend",e=>{
    if(musicTouchStartX===null) return;
    const dx=e.changedTouches[0].clientX-musicTouchStartX;
    if(Math.abs(dx)>40){
      if(dx<0) document.querySelector("[data-music-next]")?.click();
      else document.querySelector("[data-music-prev]")?.click();
    }
    musicTouchStartX=null;
  },{passive:true});

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
        '<span class="book-row-number">'+item.number+'</span>'+
        '<span class="book-row-title"><strong>'+item.title+'</strong><small>'+item.author+'</small></span>'+
        '<span class="book-row-year">'+item.year+'</span>'+
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

  let bookTouchStartX=null;
  const bookSpread=document.querySelector("[data-book-spread]");
  bookSpread?.addEventListener("touchstart",e=>{bookTouchStartX=e.changedTouches[0].clientX},{passive:true});
  bookSpread?.addEventListener("touchend",e=>{
    if(bookTouchStartX===null) return;
    const dx=e.changedTouches[0].clientX-bookTouchStartX;
    if(Math.abs(dx)>40){
      if(dx<0) document.querySelector("[data-book-next]")?.click();
      else document.querySelector("[data-book-prev]")?.click();
    }
    bookTouchStartX=null;
  },{passive:true});

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      document.querySelectorAll(".overlay.open,.service-modal.open,.book-modal.open").forEach(el=>{
        el.classList.remove("open");
        el.setAttribute("aria-hidden","true");
      });
    }
    if(document.body.dataset.page==="music"){
      if(e.key==="ArrowLeft") document.querySelector("[data-music-prev]")?.click();
      if(e.key==="ArrowRight") document.querySelector("[data-music-next]")?.click();
    }
    if(document.body.dataset.page==="books"){
      if(e.key==="ArrowLeft") document.querySelector("[data-book-prev]")?.click();
      if(e.key==="ArrowRight") document.querySelector("[data-book-next]")?.click();
    }
  });
})();
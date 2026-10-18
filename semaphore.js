(() => {
  "use strict";

  let moduleOpen=false;
  let playTimer=null;
  let playIndex=0;

  const POS={
    U:0, UR:45, R:90, DR:135, D:180, DL:225, L:270, UL:315
  };

  // Standard flag semaphore as seen while facing the signaller.
  const LETTERS={
    A:["D","DL"], B:["D","L"], C:["D","UL"], D:["D","U"], E:["D","UR"], F:["D","R"], G:["D","DR"],
    H:["DL","L"], I:["DL","UL"], J:["U","R"], K:["DL","U"], L:["DL","UR"], M:["DL","R"], N:["DL","DR"],
    O:["L","UL"], P:["L","U"], Q:["L","UR"], R:["L","R"], S:["L","DR"],
    T:["UL","U"], U:["UL","UR"], V:["U","DR"], W:["UR","R"], X:["UR","DR"], Y:["UL","R"], Z:["R","DR"]
  };

  const SPECIAL={
    SPACE:["D","D"],
    NUM:["U","UL"],
    ATTENTION:["DL","UR"]
  };

  const DIGIT_TO_LETTER={"1":"A","2":"B","3":"C","4":"D","5":"E","6":"F","7":"G","8":"H","9":"I","0":"K"};

  const DIR_LABELS={
    U:"↑", UR:"↗", R:"→", DR:"↘", D:"↓", DL:"↙", L:"←", UL:"↖"
  };

  function normText(text){
    return String(text||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toUpperCase();
  }

  function keyForPair(pair){
    return [...pair].sort((a,b)=>POS[a]-POS[b]).join("|");
  }

  const PAIR_TO_LETTER={};
  Object.entries(LETTERS).forEach(([letter,pair])=>PAIR_TO_LETTER[keyForPair(pair)]=letter);

  function sequenceFromText(text){
    const s=normText(text);
    const out=[];
    let inNumbers=false;

    for(const ch of s){
      if(/[A-Z]/.test(ch)){
        if(inNumbers){
          out.push({kind:"special",label:"LETTERE",symbol:"J",pair:LETTERS.J,display:"J · lettere"});
          inNumbers=false;
        }
        out.push({kind:"letter",label:ch,symbol:ch,pair:LETTERS[ch],display:ch});
      }else if(/[0-9]/.test(ch)){
        if(!inNumbers){
          out.push({kind:"special",label:"NUMERI",symbol:"#",pair:SPECIAL.NUM,display:"# · numeri"});
          inNumbers=true;
        }
        const l=DIGIT_TO_LETTER[ch];
        out.push({kind:"digit",label:ch,symbol:l,pair:LETTERS[l],display:ch});
      }else if(/\s/.test(ch)){
        if(out.length && out.at(-1)?.kind!=="space"){
          out.push({kind:"space",label:"SPAZIO",symbol:"␠",pair:SPECIAL.SPACE,display:"spazio"});
        }
      }
    }

    while(out.at(-1)?.kind==="space") out.pop();
    return out;
  }

  function pt(dir,r=53){
    const a=POS[dir]*Math.PI/180;
    return {x:90+Math.sin(a)*r,y:82-Math.cos(a)*r};
  }

  function flagSvgAt(dir,index){
    const shoulder=index===0?{x:86,y:82}:{x:94,y:82};
    let end=pt(dir,54);

    if(dir==="D" && index===0) end={x:end.x-5,y:end.y};
    if(dir==="D" && index===1) end={x:end.x+5,y:end.y};

    const vx=end.x-shoulder.x, vy=end.y-shoulder.y;
    const len=Math.hypot(vx,vy)||1;
    const ux=vx/len, uy=vy/len;
    const px=-uy, py=ux;

    const poleEnd={x:end.x+ux*15,y:end.y+uy*15};
    const a={x:poleEnd.x,y:poleEnd.y};
    const b={x:poleEnd.x+px*13-ux*2,y:poleEnd.y+py*13-uy*2};
    const c={x:poleEnd.x+px*13-ux*20,y:poleEnd.y+py*13-uy*20};
    const d={x:poleEnd.x-ux*18,y:poleEnd.y-uy*18};
    const mid={x:(a.x+c.x)/2,y:(a.y+c.y)/2};

    return {
      arm:'<line x1="'+shoulder.x+'" y1="'+shoulder.y+'" x2="'+end.x+'" y2="'+end.y+'" class="sem-arm"/>'+
          '<line x1="'+end.x+'" y1="'+end.y+'" x2="'+poleEnd.x+'" y2="'+poleEnd.y+'" class="sem-pole"/>',
      flag:
        '<polygon points="'+a.x+','+a.y+' '+b.x+','+b.y+' '+c.x+','+c.y+' '+d.x+','+d.y+'" class="sem-flag-base"/>'+
        '<polygon points="'+a.x+','+a.y+' '+b.x+','+b.y+' '+mid.x+','+mid.y+'" class="sem-flag-red"/>'+
        '<polygon points="'+c.x+','+c.y+' '+d.x+','+d.y+' '+mid.x+','+mid.y+'" class="sem-flag-yellow"/>'
    };
  }

  function personSvg(pair,label="",small=false){
    const p1=flagSvgAt(pair[0],0);
    const p2=flagSvgAt(pair[1],1);
    return '<svg class="sem-person'+(small?' small':'')+'" viewBox="0 0 180 190" role="img" aria-label="Semaphore '+label+'">'+
      '<circle cx="90" cy="48" r="13" class="sem-head"/>'+
      '<line x1="90" y1="63" x2="90" y2="128" class="sem-body"/>'+
      '<line x1="90" y1="126" x2="72" y2="164" class="sem-leg"/>'+
      '<line x1="90" y1="126" x2="108" y2="164" class="sem-leg"/>'+
      p1.arm+p2.arm+p1.flag+p2.flag+
      '</svg>';
  }

  function injectStyle(){
    if(document.querySelector("#semaphore-style")) return;
    const s=document.createElement("style");
    s.id="semaphore-style";
    s.textContent=
      ".sem-card-icon{width:42px;height:42px;position:relative}.sem-card-icon:before,.sem-card-icon:after{content:'';position:absolute;left:20px;top:18px;width:21px;height:3px;background:currentColor;transform-origin:left center;border-radius:3px}.sem-card-icon:before{transform:rotate(-42deg)}.sem-card-icon:after{transform:rotate(42deg)}"+
      ".sem-card-icon i{position:absolute;left:16px;top:15px;width:9px;height:9px;border-radius:50%;background:currentColor}"+
      ".sem-workspace{grid-template-columns:minmax(0,1.05fr) minmax(330px,.95fr)}"+
      ".sem-stage{display:grid;grid-template-columns:minmax(190px,280px) 1fr;gap:16px;align-items:center}"+
      ".sem-figure{border:1px solid var(--line);border-radius:18px;background:var(--bg);min-height:310px;display:grid;place-items:center;padding:8px}"+
      ".sem-person{width:min(100%,260px);height:auto}.sem-person.small{width:86px}"+
      ".sem-head{fill:var(--ink)}.sem-body,.sem-leg,.sem-arm{stroke:var(--ink);stroke-width:9;stroke-linecap:round}.sem-pole{stroke:var(--muted);stroke-width:3;stroke-linecap:round}"+
      ".sem-flag-base{fill:#e8c43a}.sem-flag-red{fill:#e53935}.sem-flag-yellow{fill:#ffd83d}"+
      ".sem-current{text-align:center}.sem-current-letter{font:900 58px/1 Georgia,serif;color:var(--accent)}.sem-current-name{margin-top:6px;color:var(--muted);font-size:12px}"+
      ".sem-directions{margin-top:10px;font:800 13px/1.4 monospace;color:var(--muted)}"+
      ".sem-controls{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:15px}"+
      ".sem-sequence{display:flex;gap:8px;overflow-x:auto;padding:10px 2px 6px;margin-top:12px;scroll-snap-type:x proximity}"+
      ".sem-token{min-width:76px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);padding:7px;display:grid;place-items:center;scroll-snap-align:center;cursor:pointer}"+
      ".sem-token.active{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 13%,transparent);background:color-mix(in srgb,var(--accent) 8%,var(--bg))}"+
      ".sem-token b{font:900 13px/1 Georgia,serif}.sem-token small{font-size:8px;color:var(--muted);margin-top:3px}.sem-token .sem-person.small{width:66px}"+
      ".sem-decode-pad{position:relative;width:260px;height:260px;margin:6px auto 16px;border-radius:50%;border:1px dashed var(--line);background:var(--bg)}"+
      ".sem-dir{position:absolute;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);display:grid;place-items:center;font-size:22px;cursor:pointer;transform:translate(-50%,-50%)}"+
      ".sem-dir.active{background:var(--accent);color:#fff;border-color:var(--accent)}"+
      ".sem-dir[data-dir='U']{left:50%;top:8%}.sem-dir[data-dir='UR']{left:80%;top:20%}.sem-dir[data-dir='R']{left:92%;top:50%}.sem-dir[data-dir='DR']{left:80%;top:80%}.sem-dir[data-dir='D']{left:50%;top:92%}.sem-dir[data-dir='DL']{left:20%;top:80%}.sem-dir[data-dir='L']{left:8%;top:50%}.sem-dir[data-dir='UL']{left:20%;top:20%}"+
      ".sem-mini-person{position:absolute;inset:54px;display:grid;place-items:center;pointer-events:none}.sem-mini-person .sem-person{width:150px}"+
      ".sem-decode-result{min-height:70px;text-align:center;font:900 34px/1.3 Georgia,serif;color:var(--accent)}"+
      ".sem-decode-note{text-align:center;color:var(--muted);font-size:11px;min-height:20px}"+
      ".sem-reference{margin-top:18px}.sem-grid{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:8px;margin-top:12px}"+
      ".sem-ref{border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);padding:8px;display:grid;place-items:center;cursor:pointer}.sem-ref:hover{border-color:var(--accent)}"+
      ".sem-ref b{font:900 15px/1 Georgia,serif}.sem-ref .sem-person.small{width:82px}"+
      ".sem-specials{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.sem-special{padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--bg);text-align:center}.sem-special strong{display:block;font-size:12px}.sem-special span{display:block;color:var(--muted);font-size:10px;margin-top:4px}"+
      ".sem-fact{margin-top:18px;text-align:center}.sem-peace{font-size:74px;line-height:1;color:var(--accent);margin:8px}.sem-fact p{color:var(--muted);font-size:13px;max-width:720px;margin:0 auto}"+
      "@media(max-width:900px){.sem-workspace{grid-template-columns:1fr}.sem-grid{grid-template-columns:repeat(4,minmax(100px,1fr))}}"+
      "@media(max-width:620px){.sem-stage{grid-template-columns:1fr}.sem-figure{min-height:270px}.sem-grid{grid-template-columns:repeat(3,minmax(90px,1fr))}.sem-specials{grid-template-columns:1fr}.sem-decode-pad{width:230px;height:230px}}";
    document.head.appendChild(s);
  }

  function historyHtml(){
    return '<h2>Il telegrafo umano con due bandiere</h2>'+
      '<div class="history-era">◷ 1866 · XIX secolo</div>'+
      '<p>Il semaphore a bandiere nacque nel XIX secolo come versione portatile dei precedenti telegrafi ottici a bracci mobili; la forma a bandiere manuali viene fatta risalire al 1866.</p>'+
      '<p>Divenne particolarmente utile nella comunicazione marittima tra nave e nave o tra nave e costa: ogni lettera viene riconosciuta dalla posizione delle due braccia.</p>'+
      '<p>Una curiosità celebre: nel 1958 Gerald Holtom costruì il simbolo del disarmo nucleare ☮ sovrapponendo graficamente le pose semaphore delle lettere <strong>N</strong> e <strong>D</strong>, iniziali di <em>Nuclear Disarmament</em>.</p>';
  }

  function helpHtml(){
    return '<h2>Semaphore a bandiere</h2>'+
      '<p>Il semaphore comunica lettere tramite la <strong>posizione di due bandiere</strong>. Chi riceve legge i segnali guardando frontalmente il segnalatore.</p>'+
      '<p>Ogni braccio può puntare in una delle <strong>otto direzioni</strong>. La coppia di direzioni identifica una lettera.</p>'+
      '<p>Lo spazio usa la posizione di riposo con entrambe le bandiere verso il basso. Per i numeri si invia prima il segnale <strong>NUMERALS</strong>; le pose A–I corrispondono a 1–9 e K a 0.</p>'+
      '<p>È un sistema di comunicazione visiva, non un cifrario segreto. Le bandiere servono soprattutto a rendere più visibili le posizioni delle braccia a distanza.</p>';
  }

  function currentCard(token){
    if(!token) return {label:"—",name:"Scrivi un messaggio",pair:SPECIAL.SPACE};
    return {
      label:token.kind==="space"?"␠":token.label,
      name:token.kind==="special"?token.display:(token.kind==="space"?"RIPOSO / SPAZIO":token.kind==="digit"?"numero "+token.label:"lettera "+token.label),
      pair:token.pair
    };
  }

  function renderModule(){
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    const grid=Object.entries(LETTERS).map(([letter,pair])=>
      '<button type="button" class="sem-ref" data-letter="'+letter+'">'+
      personSvg(pair,letter,true)+'<b>'+letter+'</b></button>'
    ).join("");

    main.innerHTML=
      '<div class="module-head"><div>'+
      '<div class="eyebrow">Codice e rappresentazione · comunicazione visiva</div>'+
      '<h2>Semaphore</h2>'+
      '<p>Due bandiere, otto direzioni e un intero alfabeto da vedere in movimento.</p>'+
      '</div><div class="module-actions"><button class="help-btn" id="semHelp">? COME FUNZIONA</button><button class="help-btn history-btn" id="semHistory">◷ STORIA</button></div></div>'+

      '<div class="workspace sem-workspace">'+
        '<section class="panel"><h3>Testo → semaphore</h3>'+
          '<label class="field">Messaggio<textarea id="semInput" placeholder="Scrivi qui il messaggio…">CIAO</textarea></label>'+
          '<div class="sem-stage">'+
            '<div class="sem-figure" id="semFigure"></div>'+
            '<div class="sem-current">'+
              '<div class="sem-current-letter" id="semLetter">—</div>'+
              '<div class="sem-current-name" id="semName"></div>'+
              '<div class="sem-directions" id="semDirections"></div>'+
              '<div class="sem-controls">'+
                '<button class="ghost" id="semPrev">◀</button>'+
                '<button class="primary" id="semPlay">▶ ANIMA</button>'+
                '<button class="ghost" id="semNext">▶</button>'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="sem-sequence" id="semSequence"></div>'+
        '</section>'+

        '<section class="panel"><h3>Posizioni → lettera</h3>'+
          '<p class="pig-instruction">Tocca due direzioni. Le pose sono mostrate come se fossi davanti al segnalatore.</p>'+
          '<div class="sem-decode-pad" id="semPad">'+
            Object.keys(POS).map(d=>'<button type="button" class="sem-dir" data-dir="'+d+'">'+DIR_LABELS[d]+'</button>').join("")+
            '<div class="sem-mini-person" id="semDecodeFigure"></div>'+
          '</div>'+
          '<div class="sem-decode-result" id="semDecoded">—</div>'+
          '<div class="sem-decode-note" id="semDecodeNote">Seleziona due posizioni.</div>'+
          '<div class="action-row"><button class="ghost" id="semResetDecode">AZZERA</button></div>'+
        '</section>'+
      '</div>'+

      '<section class="panel sem-reference">'+
        '<h3>Alfabeto semaphore A–Z</h3>'+
        '<div class="sem-grid" id="semGrid">'+grid+'</div>'+
        '<div class="note">Tocca una lettera per portarla nella figura grande.</div>'+
      '</section>'+

      '<section class="panel sem-reference">'+
        '<h3>Segnali utili</h3>'+
        '<div class="sem-specials">'+
          '<div class="sem-special">'+personSvg(SPECIAL.SPACE,"Spazio",true)+'<strong>SPAZIO / RIPOSO</strong><span>entrambe le bandiere verso il basso</span></div>'+
          '<div class="sem-special">'+personSvg(SPECIAL.NUM,"Numeri",true)+'<strong>NUMERALS</strong><span>indica che seguono cifre</span></div>'+
          '<div class="sem-special">'+personSvg(SPECIAL.ATTENTION,"Attenzione",true)+'<strong>ATTENTION</strong><span>richiesta di iniziare la trasmissione</span></div>'+
        '</div>'+
      '</section>'+

      '<section class="panel sem-fact">'+
        '<h3>Una curiosità diventata universale</h3>'+
        '<div class="sem-peace">☮</div>'+
        '<p>Il simbolo del disarmo nucleare nacque nel 1958 sovrapponendo graficamente le lettere semaphore N e D: <strong>Nuclear Disarmament</strong>.</p>'+
      '</section>';

    const input=document.querySelector("#semInput");
    const figure=document.querySelector("#semFigure");
    const letterEl=document.querySelector("#semLetter");
    const nameEl=document.querySelector("#semName");
    const dirsEl=document.querySelector("#semDirections");
    const seqEl=document.querySelector("#semSequence");
    const playBtn=document.querySelector("#semPlay");

    let sequence=[];

    function stop(){
      if(playTimer){clearInterval(playTimer);playTimer=null;}
      playBtn.textContent="▶ ANIMA";
    }

    function showIndex(i,scroll=true){
      if(!sequence.length){
        playIndex=0;
        const c=currentCard(null);
        figure.innerHTML=personSvg(c.pair,"riposo");
        letterEl.textContent="—";
        nameEl.textContent="Scrivi un messaggio";
        dirsEl.textContent="";
        return;
      }

      playIndex=(i+sequence.length)%sequence.length;
      const tok=sequence[playIndex];
      const c=currentCard(tok);
      figure.innerHTML=personSvg(c.pair,c.label);
      letterEl.textContent=c.label;
      nameEl.textContent=c.name;
      dirsEl.textContent=c.pair.map(d=>DIR_LABELS[d]+" "+d).join("   ");

      seqEl.querySelectorAll(".sem-token").forEach((el,j)=>el.classList.toggle("active",j===playIndex));
      const active=seqEl.querySelector(".sem-token.active");
      if(scroll) active?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
    }

    function updateSequence(){
      stop();
      sequence=sequenceFromText(input.value);
      playIndex=Math.min(playIndex,Math.max(0,sequence.length-1));

      seqEl.innerHTML=sequence.length ? sequence.map((tok,i)=>{
        const lab=tok.kind==="space"?"␠":tok.label;
        return '<button type="button" class="sem-token" data-index="'+i+'">'+
          personSvg(tok.pair,lab,true)+'<b>'+lab+'</b><small>'+esc(tok.display)+'</small></button>';
      }).join("") : '<span class="result-placeholder">Scrivi qualcosa per generare i segnali.</span>';

      seqEl.querySelectorAll(".sem-token").forEach(btn=>{
        btn.onclick=()=>{stop();showIndex(+btn.dataset.index);};
      });
      showIndex(playIndex,false);
    }

    input.addEventListener("input",updateSequence);

    document.querySelector("#semPrev").onclick=()=>{stop();showIndex(playIndex-1);};
    document.querySelector("#semNext").onclick=()=>{stop();showIndex(playIndex+1);};

    playBtn.onclick=()=>{
      if(playTimer){stop();return;}
      if(!sequence.length) return;
      playBtn.textContent="■ FERMA";
      showIndex(playIndex);
      playTimer=setInterval(()=>{
        playIndex++;
        if(playIndex>=sequence.length){
          stop();
          playIndex=0;
          showIndex(0);
          return;
        }
        showIndex(playIndex);
      },850);
    };

    document.querySelectorAll(".sem-ref").forEach(btn=>{
      btn.onclick=()=>{
        stop();
        const letter=btn.dataset.letter;
        const pair=LETTERS[letter];
        figure.innerHTML=personSvg(pair,letter);
        letterEl.textContent=letter;
        nameEl.textContent="lettera "+letter;
        dirsEl.textContent=pair.map(d=>DIR_LABELS[d]+" "+d).join("   ");
      };
    });

    let selected=[];

    function updateDecode(){
      document.querySelectorAll(".sem-dir").forEach(btn=>btn.classList.toggle("active",selected.includes(btn.dataset.dir)));

      if(!selected.length){
        document.querySelector("#semDecodeFigure").innerHTML=personSvg(SPECIAL.SPACE,"",false);
        document.querySelector("#semDecoded").textContent="—";
        document.querySelector("#semDecodeNote").textContent="Seleziona due posizioni.";
        return;
      }

      if(selected.length===1){
        document.querySelector("#semDecodeFigure").innerHTML=personSvg([selected[0],"D"],"",false);
        document.querySelector("#semDecoded").textContent="…";
        document.querySelector("#semDecodeNote").textContent="Seleziona la seconda posizione.";
        return;
      }

      const pair=[selected[0],selected[1]];
      document.querySelector("#semDecodeFigure").innerHTML=personSvg(pair,"",false);
      const letter=PAIR_TO_LETTER[keyForPair(pair)];
      document.querySelector("#semDecoded").textContent=letter||"—";
      document.querySelector("#semDecodeNote").textContent=letter ? "Lettera "+letter : "Questa coppia non rappresenta una lettera A–Z.";
    }

    document.querySelectorAll(".sem-dir").forEach(btn=>{
      btn.onclick=()=>{
        const d=btn.dataset.dir;
        if(selected.includes(d)){
          selected=selected.filter(x=>x!==d);
        }else{
          if(selected.length>=2) selected.shift();
          selected.push(d);
        }
        updateDecode();
      };
    });

    document.querySelector("#semResetDecode").onclick=()=>{selected=[];updateDecode();};

    document.querySelector("#semHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    document.querySelector("#semHistory").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=historyHtml();dialog.showModal();}
    };

    updateSequence();
    updateDecode();
  }

  function esc(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function selfTest(){
    const keys=Object.values(LETTERS).map(keyForPair);
    const unique=new Set(keys).size===26;
    const letters=Object.keys(LETTERS).join("")==="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const hello=sequenceFromText("ABC 12");
    return unique && letters && hello.filter(x=>x.kind==="letter").length===3 && hello.some(x=>x.kind==="special"&&x.label==="NUMERI");
  }

  function ensureCard(){
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-semaphore-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici e rappresentazioni"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.semaphoreCard="1";
    card.innerHTML=
      '<div class="card-icon sem-card-icon" aria-hidden="true"><i></i></div>'+
      '<h4>SEMAPHORE</h4>'+
      '<p>Comunica lettere a distanza combinando le posizioni di due bandiere.</p>'+
      '<span class="badge code">CODICE VISIVO</span>';
    card.onclick=renderModule;

    const nato=cards.querySelector("[data-nato-card]");
    const morse=cards.querySelector('[data-module="morse"]');
    if(nato) nato.insertAdjacentElement("afterend",card);
    else if(morse) morse.insertAdjacentElement("afterend",card);
    else cards.appendChild(card);
  }

  injectStyle();

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#semInput")){
      moduleOpen=false;
      if(playTimer){clearInterval(playTimer);playTimer=null;}
    }
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();

  if(!selfTest()) console.error("CODEX! Semaphore self-test failed");
})();
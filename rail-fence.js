(() => {
  "use strict";

  let moduleOpen=false;
  let animationTimer=null;

  function cleanText(text,preserve){
    const s=String(text||"");
    if(preserve) return [...s];
    return [...s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,"")];
  }

  function railPattern(length,rails){
    const r=Math.max(2,Math.min(12,Number(rails)||3));
    const cycle=2*(r-1);
    const out=[];
    for(let i=0;i<length;i++){
      const x=i%cycle;
      out.push(x<r ? x : cycle-x);
    }
    return out;
  }

  function encode(text,rails,preserve){
    const chars=cleanText(text,preserve);
    const pattern=railPattern(chars.length,rails);
    const rows=Array.from({length:rails},()=>[]);
    chars.forEach((ch,i)=>rows[pattern[i]].push(ch));
    return {
      chars,pattern,rows,
      cipher:rows.flat().join("")
    };
  }

  function decode(text,rails,preserve){
    const cipher=cleanText(text,preserve);
    const pattern=railPattern(cipher.length,rails);
    const counts=Array.from({length:rails},()=>0);
    pattern.forEach(r=>counts[r]++);

    const buckets=Array.from({length:rails},()=>[]);
    let p=0;
    for(let r=0;r<rails;r++){
      buckets[r]=cipher.slice(p,p+counts[r]);
      p+=counts[r];
    }

    const offsets=Array.from({length:rails},()=>0);
    const plain=pattern.map(r=>buckets[r][offsets[r]++]).join("");
    return {plain,pattern,counts,buckets,cipher};
  }

  function esc(s){
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  function injectStyle(){
    if(document.querySelector("#rail-style")) return;
    const s=document.createElement("style");
    s.id="rail-style";
    s.textContent=
      ".rail-card-icon{width:42px;height:42px;border-radius:8px;border:2px solid currentColor;position:relative;overflow:hidden}"+
      ".rail-card-icon:before,.rail-card-icon:after{content:'';position:absolute;left:5px;right:5px;height:2px;background:currentColor;opacity:.6}"+
      ".rail-card-icon:before{top:13px}.rail-card-icon:after{bottom:13px}"+
      ".rail-card-icon i{position:absolute;left:7px;top:6px;width:27px;height:27px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg) skew(8deg,8deg)}"+
      ".rail-workspace{grid-template-columns:minmax(0,1fr) minmax(330px,.95fr)}"+
      ".rail-keybox{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0 14px}"+
      ".rail-keybox input[type=range]{flex:1;min-width:160px}.rail-count{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font:900 18px/1 monospace}"+
      ".rail-toggle{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin:10px 0}"+
      ".rail-result{min-height:100px;font:900 19px/1.55 monospace;letter-spacing:.07em;overflow-wrap:anywhere}"+
      ".rail-visual-wrap{margin-top:18px;overflow-x:auto;padding-bottom:8px}"+
      ".rail-grid{display:grid;gap:4px;min-width:max-content;align-items:center}"+
      ".rail-cell{width:30px;height:34px;border-radius:7px;display:grid;place-items:center;font:900 14px/1 monospace;border:1px solid transparent;color:var(--muted)}"+
      ".rail-cell.hit{border-color:var(--line);background:var(--bg);color:var(--ink)}"+
      ".rail-cell.active{background:var(--accent);border-color:var(--accent);color:#fff;transform:scale(1.08)}"+
      ".rail-cell.blank{opacity:.25;font-weight:400}"+
      ".rail-label{width:52px;height:34px;display:grid;place-items:center;border-radius:8px;background:var(--panel-2);font:900 10px/1 monospace;color:var(--muted);position:sticky;left:0;z-index:2}"+
      ".rail-visual-note{font-size:11px;color:var(--muted);margin-top:8px}"+
      ".rail-readout{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}"+
      ".rail-row-chip{padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:var(--bg);font:800 11px/1.3 monospace}"+
      ".rail-row-chip b{color:var(--accent);margin-right:5px}"+
      ".rail-cycle{margin-top:18px;text-align:center}"+
      ".rail-cycle-flow{display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap;margin:12px 0}"+
      ".rail-cycle-flow span{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--panel-2);border:1px solid var(--line);font:900 12px/1 monospace}"+
      ".rail-cycle-flow i{font-style:normal;color:var(--accent);font-weight:900}"+
      ".rail-decode-note{margin-top:9px;font-size:11px;color:var(--muted)}"+
      "@media(max-width:880px){.rail-workspace{grid-template-columns:1fr}}"+
      "@media(max-width:580px){.rail-cell{width:26px;height:31px}.rail-label{width:46px}}";
    document.head.appendChild(s);
  }

  function helpHtml(){
    return '<h2>Cifrario a staccionata</h2>'+
      '<p>La staccionata, o <strong>Rail Fence</strong>, è un cifrario di <strong>trasposizione</strong>: le lettere non vengono sostituite, ma soltanto spostate.</p>'+
      '<p>Si sceglie un numero di binari. Il messaggio viene scritto in diagonale scendendo da un binario al successivo; raggiunto l’ultimo, si risale. Si continua così formando uno <strong>zig-zag</strong>.</p>'+
      '<p>Per cifrare si leggono poi i binari <strong>orizzontalmente, dall’alto verso il basso</strong>.</p>'+
      '<p>La chiave è il numero di binari. Con 3 binari il percorso delle righe è 1–2–3–2–1–2–3… e il ciclo si ripete ogni 4 caratteri.</p>'+
      '<p>È un ottimo esempio della differenza tra <strong>sostituzione</strong> e <strong>trasposizione</strong>, ma oggi non offre sicurezza reale.</p>';
  }

  function renderGrid(result,rails){
    const max=70;
    const chars=result.chars.slice(0,max);
    const pattern=result.pattern.slice(0,max);
    const cols=chars.length;

    if(!cols) return '<div class="result-placeholder">Scrivi un messaggio per vedere lo zig-zag.</div>';

    let html='<div class="rail-grid" style="grid-template-columns:52px repeat('+cols+',30px)">';
    for(let r=0;r<rails;r++){
      html+='<div class="rail-label">BIN. '+(r+1)+'</div>';
      for(let c=0;c<cols;c++){
        if(pattern[c]===r){
          html+='<div class="rail-cell hit" data-pos="'+c+'">'+esc(chars[c]===" "?"␠":chars[c])+'</div>';
        }else{
          html+='<div class="rail-cell blank">·</div>';
        }
      }
    }
    html+='</div>';
    return html;
  }

  function cycleHtml(rails){
    const p=railPattern(2*(rails-1)+1,rails);
    return p.map((r,i)=>
      '<span>'+(r+1)+'</span>'+(i<p.length-1?'<i>→</i>':'')
    ).join("");
  }

  function renderModule(){
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=
      '<div class="module-head"><div>'+
      '<div class="eyebrow">Codice segreto · cifrario a trasposizione</div>'+
      '<h2>Cifrario a staccionata</h2>'+
      '<p>Scrivi il messaggio a zig-zag sui binari e leggilo poi riga per riga.</p>'+
      '</div><button class="help-btn" id="railHelp">? COME FUNZIONA</button></div>'+

      '<div class="panel">'+
        '<div class="rail-keybox"><strong>Numero di binari</strong>'+
          '<input id="railCount" type="range" min="2" max="8" step="1" value="3">'+
          '<div class="rail-count" id="railCountValue">3</div>'+
        '</div>'+
        '<label class="rail-toggle"><input type="checkbox" id="railPreserve"> Mantieni spazi, numeri e punteggiatura nel cifrato</label>'+
      '</div>'+

      '<div class="workspace rail-workspace">'+
        '<section class="panel"><h3>Testo → staccionata</h3>'+
          '<label class="field">Messaggio<textarea id="railInput" placeholder="Scrivi qui il messaggio…">INCONTRO AL CASTELLO</textarea></label>'+
          '<div class="result-box rail-result" id="railEncoded"></div>'+
          '<div class="action-row">'+
            '<button class="primary" id="railAnimate">▶ ANIMA ZIG-ZAG</button>'+
            '<button class="ghost" id="railCopy">COPIA CIFRATO</button>'+
            '<button class="ghost" id="railUse">USA PER DECODIFICARE</button>'+
            '<button class="ghost" id="railClear">PULISCI</button>'+
          '</div>'+
          '<div class="rail-readout" id="railRows"></div>'+
        '</section>'+

        '<section class="panel"><h3>Staccionata → testo</h3>'+
          '<label class="field">Testo cifrato<textarea id="railDecode" spellcheck="false" placeholder="Incolla qui il cifrato…"></textarea></label>'+
          '<div class="result-box rail-result" id="railDecoded"></div>'+
          '<div class="rail-decode-note" id="railDecodeNote"></div>'+
          '<div class="action-row">'+
            '<button class="ghost" id="railCopyDecoded">COPIA TESTO</button>'+
            '<button class="ghost" id="railClearDecoded">PULISCI</button>'+
          '</div>'+
        '</section>'+
      '</div>'+

      '<section class="panel">'+
        '<h3>La staccionata</h3>'+
        '<div class="rail-visual-wrap" id="railVisual"></div>'+
        '<div class="rail-visual-note" id="railVisualNote"></div>'+
      '</section>'+

      '<section class="panel rail-cycle">'+
        '<h3>Il ciclo dei binari</h3>'+
        '<div class="rail-cycle-flow" id="railCycle"></div>'+
        '<p>Si scende fino all’ultimo binario, poi si risale: il movimento si ripete per tutto il messaggio.</p>'+
      '</section>';

    const count=document.querySelector("#railCount");
    const countValue=document.querySelector("#railCountValue");
    const preserve=document.querySelector("#railPreserve");
    const input=document.querySelector("#railInput");
    const encoded=document.querySelector("#railEncoded");
    const rows=document.querySelector("#railRows");
    const decodeInput=document.querySelector("#railDecode");
    const decoded=document.querySelector("#railDecoded");
    const decodeNote=document.querySelector("#railDecodeNote");
    const visual=document.querySelector("#railVisual");
    const visualNote=document.querySelector("#railVisualNote");
    const cycle=document.querySelector("#railCycle");

    let current=null;

    function stopAnimation(){
      if(animationTimer){clearInterval(animationTimer);animationTimer=null;}
      document.querySelectorAll(".rail-cell.active").forEach(x=>x.classList.remove("active"));
      const btn=document.querySelector("#railAnimate");
      if(btn) btn.textContent="▶ ANIMA ZIG-ZAG";
    }

    function updateEncode(){
      stopAnimation();
      const rails=+count.value;
      current=encode(input.value,rails,preserve.checked);
      encoded.textContent=current.cipher;
      if(!current.cipher) encoded.innerHTML='<span class="result-placeholder">Scrivi un messaggio per cifrarlo.</span>';

      rows.innerHTML=current.rows.map((row,i)=>
        '<div class="rail-row-chip"><b>'+(i+1)+'</b>'+esc(row.join(""))+'</div>'
      ).join("");

      visual.innerHTML=renderGrid(current,rails);
      visualNote.textContent=current.chars.length>70 ? 'Visualizzazione limitata ai primi 70 caratteri.' : '';
      cycle.innerHTML=cycleHtml(rails);
    }

    function updateDecode(){
      const rails=+count.value;
      const res=decode(decodeInput.value,rails,preserve.checked);
      decoded.textContent=res.plain;
      if(!res.plain) decoded.innerHTML='<span class="result-placeholder">Inserisci un testo cifrato.</span>';
      decodeNote.textContent=preserve.checked
        ? 'Gli spazi e la punteggiatura partecipano alla trasposizione.'
        : 'Modalità classica: vengono considerate soltanto le lettere A–Z.';
    }

    function updateAll(){
      countValue.textContent=count.value;
      updateEncode();
      updateDecode();
    }

    count.addEventListener("input",updateAll);
    preserve.addEventListener("change",updateAll);
    input.addEventListener("input",updateEncode);
    decodeInput.addEventListener("input",updateDecode);

    document.querySelector("#railAnimate").onclick=()=>{
      if(animationTimer){stopAnimation();return;}
      if(!current || !current.chars.length) return;

      const max=Math.min(current.chars.length,70);
      let i=0;
      const btn=document.querySelector("#railAnimate");
      btn.textContent="■ FERMA";

      function tick(){
        document.querySelectorAll(".rail-cell.active").forEach(x=>x.classList.remove("active"));
        const el=document.querySelector('.rail-cell.hit[data-pos="'+i+'"]');
        el?.classList.add("active");
        el?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
        i++;
        if(i>=max){
          setTimeout(stopAnimation,220);
          clearInterval(animationTimer);
          animationTimer=null;
        }
      }
      tick();
      animationTimer=setInterval(tick,190);
    };

    document.querySelector("#railCopy").onclick=async()=>{
      if(current?.cipher) try{await navigator.clipboard.writeText(current.cipher);}catch{}
    };

    document.querySelector("#railUse").onclick=()=>{
      decodeInput.value=current?.cipher||"";
      updateDecode();
      decodeInput.scrollIntoView({behavior:"smooth",block:"center"});
    };

    document.querySelector("#railClear").onclick=()=>{input.value="";updateEncode();};

    document.querySelector("#railCopyDecoded").onclick=async()=>{
      const value=decode(decodeInput.value,+count.value,preserve.checked).plain;
      if(value) try{await navigator.clipboard.writeText(value);}catch{}
    };

    document.querySelector("#railClearDecoded").onclick=()=>{decodeInput.value="";updateDecode();};

    document.querySelector("#railHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    updateAll();
  }

  function selfTest(){
    const e=encode("WE ARE DISCOVERED FLEE AT ONCE",3,false);
    const d=decode(e.cipher,3,false);
    return e.cipher==="WECRLTEERDSOEEFEAOCAIVDEN" && d.plain==="WEAREDISCOVEREDFLEEATONCE";
  }

  function ensureCard(){
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-rail-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.railCard="1";
    card.innerHTML=
      '<div class="card-icon rail-card-icon" aria-hidden="true"><i></i></div>'+
      '<h4>STACCIONATA</h4>'+
      '<p>Scrivi il messaggio a zig-zag su più binari e leggilo riga per riga.</p>'+
      '<span class="badge secret">TRASPOSIZIONE</span>';
    card.onclick=renderModule;

    const bacon=cards.querySelector("[data-bacon-card]");
    const rot13=cards.querySelector("[data-rot13-card]");
    if(bacon) bacon.insertAdjacentElement("afterend",card);
    else if(rot13) rot13.insertAdjacentElement("afterend",card);
    else cards.appendChild(card);
  }

  injectStyle();

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#railInput")){
      moduleOpen=false;
      if(animationTimer){clearInterval(animationTimer);animationTimer=null;}
    }
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();

  if(!selfTest()) console.error("CODEX! Rail Fence self-test failed");
})();
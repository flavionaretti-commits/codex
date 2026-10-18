(() => {
  "use strict";

  let moduleOpen=false;

  const CLASSIC_LETTERS=[
    "A","B","C","D","E","F","G","H","I/J","K","L","M",
    "N","O","P","Q","R","S","T","U/V","W","X","Y","Z"
  ];

  const MODERN_LETTERS="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  function bits5(n){
    return n.toString(2).padStart(5,"0");
  }

  function abFromBits(bits){
    return bits.replace(/0/g,"A").replace(/1/g,"B");
  }

  function makeMaps(mode){
    const letters=mode==="classic" ? CLASSIC_LETTERS : MODERN_LETTERS;
    const enc={};
    const dec={};

    letters.forEach((label,i)=>{
      const code=abFromBits(bits5(i));
      dec[code]=label;
      if(label==="I/J"){
        enc.I=code; enc.J=code;
      }else if(label==="U/V"){
        enc.U=code; enc.V=code;
      }else{
        enc[label]=code;
      }
    });

    return {letters,enc,dec};
  }

  function normalizeLetter(ch){
    return String(ch||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toUpperCase();
  }

  function encodeText(text,mode){
    const {enc}=makeMaps(mode);
    const tokens=[];
    for(const raw of String(text||"")){
      const up=normalizeLetter(raw);
      if(/^[A-Z]$/.test(up)){
        const code=enc[up];
        if(code) tokens.push({type:"code",source:up,code});
      }else if(/\s/.test(raw)){
        if(tokens.length && tokens.at(-1)?.type!=="space") tokens.push({type:"space",code:"/"});
      }
    }
    while(tokens.at(-1)?.type==="space") tokens.pop();
    return tokens;
  }

  function decodeText(text,mode){
    const {dec}=makeMaps(mode);
    const cleaned=String(text||"")
      .toUpperCase()
      .replace(/0/g,"A")
      .replace(/1/g,"B")
      .replace(/[^AB/]/g,"");

    if(!cleaned) return {text:"",groups:[],bad:false,remainder:0};

    const chunks=cleaned.split("/");
    const groups=[];
    const words=[];
    let bad=false;
    let remainder=0;

    for(const chunk of chunks){
      let word="";
      const full=Math.floor(chunk.length/5);
      remainder+=chunk.length%5;
      for(let i=0;i<full;i++){
        const code=chunk.slice(i*5,i*5+5);
        const label=dec[code];
        if(label){
          const out=label==="I/J" ? "I" : label==="U/V" ? "U" : label;
          word+=out;
          groups.push({code,label});
        }else{
          word+="�";
          groups.push({code,label:"�"});
          bad=true;
        }
      }
      words.push(word);
    }

    return {text:words.join(" ").trim(),groups,bad,remainder};
  }

  function binaryFromTokens(tokens){
    return tokens.map(t=>{
      if(t.type==="space") return "/";
      return t.code.replace(/A/g,"0").replace(/B/g,"1");
    }).join(" ");
  }

  function abString(tokens){
    return tokens.map(t=>t.type==="space" ? "/" : t.code).join(" ");
  }

  function compactBits(tokens){
    return tokens.filter(t=>t.type==="code").map(t=>t.code).join("");
  }

  function coverStyledHtml(cover,bits){
    const chars=[...String(cover||"")];
    let bitIndex=0;
    let html="";
    for(const ch of chars){
      if(/[A-Za-zÀ-ÿ]/.test(ch) && bitIndex<bits.length){
        const bit=bits[bitIndex++];
        const cls=bit==="B" ? "bacon-b" : "bacon-a";
        html+='<span class="'+cls+'" data-bit="'+bit+'">'+escapeHtml(ch)+'</span>';
      }else{
        html+=escapeHtml(ch);
      }
    }
    return {html,used:bitIndex,total:bits.length};
  }

  function escapeHtml(s){
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  function injectStyle(){
    if(document.querySelector("#bacon-style")) return;
    const s=document.createElement("style");
    s.id="bacon-style";
    s.textContent=
      ".bacon-card-icon{width:42px;height:42px;border-radius:8px;border:2px solid currentColor;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;padding:5px}"+
      ".bacon-card-icon i{display:block;border-radius:2px;background:currentColor}.bacon-card-icon i:nth-child(2n){opacity:.35}"+
      ".bacon-workspace{grid-template-columns:minmax(0,1fr) minmax(340px,.95fr)}"+
      ".bacon-mode{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}"+
      ".bacon-mode button.active{background:var(--accent);color:white;border-color:var(--accent)}"+
      ".bacon-result{min-height:100px;font:900 17px/1.65 monospace;letter-spacing:.06em;overflow-wrap:anywhere}"+
      ".bacon-binary{margin-top:10px;padding:12px;border-radius:12px;background:var(--panel-2);font:800 14px/1.55 monospace;color:var(--muted);overflow-wrap:anywhere}"+
      ".bacon-binary strong{color:var(--ink)}"+
      ".bacon-step-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}"+
      ".bacon-step{border:1px solid var(--line);border-radius:9px;background:var(--bg);padding:7px 9px;display:grid;grid-template-columns:auto auto;gap:5px;align-items:center}"+
      ".bacon-step b{font:900 12px/1 Georgia,serif}.bacon-step span{font:800 10px/1 monospace;color:var(--accent)}"+
      ".bacon-reference{margin-top:18px}"+
      ".bacon-grid{display:grid;grid-template-columns:repeat(6,minmax(95px,1fr));gap:7px;margin-top:12px}"+
      ".bacon-ref{border:1px solid var(--line);border-radius:10px;background:var(--bg);padding:8px;text-align:center}"+
      ".bacon-ref b{display:block;font:900 14px/1 Georgia,serif}.bacon-ref code{display:block;margin-top:5px;font-size:10px;color:var(--accent)}"+
      ".bacon-ref small{display:block;margin-top:3px;color:var(--muted);font:700 9px/1 monospace}"+
      ".bacon-steg{margin-top:18px}"+
      ".bacon-cover-preview{min-height:120px;padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--bg);font-size:18px;line-height:1.75}"+
      ".bacon-cover-preview .bacon-a{font-family:Georgia,serif;font-weight:400}"+
      ".bacon-cover-preview .bacon-b{font-family:Georgia,serif;font-weight:900}"+
      ".bacon-cover-legend{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}"+
      ".bacon-cover-legend span{padding:7px 10px;border-radius:999px;background:var(--panel-2);font-size:11px;color:var(--muted)}"+
      ".bacon-cover-legend .sample-a{font-family:Georgia,serif;font-weight:400;color:var(--ink)}"+
      ".bacon-cover-legend .sample-b{font-family:Georgia,serif;font-weight:900;color:var(--ink)}"+
      ".bacon-cover-status{margin-top:9px;font-size:11px;color:var(--muted)}"+
      ".bacon-cover-status.warn{color:var(--danger)}"+
      ".bacon-decode-note{margin-top:8px;font-size:11px;color:var(--muted)}"+
      ".bacon-decode-note.warn{color:var(--danger)}"+
      ".bacon-link{margin-top:18px;text-align:center}"+
      ".bacon-link-flow{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:14px 0}"+
      ".bacon-link-flow div{padding:12px 15px;border-radius:12px;border:1px solid var(--line);background:var(--bg);font:900 16px/1 monospace}"+
      ".bacon-link-flow span{color:var(--accent);font-weight:900}"+
      "@media(max-width:900px){.bacon-workspace{grid-template-columns:1fr}.bacon-grid{grid-template-columns:repeat(4,minmax(85px,1fr))}}"+
      "@media(max-width:580px){.bacon-grid{grid-template-columns:repeat(3,minmax(80px,1fr))}.bacon-cover-preview{font-size:16px}}";
    document.head.appendChild(s);
  }

  function helpHtml(){
    return '<h2>Cifrario di Bacone</h2>'+
      '<p>Ogni lettera viene trasformata in una sequenza di <strong>cinque simboli A/B</strong>. È quindi un sistema bilitterale: usa soltanto due stati.</p>'+
      '<p>Nella versione classica l’alfabeto ha 24 posizioni: <strong>I/J</strong> e <strong>U/V</strong> condividono il codice. CODEX! offre anche una variante moderna a 26 lettere.</p>'+
      '<p>Se interpreti A come <strong>0</strong> e B come <strong>1</strong>, ogni lettera diventa un gruppo di cinque bit: è uno dei motivi per cui questo cifrario è così interessante da confrontare con l’informatica.</p>'+
      '<p>La parte più ingegnosa è la <strong>steganografia</strong>: A e B possono essere nascosti usando due caratteri tipografici diversi in un testo apparentemente innocente.</p>';
  }

  function renderModule(){
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=
      '<div class="module-head"><div>'+
      '<div class="eyebrow">Codice segreto · cifrario bilitterale e steganografia</div>'+
      '<h2>Cifrario di Bacone</h2>'+
      '<p>Cinque simboli A/B per ogni lettera: un ponte sorprendente fra crittografia, steganografia e binario.</p>'+
      '</div><button class="help-btn" id="baconHelp">? COME FUNZIONA</button></div>'+

      '<div class="bacon-mode">'+
        '<button class="ghost active" id="baconClassic">CLASSICO · 24 LETTERE</button>'+
        '<button class="ghost" id="baconModern">MODERNO · 26 LETTERE</button>'+
      '</div>'+

      '<div class="workspace bacon-workspace">'+
        '<section class="panel">'+
          '<h3>Testo → A/B</h3>'+
          '<label class="field">Messaggio<textarea id="baconInput" placeholder="Scrivi qui il messaggio…">BACONE</textarea></label>'+
          '<div class="result-box bacon-result" id="baconEncoded"></div>'+
          '<div class="bacon-binary" id="baconBinary"></div>'+
          '<div class="bacon-step-row" id="baconSteps"></div>'+
          '<div class="action-row">'+
            '<button class="ghost" id="baconCopy">COPIA A/B</button>'+
            '<button class="ghost" id="baconUse">USA PER DECODIFICARE</button>'+
            '<button class="ghost" id="baconClear">PULISCI</button>'+
          '</div>'+
        '</section>'+

        '<section class="panel">'+
          '<h3>A/B → testo</h3>'+
          '<label class="field">Codice bilitterale<textarea id="baconDecode" spellcheck="false" placeholder="Es. AAAAB AAAAA AAABA ABBAB ABBAA"></textarea></label>'+
          '<div class="result-box bacon-result" id="baconDecoded"></div>'+
          '<div class="bacon-decode-note" id="baconDecodeNote"></div>'+
          '<div class="action-row">'+
            '<button class="ghost" id="baconCopyDecoded">COPIA TESTO</button>'+
            '<button class="ghost" id="baconClearDecoded">PULISCI</button>'+
          '</div>'+
          '<div class="note">Puoi usare anche 0 e 1: CODEX! interpreta 0 = A e 1 = B.</div>'+
        '</section>'+
      '</div>'+

      '<section class="panel bacon-steg">'+
        '<h3>Nascondi il codice in un testo-esca</h3>'+
        '<p class="pig-instruction">Le lettere in stile normale rappresentano A, quelle in grassetto rappresentano B. Servono almeno cinque lettere di copertura per ogni lettera segreta.</p>'+
        '<label class="field">Testo di copertura<textarea id="baconCover" placeholder="Scrivi un testo abbastanza lungo…">Questa frase apparentemente normale può nascondere un piccolo messaggio segreto senza mostrare direttamente il codice.</textarea></label>'+
        '<div class="bacon-cover-legend"><span><b class="sample-a">Aa</b> = A / 0</span><span><b class="sample-b">Aa</b> = B / 1</span></div>'+
        '<div class="bacon-cover-preview" id="baconCoverPreview"></div>'+
        '<div class="bacon-cover-status" id="baconCoverStatus"></div>'+
      '</section>'+

      '<section class="panel bacon-reference">'+
        '<h3>Alfabeto baconiano</h3>'+
        '<div class="bacon-grid" id="baconGrid"></div>'+
      '</section>'+

      '<section class="panel bacon-link">'+
        '<h3>Dal cifrario al binario</h3>'+
        '<div class="bacon-link-flow"><div>AABBA</div><span>↔</span><div>00110</div><span>↔</span><div>G</div></div>'+
        '<p>Due soli simboli, gruppi di cinque posizioni: la struttura ricorda direttamente una codifica binaria a 5 bit.</p>'+
      '</section>';

    let mode="classic";

    const input=document.querySelector("#baconInput");
    const encoded=document.querySelector("#baconEncoded");
    const binary=document.querySelector("#baconBinary");
    const steps=document.querySelector("#baconSteps");
    const decodeInput=document.querySelector("#baconDecode");
    const decoded=document.querySelector("#baconDecoded");
    const decodeNote=document.querySelector("#baconDecodeNote");
    const cover=document.querySelector("#baconCover");
    const coverPreview=document.querySelector("#baconCoverPreview");
    const coverStatus=document.querySelector("#baconCoverStatus");
    const grid=document.querySelector("#baconGrid");
    const classicBtn=document.querySelector("#baconClassic");
    const modernBtn=document.querySelector("#baconModern");

    function renderReference(){
      const {letters}=makeMaps(mode);
      grid.innerHTML=letters.map((label,i)=>{
        const code=abFromBits(bits5(i));
        return '<div class="bacon-ref"><b>'+label+'</b><code>'+code+'</code><small>'+bits5(i)+'</small></div>';
      }).join("");
    }

    function updateEncode(){
      const tokens=encodeText(input.value,mode);
      const ab=abString(tokens);
      encoded.textContent=ab;
      if(!ab) encoded.innerHTML='<span class="result-placeholder">Scrivi un messaggio per generare il codice A/B.</span>';

      const bin=binaryFromTokens(tokens);
      binary.innerHTML=bin ? '<strong>Binario:</strong> '+escapeHtml(bin) : '';

      steps.innerHTML=tokens.filter(t=>t.type==="code").map(t=>
        '<div class="bacon-step"><b>'+escapeHtml(t.source)+'</b><span>'+t.code+'</span></div>'
      ).join("");

      const bits=compactBits(tokens);
      const hidden=coverStyledHtml(cover.value,bits);
      coverPreview.innerHTML=hidden.html || '<span class="result-placeholder">Inserisci un testo di copertura.</span>';
      coverStatus.textContent=bits.length
        ? 'Lettere di copertura usate: '+hidden.used+' / '+hidden.total
        : 'Scrivi prima un messaggio segreto.';
      coverStatus.className='bacon-cover-status'+(hidden.used<hidden.total?' warn':'');
      if(hidden.used<hidden.total && bits.length){
        coverStatus.textContent+=' · il testo di copertura è troppo corto.';
      }
    }

    function updateDecode(){
      const res=decodeText(decodeInput.value,mode);
      decoded.textContent=res.text;
      if(!res.text) decoded.innerHTML='<span class="result-placeholder">Inserisci gruppi di cinque A/B oppure 0/1.</span>';

      const notes=[];
      if(res.remainder) notes.push('Restano '+res.remainder+' simboli fuori da un gruppo completo di 5.');
      if(mode==="classic" && res.text) notes.push('Nel classico I/J e U/V sono indistinguibili e vanno interpretate dal contesto.');
      if(res.bad) notes.push('Sono presenti gruppi non validi per questa modalità.');
      decodeNote.textContent=notes.join(" ");
      decodeNote.className='bacon-decode-note'+((res.remainder||res.bad)?' warn':'');
    }

    function setMode(next){
      mode=next;
      classicBtn.classList.toggle("active",mode==="classic");
      modernBtn.classList.toggle("active",mode==="modern");
      renderReference();
      updateEncode();
      updateDecode();
    }

    input.addEventListener("input",updateEncode);
    decodeInput.addEventListener("input",updateDecode);
    cover.addEventListener("input",updateEncode);

    classicBtn.onclick=()=>setMode("classic");
    modernBtn.onclick=()=>setMode("modern");

    document.querySelector("#baconCopy").onclick=async()=>{
      const value=abString(encodeText(input.value,mode));
      if(value) try{await navigator.clipboard.writeText(value);}catch{}
    };

    document.querySelector("#baconUse").onclick=()=>{
      decodeInput.value=abString(encodeText(input.value,mode));
      updateDecode();
      decodeInput.scrollIntoView({behavior:"smooth",block:"center"});
    };

    document.querySelector("#baconClear").onclick=()=>{
      input.value="";
      updateEncode();
    };

    document.querySelector("#baconCopyDecoded").onclick=async()=>{
      const value=decodeText(decodeInput.value,mode).text;
      if(value) try{await navigator.clipboard.writeText(value);}catch{}
    };

    document.querySelector("#baconClearDecoded").onclick=()=>{
      decodeInput.value="";
      updateDecode();
    };

    document.querySelector("#baconHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    renderReference();
    updateEncode();
    updateDecode();
  }

  function selfTest(){
    const tokens=encodeText("BACON","classic");
    const code=abString(tokens);
    const back=decodeText(code,"classic").text;
    return code==="AAAAB AAAAA AAABA ABBAB ABBAA" && back==="BACON";
  }

  function ensureCard(){
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-bacon-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.baconCard="1";
    card.innerHTML=
      '<div class="card-icon bacon-card-icon" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'+
      '<h4>BACONE</h4>'+
      '<p>Cinque simboli A/B per lettera: cifrario bilitterale, steganografia e un sorprendente legame con il binario.</p>'+
      '<span class="badge secret">CODICE SEGRETO</span>';
    card.onclick=renderModule;

    const rot13=cards.querySelector("[data-rot13-card]");
    const caesar=cards.querySelector('[data-module="caesar"]');
    if(rot13) rot13.insertAdjacentElement("afterend",card);
    else if(caesar) caesar.insertAdjacentElement("afterend",card);
    else cards.prepend(card);
  }

  injectStyle();

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#baconInput")) moduleOpen=false;
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();

  if(!selfTest()) console.error("CODEX! Bacon self-test failed");
})();
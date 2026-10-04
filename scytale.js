(() => {
  "use strict";

  let moduleOpen = false;

  function normalizeText(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
  }

  function encodeScytale(text, cols) {
    const clean = normalizeText(text);
    if (!clean) return {clean:"", cipher:"", rows:0, grid:[]};
    const rows = Math.ceil(clean.length / cols);
    const grid = Array.from({length:rows},()=>Array(cols).fill(""));
    let k=0;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(k<clean.length) grid[r][c]=clean[k++];
      }
    }
    let cipher="";
    for(let c=0;c<cols;c++){
      for(let r=0;r<rows;r++){
        if(grid[r][c]) cipher+=grid[r][c];
      }
    }
    return {clean,cipher,rows,grid};
  }

  function decodeScytale(cipherText, cols) {
    const clean = normalizeText(cipherText);
    if (!clean) return {clean:"", plain:"", rows:0, grid:[]};

    const n=clean.length;
    const rows=Math.ceil(n/cols);
    const fullCols=n%cols===0 ? cols : n%cols;
    const grid=Array.from({length:rows},()=>Array(cols).fill(""));

    let k=0;
    for(let c=0;c<cols;c++){
      const colLen = c < fullCols ? rows : rows-1;
      for(let r=0;r<colLen;r++){
        if(k<n) grid[r][c]=clean[k++];
      }
    }

    let plain="";
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(grid[r][c]) plain+=grid[r][c];
      }
    }
    return {clean,plain,rows,grid};
  }

  function groupText(text, size=5) {
    return text.match(new RegExp(".{1,"+size+"}","g"))?.join(" ") || "";
  }

  function renderGrid(grid, mode="wrapped") {
    if(!grid.length) return '<span class="result-placeholder">La disposizione delle lettere comparirà qui.</span>';
    const rows=grid.length;
    const cols=grid[0].length;
    return '<div class="sc-grid '+mode+'" style="--sc-cols:'+cols+'">' +
      grid.map((row,r)=>row.map((ch,c)=>
        '<div class="sc-cell '+(!ch?'empty':'')+'" data-r="'+r+'" data-c="'+c+'">'+(ch||"")+'</div>'
      ).join("")).join("") +
      '</div>';
  }

  function renderCylinder(grid) {
    if(!grid.length) {
      return '<div class="sc-cylinder empty"><div class="sc-rod"></div><span>Scrivi un messaggio</span></div>';
    }
    const rows=grid.length;
    const cols=grid[0].length;
    let bands="";
    for(let r=0;r<rows;r++){
      const letters=grid[r].map((ch,c)=>
        '<span style="--i:'+c+';--count:'+cols+'">'+(ch||"·")+'</span>'
      ).join("");
      bands += '<div class="sc-band" style="--row:'+r+';--rows:'+rows+'">'+letters+'</div>';
    }
    return '<div class="sc-cylinder">' +
      '<div class="sc-cylinder-cap top"></div>' +
      '<div class="sc-rod"></div>' +
      '<div class="sc-bands">'+bands+'</div>' +
      '<div class="sc-cylinder-cap bottom"></div>' +
      '</div>';
  }

  function helpHtml() {
    return `
      <h2>Scitala spartana</h2>
      <p>La scitala era un sistema di <strong>trasposizione</strong>: le lettere non venivano sostituite, ma cambiate di posizione.</p>
      <p>Una striscia veniva avvolta attorno a un cilindro. Il messaggio veniva scritto lungo la scitala; una volta srotolata, la sequenza delle lettere appariva mescolata.</p>
      <p>Per leggere il messaggio serviva una scitala con la stessa circonferenza, cioè la stessa <strong>chiave geometrica</strong>.</p>
      <p>In CODEX! la chiave indica quante lettere stanno in ogni giro. La rappresentazione digitale riempie la griglia per righe e legge il cifrato per colonne.</p>
      <p>È un cifrario di trasposizione molto antico: non modifica le lettere, ma soltanto il loro ordine.</p>
    `;
  }

  function renderModule() {
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=`
      <div class="module-head">
        <div>
          <div class="eyebrow">Codice segreto · trasposizione</div>
          <h2>Scitala spartana</h2>
          <p>Avvolgi virtualmente una striscia sul cilindro e osserva come il messaggio cambia quando viene srotolato.</p>
        </div>
        <button class="help-btn" id="scHelp">? COME FUNZIONA</button>
      </div>

      <div class="workspace sc-workspace">
        <section class="panel">
          <div class="sc-key-head">
            <div>
              <h3>Scitala</h3>
              <p>Chiave = lettere per giro</p>
            </div>
            <div class="sc-key-value" id="scKeyValue">5</div>
          </div>

          <label class="field">
            Diametro virtuale / chiave
            <div class="range-row">
              <input type="range" id="scKey" min="2" max="12" value="5">
              <div class="range-value" id="scKeyMini">5</div>
            </div>
          </label>

          <div class="sc-view-tabs">
            <button class="primary active" id="scWrappedBtn">AVVOLTA</button>
            <button class="ghost" id="scUnwrappedBtn">SROTOLATA</button>
          </div>

          <div class="sc-visual" id="scVisual"></div>

          <div class="sc-direction">
            <span><b>Scrittura</b> → lungo la scitala</span>
            <span><b>Lettura</b> ↓ sulla striscia srotolata</span>
          </div>
        </section>

        <section class="panel">
          <h3>Testo → scitala</h3>
          <label class="field">Messaggio
            <textarea id="scText" placeholder="Scrivi qui il messaggio…">ATTACCAREALLALBA</textarea>
          </label>

          <div class="result-box sc-result" id="scEncoded"></div>
          <div class="action-row">
            <button class="ghost" id="scCopyEncoded">COPIA CIFRATO</button>
            <button class="ghost" id="scClearText">PULISCI</button>
          </div>

          <h3 class="sc-decode-title">Scitala → testo</h3>
          <label class="field">Messaggio cifrato
            <textarea id="scCipher" spellcheck="false" placeholder="Incolla qui il testo cifrato…"></textarea>
          </label>

          <div class="result-box sc-result decoded" id="scDecoded"></div>
          <div class="action-row">
            <button class="ghost" id="scUseEncoded">USA IL CIFRATO</button>
            <button class="ghost" id="scCopyDecoded">COPIA TESTO</button>
            <button class="ghost" id="scClearCipher">PULISCI</button>
          </div>

          <div class="note">
            Spazi, accenti, numeri e punteggiatura vengono eliminati, come in molti sistemi cifranti storici.
          </div>
        </section>
      </div>

      <section class="panel sc-explain">
        <h3>Perché funziona?</h3>
        <div class="sc-explain-grid">
          <div><b>1</b><span>Avvolgi la striscia</span></div>
          <div><b>2</b><span>Scrivi il messaggio lungo il cilindro</span></div>
          <div><b>3</b><span>Srotola la striscia</span></div>
          <div><b>4</b><span>Le lettere risultano trasposte</span></div>
        </div>
      </section>
    `;

    const key=document.querySelector("#scKey");
    const keyValue=document.querySelector("#scKeyValue");
    const keyMini=document.querySelector("#scKeyMini");
    const text=document.querySelector("#scText");
    const cipher=document.querySelector("#scCipher");
    const encoded=document.querySelector("#scEncoded");
    const decoded=document.querySelector("#scDecoded");
    const visual=document.querySelector("#scVisual");
    const wrappedBtn=document.querySelector("#scWrappedBtn");
    const unwrappedBtn=document.querySelector("#scUnwrappedBtn");

    let view="wrapped";

    function currentCols(){ return +key.value; }

    function update() {
      const cols=currentCols();
      keyValue.textContent=cols;
      keyMini.textContent=cols;

      const enc=encodeScytale(text.value,cols);
      encoded.textContent=groupText(enc.cipher,5);
      if(!enc.cipher) encoded.innerHTML='<span class="result-placeholder">Scrivi un messaggio per cifrarlo.</span>';

      const dec=decodeScytale(cipher.value,cols);
      decoded.textContent=dec.plain;
      if(!dec.plain) decoded.innerHTML='<span class="result-placeholder">Inserisci un messaggio cifrato per decodificarlo.</span>';

      if(view==="wrapped"){
        visual.innerHTML=renderCylinder(enc.grid);
      }else{
        visual.innerHTML=renderGrid(enc.grid,"unwrapped");
      }
    }

    function setView(next){
      view=next;
      wrappedBtn.classList.toggle("active",view==="wrapped");
      wrappedBtn.classList.toggle("primary",view==="wrapped");
      wrappedBtn.classList.toggle("ghost",view!=="wrapped");
      unwrappedBtn.classList.toggle("active",view==="unwrapped");
      unwrappedBtn.classList.toggle("primary",view==="unwrapped");
      unwrappedBtn.classList.toggle("ghost",view!=="unwrapped");
      update();
    }

    key.addEventListener("input",update);
    text.addEventListener("input",update);
    cipher.addEventListener("input",update);

    wrappedBtn.onclick=()=>setView("wrapped");
    unwrappedBtn.onclick=()=>setView("unwrapped");

    document.querySelector("#scUseEncoded").onclick=()=>{
      const enc=encodeScytale(text.value,currentCols());
      cipher.value=enc.cipher;
      update();
      cipher.scrollIntoView({behavior:"smooth",block:"center"});
    };
    document.querySelector("#scClearText").onclick=()=>{text.value="";update();};
    document.querySelector("#scClearCipher").onclick=()=>{cipher.value="";update();};

    document.querySelector("#scCopyEncoded").onclick=async()=>{
      const enc=encodeScytale(text.value,currentCols()).cipher;
      if(enc) try{await navigator.clipboard.writeText(enc);}catch{}
    };
    document.querySelector("#scCopyDecoded").onclick=async()=>{
      const dec=decodeScytale(cipher.value,currentCols()).plain;
      if(dec) try{await navigator.clipboard.writeText(dec);}catch{}
    };

    document.querySelector("#scHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content && dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    update();
  }

  function ensureCard() {
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-scytale-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.scytaleCard="1";
    card.innerHTML=`
      <div class="card-icon sc-card-icon" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <h4>SCITALA</h4>
      <p>Trasponi un messaggio avvolgendo virtualmente una striscia attorno a un cilindro.</p>
      <span class="badge secret">CODICE SEGRETO</span>
    `;
    card.onclick=renderModule;

    const poly=cards.querySelector("[data-polybius-card]");
    const pig=cards.querySelector('[data-module="pigpen"]');
    if(poly) cards.insertBefore(card,poly);
    else if(pig) cards.insertBefore(card,pig);
    else cards.appendChild(card);
  }

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#scVisual")) moduleOpen=false;
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();
})();
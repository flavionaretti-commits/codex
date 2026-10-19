(() => {
  "use strict";

  const LABELS="ADFGX";
  const BASE="ABCDEFGHIKLMNOPQRSTUVWXYZ";
  let moduleOpen=false;

  function normLetters(text,mergeJ=true){
    let s=String(text||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toUpperCase()
      .replace(/[^A-Z]/g,"");
    if(mergeJ) s=s.replace(/J/g,"I");
    return s;
  }

  function keyedSquare(keyword){
    const out=[];
    const src=normLetters(keyword,true)+BASE;
    for(const ch of src) if(!out.includes(ch)) out.push(ch);
    return out.slice(0,25);
  }

  function squareMaps(square){
    const enc={},dec={};
    square.forEach((ch,i)=>{
      const r=Math.floor(i/5), c=i%5;
      const pair=LABELS[r]+LABELS[c];
      enc[ch]=pair;
      dec[pair]=ch;
    });
    enc.J=enc.I;
    return {enc,dec};
  }

  function fractionate(text,square){
    const plain=normLetters(text,true);
    const {enc}=squareMaps(square);
    const steps=[...plain].map(ch=>({ch,pair:enc[ch]}));
    return {plain,steps,stream:steps.map(x=>x.pair).join("")};
  }

  function cleanKey(text){
    return normLetters(text,false) || "CARGO";
  }

  function columnOrder(key){
    return [...key].map((ch,i)=>({ch,i}))
      .sort((a,b)=>a.ch.localeCompare(b.ch)||a.i-b.i);
  }

  function transpose(stream,keyRaw){
    const key=cleanKey(keyRaw);
    const k=key.length;
    const rows=[];
    for(let i=0;i<stream.length;i+=k) rows.push(stream.slice(i,i+k).split(""));
    const order=columnOrder(key);
    let cipher="";
    const columns=[];
    for(const o of order){
      let col="";
      for(const row of rows) if(row[o.i]!==undefined) col+=row[o.i];
      columns.push({key:o.ch,index:o.i,text:col});
      cipher+=col;
    }
    return {key,rows,order,columns,cipher};
  }

  function untranspose(cipherRaw,keyRaw){
    const cipher=String(cipherRaw||"").toUpperCase().replace(/[^ADFGX]/g,"");
    const key=cleanKey(keyRaw);
    const k=key.length;
    const n=cipher.length;
    const base=Math.floor(n/k);
    const extra=n%k;
    const colLengths=Array.from({length:k},(_,i)=>base+(i<extra?1:0));
    const order=columnOrder(key);
    const cols=Array.from({length:k},()=>[]);
    let p=0;

    for(const o of order){
      const len=colLengths[o.i];
      cols[o.i]=cipher.slice(p,p+len).split("");
      p+=len;
    }

    const maxRows=Math.ceil(n/k);
    let stream="";
    const rows=[];
    for(let r=0;r<maxRows;r++){
      const row=[];
      for(let c=0;c<k;c++){
        if(cols[c][r]!==undefined){
          row[c]=cols[c][r];
          stream+=cols[c][r];
        }
      }
      rows.push(row);
    }
    return {cipher,key,stream,rows,order,colLengths};
  }

  function defractionate(stream,square){
    const {dec}=squareMaps(square);
    const pairs=[];
    let plain="";
    let bad=false;
    for(let i=0;i+1<stream.length;i+=2){
      const pair=stream.slice(i,i+2);
      const ch=dec[pair];
      pairs.push({pair,ch:ch||"�"});
      if(ch) plain+=ch; else {plain+="�";bad=true;}
    }
    return {plain,pairs,bad,odd:stream.length%2!==0};
  }

  function esc(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function injectStyle(){
    if(document.querySelector("#adfgx-style")) return;
    const s=document.createElement("style");
    s.id="adfgx-style";
    s.textContent=
      ".adfgx-card-icon{width:44px;height:44px;border:2px solid currentColor;border-radius:8px;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;padding:4px;font:900 7px/1 monospace}.adfgx-card-icon span{display:grid;place-items:center;background:color-mix(in srgb,currentColor 10%,transparent);border-radius:2px}"+
      ".adfgx-keys{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}"+
      ".adfgx-workspace{grid-template-columns:minmax(360px,.95fr) minmax(0,1.05fr)}"+
      ".adfgx-square-wrap{overflow-x:auto}.adfgx-square{display:grid;grid-template-columns:40px repeat(5,minmax(54px,1fr));gap:5px;max-width:470px;margin:12px auto}"+
      ".adfgx-head{min-height:42px;display:grid;place-items:center;border-radius:9px;background:var(--accent);color:#fff;font:900 13px/1 monospace}"+
      ".adfgx-corner{background:transparent;border:1px dashed var(--line);color:var(--muted)}"+
      ".adfgx-cell{min-height:58px;border:1px solid var(--line);border-radius:10px;background:var(--bg);display:grid;place-items:center;text-align:center}.adfgx-cell b{font:900 19px/1 Georgia,serif}.adfgx-cell small{display:block;color:var(--muted);font:800 9px/1 monospace;margin-top:4px}"+
      ".adfgx-stage{margin-top:16px}.adfgx-stage-title{display:flex;align-items:center;gap:9px;margin-bottom:9px}.adfgx-stage-num{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font:900 13px/1 monospace}"+
      ".adfgx-fractions{display:flex;flex-wrap:wrap;gap:6px}.adfgx-frac{padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:var(--bg);display:flex;gap:6px;align-items:center}.adfgx-frac b{font:900 12px/1 Georgia,serif}.adfgx-frac code{color:var(--accent);font:900 11px/1 monospace}"+
      ".adfgx-stream{margin-top:10px;padding:12px;border-radius:12px;background:var(--panel-2);font:900 15px/1.55 monospace;letter-spacing:.08em;overflow-wrap:anywhere}"+
      ".adfgx-table-wrap{overflow-x:auto;margin-top:10px}.adfgx-table{border-collapse:separate;border-spacing:5px;margin:0 auto;min-width:max-content}.adfgx-table th,.adfgx-table td{min-width:38px;height:38px;text-align:center;border-radius:8px}.adfgx-table th{background:var(--panel-2);font:900 13px/1 monospace;border:1px solid var(--line)}.adfgx-table th small{display:block;color:var(--muted);font-size:8px;margin-top:3px}.adfgx-table td{background:var(--bg);border:1px solid var(--line);font:900 13px/1 monospace;color:var(--accent)}"+
      ".adfgx-order{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.adfgx-colchip{padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:var(--bg);font:800 10px/1.3 monospace}.adfgx-colchip b{color:var(--accent);font-size:13px;margin-right:5px}"+
      ".adfgx-result{min-height:95px;font:900 18px/1.55 monospace;letter-spacing:.08em;overflow-wrap:anywhere}"+
      ".adfgx-decode-steps{display:grid;gap:10px;margin-top:12px}.adfgx-decode-steps>div{padding:10px 12px;border-radius:11px;background:var(--panel-2);font-size:11px;color:var(--muted)}.adfgx-decode-steps code{display:block;margin-top:5px;color:var(--ink);font:800 12px/1.5 monospace;overflow-wrap:anywhere}"+
      ".adfgx-morse{margin-top:18px;text-align:center}.adfgx-morse-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}.adfgx-morse-chip{padding:9px 12px;border:1px solid var(--line);border-radius:11px;background:var(--bg)}.adfgx-morse-chip b{display:block;font:900 18px/1 Georgia,serif}.adfgx-morse-chip code{display:block;margin-top:5px;color:var(--muted);font-size:11px}"+
      "@media(max-width:900px){.adfgx-workspace{grid-template-columns:1fr}}@media(max-width:620px){.adfgx-keys{grid-template-columns:1fr}.adfgx-square{grid-template-columns:34px repeat(5,minmax(46px,1fr))}.adfgx-cell{min-height:52px}}";
    document.head.appendChild(s);
  }

  function historyHtml(){
    return '<h2>ADFGX: il cifrario dei radiotelegrafisti del 1918</h2>'+
      '<div class="history-era">◷ 1918 · Prima guerra mondiale</div>'+
      '<p>ADFGX fu ideato dall’ufficiale tedesco <strong>Fritz Nebel</strong> e introdotto sul fronte occidentale il <strong>1º marzo 1918</strong> con il nome militare <em>Geheimschrift der Funker 1918</em>.</p>'+
      '<p>Combinava una scacchiera di Polibio con una trasposizione colonnare: prima ogni lettera diventava una coppia scelta fra A, D, F, G e X; poi l’intera sequenza veniva rimescolata tramite una parola chiave.</p>'+
      '<p>Le cinque lettere furono scelte perché i loro segnali Morse risultano molto diversi fra loro, riducendo gli errori nella radiotelegrafia. Il crittoanalista francese <strong>Georges Painvin</strong> riuscì a violare il sistema durante il 1918.</p>'+
      '<p>Dal 1º giugno 1918 comparve la variante <strong>ADFGVX</strong>, con una griglia 6×6 capace di includere anche le cifre.</p>';
  }

  function helpHtml(){
    return '<h2>ADFGX</h2>'+
      '<p>ADFGX è un cifrario in <strong>due stadi</strong>.</p>'+
      '<p><strong>1. Frazionamento:</strong> si costruisce un quadrato 5×5 con righe e colonne chiamate A, D, F, G, X. Ogni lettera del messaggio viene sostituita dalle due coordinate della sua casella.</p>'+
      '<p><strong>2. Trasposizione:</strong> la sequenza di A/D/F/G/X viene scritta sotto una seconda parola chiave. Le colonne vengono poi lette nell’ordine alfabetico delle lettere della chiave.</p>'+
      '<p>I e J condividono la stessa casella, come nel quadrato di Polibio classico. In caso di lettere ripetute nella chiave di trasposizione, CODEX! mantiene da sinistra a destra il loro ordine originale.</p>';
  }

  function squareHtml(square){
    let html='<div class="adfgx-head adfgx-corner">×</div>';
    for(const l of LABELS) html+='<div class="adfgx-head">'+l+'</div>';
    for(let r=0;r<5;r++){
      html+='<div class="adfgx-head">'+LABELS[r]+'</div>';
      for(let c=0;c<5;c++){
        const ch=square[r*5+c];
        html+='<div class="adfgx-cell"><div><b>'+(ch==="I"?"I/J":ch)+'</b><small>'+LABELS[r]+LABELS[c]+'</small></div></div>';
      }
    }
    return html;
  }

  function tableHtml(rows,key){
    let html='<table class="adfgx-table"><thead><tr>';
    key.split("").forEach((ch,i)=>{
      const rank=columnOrder(key).findIndex(x=>x.i===i)+1;
      html+='<th>'+ch+'<small>'+rank+'</small></th>';
    });
    html+='</tr></thead><tbody>';
    for(const row of rows){
      html+='<tr>';
      for(let c=0;c<key.length;c++) html+='<td>'+(row[c]||"")+'</td>';
      html+='</tr>';
    }
    html+='</tbody></table>';
    return html;
  }

  function renderModule(){
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=
      '<div class="module-head"><div>'+
      '<div class="eyebrow">Codice segreto · frazionamento + trasposizione</div>'+
      '<h2>ADFGX</h2>'+
      '<p>Un cifrario militare del 1918 che combina Polibio e trasposizione colonnare.</p>'+
      '</div><div class="module-actions"><button class="help-btn" id="adfgxHelp">? COME FUNZIONA</button><button class="help-btn history-btn" id="adfgxHistory">◷ STORIA</button></div></div>'+

      '<section class="panel adfgx-keys">'+
        '<label class="field">Chiave del quadrato<input id="adfgxSquareKey" type="text" autocomplete="off" spellcheck="false" value="SEGRETO" placeholder="Es. SEGRETO"></label>'+
        '<label class="field">Chiave di trasposizione<input id="adfgxTransKey" type="text" autocomplete="off" spellcheck="false" value="CARGO" placeholder="Es. CARGO"></label>'+
      '</section>'+

      '<div class="workspace adfgx-workspace">'+
        '<section class="panel">'+
          '<h3>Quadrato ADFGX</h3>'+
          '<div class="adfgx-square-wrap"><div class="adfgx-square" id="adfgxSquare"></div></div>'+
          '<div class="note">I/J condividono la stessa casella. Cambia la prima chiave per mescolare l’alfabeto.</div>'+
        '</section>'+
        '<section class="panel">'+
          '<h3>Codifica</h3>'+
          '<label class="field">Messaggio<textarea id="adfgxInput" placeholder="Scrivi qui il messaggio…">ATTACCO ALL ALBA</textarea></label>'+
          '<div class="adfgx-stage">'+
            '<div class="adfgx-stage-title"><span class="adfgx-stage-num">1</span><strong>Frazionamento</strong></div>'+
            '<div class="adfgx-fractions" id="adfgxFractions"></div>'+
            '<div class="adfgx-stream" id="adfgxStream"></div>'+
          '</div>'+
          '<div class="adfgx-stage">'+
            '<div class="adfgx-stage-title"><span class="adfgx-stage-num">2</span><strong>Trasposizione colonnare</strong></div>'+
            '<div class="adfgx-table-wrap" id="adfgxTable"></div>'+
            '<div class="adfgx-order" id="adfgxOrder"></div>'+
          '</div>'+
          '<h3 style="margin-top:18px">Cifrato finale</h3>'+
          '<div class="result-box adfgx-result" id="adfgxResult"></div>'+
          '<div class="action-row"><button class="ghost" id="adfgxCopy">COPIA</button><button class="ghost" id="adfgxUse">USA PER DECODIFICARE</button><button class="ghost" id="adfgxClear">PULISCI</button></div>'+
        '</section>'+
      '</div>'+

      '<section class="panel" style="margin-top:18px">'+
        '<h3>Decodifica</h3>'+
        '<label class="field">Cifrato ADFGX<textarea id="adfgxCipher" spellcheck="false" placeholder="Inserisci il cifrato…"></textarea></label>'+
        '<div class="result-box adfgx-result" id="adfgxDecoded"></div>'+
        '<div class="adfgx-decode-steps" id="adfgxDecodeSteps"></div>'+
        '<div class="action-row"><button class="ghost" id="adfgxCopyDecoded">COPIA TESTO</button><button class="ghost" id="adfgxClearCipher">PULISCI</button></div>'+
      '</section>'+

      '<section class="panel adfgx-morse">'+
        '<h3>Perché proprio A D F G X?</h3>'+
        '<p>In Morse queste lettere hanno sequenze molto diverse, utili per ridurre gli errori di trasmissione radio.</p>'+
        '<div class="adfgx-morse-row">'+
          '<div class="adfgx-morse-chip"><b>A</b><code>· —</code></div>'+
          '<div class="adfgx-morse-chip"><b>D</b><code>— · ·</code></div>'+
          '<div class="adfgx-morse-chip"><b>F</b><code>· · — ·</code></div>'+
          '<div class="adfgx-morse-chip"><b>G</b><code>— — ·</code></div>'+
          '<div class="adfgx-morse-chip"><b>X</b><code>— · · —</code></div>'+
        '</div>'+
      '</section>';

    const squareKey=document.querySelector("#adfgxSquareKey");
    const transKey=document.querySelector("#adfgxTransKey");
    const input=document.querySelector("#adfgxInput");
    const squareEl=document.querySelector("#adfgxSquare");
    const fractionsEl=document.querySelector("#adfgxFractions");
    const streamEl=document.querySelector("#adfgxStream");
    const tableEl=document.querySelector("#adfgxTable");
    const orderEl=document.querySelector("#adfgxOrder");
    const resultEl=document.querySelector("#adfgxResult");
    const cipherEl=document.querySelector("#adfgxCipher");
    const decodedEl=document.querySelector("#adfgxDecoded");
    const decodeSteps=document.querySelector("#adfgxDecodeSteps");

    let state=null;

    function updateEncode(){
      const square=keyedSquare(squareKey.value);
      squareEl.innerHTML=squareHtml(square);

      const frac=fractionate(input.value,square);
      const trans=transpose(frac.stream,transKey.value);
      state={square,frac,trans};

      fractionsEl.innerHTML=frac.steps.length ? frac.steps.map(s=>
        '<div class="adfgx-frac"><b>'+s.ch+'</b><span>→</span><code>'+s.pair+'</code></div>'
      ).join("") : '<span class="result-placeholder">Scrivi un messaggio.</span>';

      streamEl.textContent=frac.stream || "—";
      tableEl.innerHTML=trans.rows.length ? tableHtml(trans.rows,trans.key) : "";
      orderEl.innerHTML=trans.columns.map(c=>
        '<div class="adfgx-colchip"><b>'+c.key+'</b>colonna '+(c.index+1)+' → '+c.text+'</div>'
      ).join("");

      resultEl.textContent=trans.cipher.match(/.{1,5}/g)?.join(" ") || "";
      if(!trans.cipher) resultEl.innerHTML='<span class="result-placeholder">Il cifrato comparirà qui.</span>';
    }

    function updateDecode(){
      const square=keyedSquare(squareKey.value);
      const un=untranspose(cipherEl.value,transKey.value);
      const def=defractionate(un.stream,square);

      decodedEl.textContent=def.plain;
      if(!def.plain) decodedEl.innerHTML='<span class="result-placeholder">Inserisci un cifrato ADFGX.</span>';

      decodeSteps.innerHTML=
        '<div><strong>1. Annulla la trasposizione</strong><code>'+esc(un.stream||"—")+'</code></div>'+
        '<div><strong>2. Ricostruisci le coppie</strong><code>'+(def.pairs.map(p=>p.pair+'→'+p.ch).join("  ")||"—")+'</code></div>'+
        (def.odd?'<div><strong>Attenzione:</strong> il numero di simboli A/D/F/G/X è dispari.</div>':'');
    }

    function updateAll(){
      updateEncode();
      updateDecode();
    }

    squareKey.addEventListener("input",updateAll);
    transKey.addEventListener("input",updateAll);
    input.addEventListener("input",updateEncode);
    cipherEl.addEventListener("input",updateDecode);

    document.querySelector("#adfgxCopy").onclick=async()=>{
      if(state?.trans.cipher) try{await navigator.clipboard.writeText(state.trans.cipher);}catch{}
    };
    document.querySelector("#adfgxUse").onclick=()=>{
      cipherEl.value=state?.trans.cipher||"";
      updateDecode();
      cipherEl.scrollIntoView({behavior:"smooth",block:"center"});
    };
    document.querySelector("#adfgxClear").onclick=()=>{input.value="";updateEncode();};
    document.querySelector("#adfgxCopyDecoded").onclick=async()=>{
      const square=keyedSquare(squareKey.value);
      const value=defractionate(untranspose(cipherEl.value,transKey.value).stream,square).plain;
      if(value) try{await navigator.clipboard.writeText(value);}catch{}
    };
    document.querySelector("#adfgxClearCipher").onclick=()=>{cipherEl.value="";updateDecode();};

    document.querySelector("#adfgxHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };
    document.querySelector("#adfgxHistory").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=historyHtml();dialog.showModal();}
    };

    updateAll();
  }

  function selfTest(){
    const square=keyedSquare("SEGRETO");
    const f=fractionate("ATTACCOALLALBA",square);
    const t=transpose(f.stream,"CARGO");
    const u=untranspose(t.cipher,"CARGO");
    const d=defractionate(u.stream,square);
    return d.plain==="ATTACCOALLALBA" && t.cipher.length===f.stream.length && /^[ADFGX]+$/.test(t.cipher);
  }

  function ensureCard(){
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-adfgx-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.adfgxCard="1";
    card.innerHTML=
      '<div class="card-icon adfgx-card-icon" aria-hidden="true"><span>A</span><span>D</span><span>F</span><span>G</span><span>X</span></div>'+
      '<h4>ADFGX</h4>'+
      '<p>Polibio + trasposizione colonnare: il cifrario militare tedesco del 1918.</p>'+
      '<span class="badge secret">CODICE SEGRETO</span>';
    card.onclick=renderModule;

    const rail=cards.querySelector("[data-rail-card]");
    const bacon=cards.querySelector("[data-bacon-card]");
    if(rail) rail.insertAdjacentElement("afterend",card);
    else if(bacon) bacon.insertAdjacentElement("afterend",card);
    else cards.appendChild(card);
  }

  injectStyle();

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#adfgxInput")) moduleOpen=false;
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();

  if(!selfTest()) console.error("CODEX! ADFGX self-test failed");
})();
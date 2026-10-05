(() => {
  "use strict";

  const BASE = "ABCDEFGHIKLMNOPQRSTUVWXYZ";
  let moduleOpen = false;

  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toUpperCase()
      .replace(/J/g,"I")
      .replace(/[^A-Z]/g,"");
  }

  function buildSquare(keyword="") {
    const out=[];
    for(const ch of normalize(keyword)+BASE) {
      if(!out.includes(ch)) out.push(ch);
    }
    return out.slice(0,25);
  }

  function maps(square) {
    const pos={};
    square.forEach((ch,i)=>pos[ch]={r:Math.floor(i/5),c:i%5});
    pos.J=pos.I;
    return pos;
  }

  function fillerFor(ch) {
    return ch === "X" ? "Q" : "X";
  }

  function preparePlaintext(text) {
    const s=normalize(text);
    const pairs=[];
    let i=0;

    while(i<s.length) {
      const a=s[i];
      const b=s[i+1];

      if(!b) {
        pairs.push({a,b:fillerFor(a),inserted:true,reason:"fine dispari"});
        i+=1;
        continue;
      }

      if(a===b) {
        pairs.push({a,b:fillerFor(a),inserted:true,reason:"lettere uguali"});
        i+=1;
        continue;
      }

      pairs.push({a,b,inserted:false,reason:""});
      i+=2;
    }
    return pairs;
  }

  function splitCipher(text) {
    const s=normalize(text);
    const pairs=[];
    for(let i=0;i<s.length;i+=2) {
      pairs.push({a:s[i]||"",b:s[i+1]||"",incomplete:!s[i+1]});
    }
    return pairs;
  }

  function transformPair(a,b,square,pos,dir) {
    const p1=pos[a], p2=pos[b];
    if(!p1 || !p2) return {a:"�",b:"�",rule:"errore"};

    let q1,q2,rule;
    if(p1.r===p2.r) {
      q1={r:p1.r,c:(p1.c+dir+5)%5};
      q2={r:p2.r,c:(p2.c+dir+5)%5};
      rule=dir===1 ? "stessa riga → destra" : "stessa riga → sinistra";
    } else if(p1.c===p2.c) {
      q1={r:(p1.r+dir+5)%5,c:p1.c};
      q2={r:(p2.r+dir+5)%5,c:p2.c};
      rule=dir===1 ? "stessa colonna → giù" : "stessa colonna → su";
    } else {
      q1={r:p1.r,c:p2.c};
      q2={r:p2.r,c:p1.c};
      rule="rettangolo → scambia colonna";
    }

    return {
      a:square[q1.r*5+q1.c],
      b:square[q2.r*5+q2.c],
      rule,
      in1:p1,
      in2:p2,
      out1:q1,
      out2:q2
    };
  }

  function encodeText(text,square,pos) {
    const prepared=preparePlaintext(text);
    const steps=[];
    let out="";
    for(const p of prepared) {
      const t=transformPair(p.a,p.b,square,pos,1);
      out+=t.a+t.b;
      steps.push({...p,...t,input:p.a+p.b,output:t.a+t.b});
    }
    return {prepared,steps,out};
  }

  function decodeText(text,square,pos) {
    const pairs=splitCipher(text);
    const steps=[];
    let out="";
    let error="";
    for(const p of pairs) {
      if(p.incomplete) {
        error="Il cifrato deve avere un numero pari di lettere.";
        continue;
      }
      const t=transformPair(p.a,p.b,square,pos,-1);
      out+=t.a+t.b;
      steps.push({...p,...t,input:p.a+p.b,output:t.a+t.b});
    }
    return {pairs,steps,out,error};
  }

  function squareHtml(square) {
    return square.map((ch,i)=>{
      const label=ch==="I"?"I/J":ch;
      return '<button type="button" class="pf-cell" data-char="'+ch+'" data-r="'+Math.floor(i/5)+'" data-c="'+(i%5)+'">'+
        '<strong>'+label+'</strong><span>'+(Math.floor(i/5)+1)+','+((i%5)+1)+'</span></button>';
    }).join("");
  }

  function helpHtml() {
    return `
      <h2>Cifrario di Playfair</h2>
      <p>Playfair cifra <strong>coppie di lettere</strong> usando un quadrato 5×5 costruito da una parola chiave. In questa versione I e J condividono la stessa casella.</p>
      <p>Il testo viene diviso in digrammi. Se una coppia contiene due lettere uguali, CODEX! inserisce una <strong>X</strong> fra loro; se la lettera ripetuta è X usa <strong>Q</strong>. Se resta una sola lettera alla fine, aggiunge un riempitivo.</p>
      <p><strong>Stessa riga:</strong> in codifica si prende la lettera a destra; in decodifica quella a sinistra.</p>
      <p><strong>Stessa colonna:</strong> in codifica si prende la lettera sotto; in decodifica quella sopra.</p>
      <p><strong>Rettangolo:</strong> ciascuna lettera viene sostituita da quella sulla stessa riga ma nella colonna dell’altra.</p>
      <p>Durante la decodifica i riempitivi X/Q non vengono rimossi automaticamente: vanno interpretati dal contesto.</p>
    `;
  }

  function renderModule() {
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=`
      <div class="module-head">
        <div>
          <div class="eyebrow">Codice segreto · sostituzione digrafica</div>
          <h2>Playfair</h2>
          <p>Cifra coppie di lettere usando un quadrato 5×5 costruito da una parola chiave.</p>
        </div>
        <button class="help-btn" id="pfHelp">? COME FUNZIONA</button>
      </div>

      <div class="workspace pf-workspace">
        <section class="panel">
          <h3>Quadrato Playfair</h3>
          <label class="field">Parola chiave
            <input id="pfKeyword" type="text" autocomplete="off" spellcheck="false" value="SEGRETO" placeholder="Es. SEGRETO">
          </label>

          <div class="pf-square" id="pfSquare"></div>

          <div class="pf-legend">
            <span><i class="pf-dot in"></i> lettere della coppia</span>
            <span><i class="pf-dot out"></i> lettere risultanti</span>
            <span><b>I/J</b> stessa casella</span>
          </div>
          <div class="note">Passa sopra un passaggio oppure toccalo per evidenziare le quattro caselle coinvolte.</div>
        </section>

        <section class="panel">
          <h3>Codifica</h3>
          <label class="field">Testo
            <textarea id="pfPlain" placeholder="Scrivi qui il messaggio…">INCONTRO AL CASTELLO</textarea>
          </label>

          <div class="pf-prepared">
            <small>Digrammi preparati</small>
            <div id="pfPrepared"></div>
          </div>

          <div class="result-box pf-result" id="pfEncoded"></div>
          <div class="action-row">
            <button class="ghost" id="pfCopyEncoded">COPIA CIFRATO</button>
            <button class="ghost" id="pfUseEncoded">USA PER DECODIFICARE</button>
            <button class="ghost" id="pfClearPlain">PULISCI</button>
          </div>

          <div class="pf-steps" id="pfEncodeSteps"></div>

          <h3 class="pf-decode-title">Decodifica</h3>
          <label class="field">Testo cifrato
            <textarea id="pfCipher" spellcheck="false" placeholder="Incolla qui il testo cifrato…"></textarea>
          </label>

          <div class="result-box pf-result decoded" id="pfDecoded"></div>
          <div class="pf-warning" id="pfDecodeWarning"></div>

          <div class="action-row">
            <button class="ghost" id="pfCopyDecoded">COPIA TESTO</button>
            <button class="ghost" id="pfClearCipher">PULISCI</button>
          </div>

          <div class="pf-steps" id="pfDecodeSteps"></div>
        </section>
      </div>

      <section class="panel pf-rules">
        <h3>Le tre regole</h3>
        <div class="pf-rule-grid">
          <div><b>1</b><strong>Stessa riga</strong><span>sposta orizzontalmente</span></div>
          <div><b>2</b><strong>Stessa colonna</strong><span>sposta verticalmente</span></div>
          <div><b>3</b><strong>Rettangolo</strong><span>scambia le colonne</span></div>
        </div>
      </section>
    `;

    const keyword=document.querySelector("#pfKeyword");
    const square=document.querySelector("#pfSquare");
    const plain=document.querySelector("#pfPlain");
    const cipher=document.querySelector("#pfCipher");
    const prepared=document.querySelector("#pfPrepared");
    const encoded=document.querySelector("#pfEncoded");
    const decoded=document.querySelector("#pfDecoded");
    const encSteps=document.querySelector("#pfEncodeSteps");
    const decSteps=document.querySelector("#pfDecodeSteps");
    const warning=document.querySelector("#pfDecodeWarning");

    let sq=buildSquare(keyword.value);
    let pos=maps(sq);

    function clearHighlight() {
      square.querySelectorAll(".pf-cell").forEach(c=>c.classList.remove("pair-in","pair-out","same"));
    }

    function markCoord(coord,cls) {
      if(!coord) return;
      const el=square.querySelector('[data-r="'+coord.r+'"][data-c="'+coord.c+'"]');
      if(el) el.classList.add(cls);
    }

    function highlightStep(step) {
      clearHighlight();
      markCoord(step.in1,"pair-in");
      markCoord(step.in2,"pair-in");
      markCoord(step.out1,"pair-out");
      markCoord(step.out2,"pair-out");
      const same1=step.in1 && step.out1 && step.in1.r===step.out1.r && step.in1.c===step.out1.c;
      const same2=step.in2 && step.out2 && step.in2.r===step.out2.r && step.in2.c===step.out2.c;
      if(same1) markCoord(step.in1,"same");
      if(same2) markCoord(step.in2,"same");
    }

    function stepHtml(step,index) {
      return '<button type="button" class="pf-step" data-step="'+index+'">'+
        '<span class="pf-pair from">'+step.input+'</span>'+
        '<span class="pf-arrow">→</span>'+
        '<span class="pf-pair to">'+step.output+'</span>'+
        '<small>'+step.rule+'</small>'+
        '</button>';
    }

    function wireStepHighlights(container,steps) {
      container.querySelectorAll(".pf-step").forEach(btn=>{
        const st=steps[+btn.dataset.step];
        btn.onmouseenter=()=>highlightStep(st);
        btn.onmouseleave=clearHighlight;
        btn.onclick=()=>highlightStep(st);
      });
    }

    function renderSquare() {
      sq=buildSquare(keyword.value);
      pos=maps(sq);
      square.innerHTML=squareHtml(sq);
      updateAll();
    }

    function updateEncode() {
      const res=encodeText(plain.value,sq,pos);
      encoded.textContent=res.out.match(/.{1,5}/g)?.join(" ") || "";
      if(!res.out) encoded.innerHTML='<span class="result-placeholder">Scrivi un messaggio per cifrarlo.</span>';

      prepared.innerHTML=res.prepared.length
        ? res.prepared.map(p=>'<span class="pf-digram '+(p.inserted?"inserted":"")+'" title="'+(p.reason||"")+'">'+p.a+p.b+'</span>').join("")
        : '<span class="result-placeholder">—</span>';

      encSteps.innerHTML=res.steps.map((s,i)=>stepHtml(s,i)).join("");
      wireStepHighlights(encSteps,res.steps);
    }

    function updateDecode() {
      const res=decodeText(cipher.value,sq,pos);
      decoded.textContent=res.out.match(/.{1,5}/g)?.join(" ") || "";
      if(!res.out) decoded.innerHTML='<span class="result-placeholder">Inserisci un cifrato con un numero pari di lettere.</span>';

      warning.textContent=res.error || (res.out ? "Nota: eventuali X/Q di riempimento restano nel testo decodificato." : "");
      warning.className="pf-warning"+(res.error?" error":"");

      decSteps.innerHTML=res.steps.map((s,i)=>stepHtml(s,i)).join("");
      wireStepHighlights(decSteps,res.steps);
    }

    function updateAll() {
      clearHighlight();
      updateEncode();
      updateDecode();
    }

    keyword.addEventListener("input",renderSquare);
    plain.addEventListener("input",updateEncode);
    cipher.addEventListener("input",updateDecode);

    document.querySelector("#pfUseEncoded").onclick=()=>{
      const res=encodeText(plain.value,sq,pos);
      cipher.value=res.out;
      updateDecode();
      cipher.scrollIntoView({behavior:"smooth",block:"center"});
    };

    document.querySelector("#pfClearPlain").onclick=()=>{plain.value="";updateEncode();};
    document.querySelector("#pfClearCipher").onclick=()=>{cipher.value="";updateDecode();};

    document.querySelector("#pfCopyEncoded").onclick=async()=>{
      const res=encodeText(plain.value,sq,pos);
      if(res.out) try{await navigator.clipboard.writeText(res.out);}catch{}
    };
    document.querySelector("#pfCopyDecoded").onclick=async()=>{
      const res=decodeText(cipher.value,sq,pos);
      if(res.out) try{await navigator.clipboard.writeText(res.out);}catch{}
    };

    document.querySelector("#pfHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content && dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    renderSquare();
  }

  function selfTest() {
    const sq=buildSquare("PLAYFAIR EXAMPLE");
    const pos=maps(sq);
    const res=encodeText("HIDE THE GOLD IN THE TREE STUMP",sq,pos);
    return res.out==="BMODZBXDNABEKUDMUIXMMOUVIF";
  }

  function ensureCard() {
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-playfair-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.playfairCard="1";
    card.innerHTML=`
      <div class="card-icon pf-card-icon" aria-hidden="true">
        <span>PL</span><span>AY</span><span>FA</span><span>IR</span>
      </div>
      <h4>PLAYFAIR</h4>
      <p>Cifra coppie di lettere con un quadrato 5×5 costruito da una parola chiave.</p>
      <span class="badge secret">CODICE SEGRETO</span>
    `;
    card.onclick=renderModule;

    const poly=cards.querySelector("[data-polybius-card]");
    const scytale=cards.querySelector("[data-scytale-card]");
    if(poly) poly.insertAdjacentElement("afterend",card);
    else if(scytale) scytale.insertAdjacentElement("afterend",card);
    else cards.appendChild(card);
  }

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#pfSquare")) moduleOpen=false;
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();

  if(!selfTest()) console.error("CODEX! Playfair self-test failed");
})();
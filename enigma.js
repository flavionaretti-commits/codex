(() => {
  "use strict";

  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const ROTORS = {
    I:   { wiring:"EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch:"Q" },
    II:  { wiring:"AJDKSIRUXBLHWTMCQGZNPYFVOE", notch:"E" },
    III: { wiring:"BDFHJLCPRTXVZNYEIWGAKMUSQO", notch:"V" },
    IV:  { wiring:"ESOVPZJAYQUIRHXLNFTGKDCMWB", notch:"J" },
    V:   { wiring:"VZBRGITYUPSDNHLXAWMJQOFECK", notch:"Z" }
  };
  const REFLECTORS = {
    B:"YRUHQSLDPXNGOKMIEBFZCWVJAT",
    C:"FVPJIAOYEDRZXWGCTKUQSBNMHL"
  };
  const KEY_ROWS = ["QWERTZUIO","ASDFGHJK","PYXCVBNML"];

  let moduleOpen = false;
  let state = null;
  let lampTimer = null;

  const n = x => ((x % 26) + 26) % 26;
  const idx = ch => A.indexOf(ch);
  const chr = i => A[n(i)];

  function forward(x, rotorName, pos, ring) {
    const w = ROTORS[rotorName].wiring;
    const shifted = n(x + pos - ring);
    const wired = idx(w[shifted]);
    return n(wired - pos + ring);
  }

  function backward(x, rotorName, pos, ring) {
    const w = ROTORS[rotorName].wiring;
    const shifted = n(x + pos - ring);
    const wired = w.indexOf(A[shifted]);
    return n(wired - pos + ring);
  }

  function parsePlugboard(text) {
    const clean = String(text || "").toUpperCase().trim();
    if (!clean) return {map:{}, pairs:[], error:""};
    const tokens = clean.split(/[\s,;]+/).filter(Boolean).map(t => t.replace(/[^A-Z]/g,""));
    const used = new Set();
    const map = {};
    const pairs = [];
    for (const t of tokens) {
      if (t.length !== 2 || t[0] === t[1]) {
        return {map:{},pairs:[],error:"Ogni collegamento deve contenere due lettere diverse, es. AV BS CG."};
      }
      if (used.has(t[0]) || used.has(t[1])) {
        return {map:{},pairs:[],error:"Una lettera può comparire in un solo collegamento del plugboard."};
      }
      used.add(t[0]); used.add(t[1]);
      map[t[0]]=t[1]; map[t[1]]=t[0];
      pairs.push(t);
    }
    if (pairs.length > 10) return {map:{},pairs:[],error:"Enigma I usa al massimo 10 coppie sul plugboard."};
    return {map,pairs,error:""};
  }

  function stepRotors(s) {
    const [lName,mName,rName] = s.rotors;
    let [l,m,r] = s.positions;
    const middleAtNotch = chr(m) === ROTORS[mName].notch;
    const rightAtNotch = chr(r) === ROTORS[rName].notch;
    const stepped = [false,false,true];

    if (middleAtNotch) {
      l = n(l + 1);
      stepped[0] = true;
    }
    if (middleAtNotch || rightAtNotch) {
      m = n(m + 1);
      stepped[1] = true;
    }
    r = n(r + 1);
    s.positions = [l,m,r];
    return stepped;
  }

  function plug(ch, map) {
    return map[ch] || ch;
  }

  function encryptLetter(letter, s) {
    const stepped = stepRotors(s);
    const path = [];
    const in0 = letter;
    let c = plug(letter, s.plugMap);
    path.push(["TASTO", in0], ["SPINA", c]);

    let x = idx(c);
    for (let i=2;i>=0;i--) {
      x = forward(x, s.rotors[i], s.positions[i], s.rings[i]);
      path.push([s.rotors[i] + " →", chr(x)]);
    }

    x = idx(REFLECTORS[s.reflector][x]);
    path.push(["UKW " + s.reflector, chr(x)]);

    for (let i=0;i<3;i++) {
      x = backward(x, s.rotors[i], s.positions[i], s.rings[i]);
      path.push(["← " + s.rotors[i], chr(x)]);
    }

    const beforePlug = chr(x);
    const out = plug(beforePlug, s.plugMap);
    path.push(["SPINA", out], ["LAMPADA", out]);

    return {out, path, stepped};
  }

  function cleanText(text) {
    return String(text || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .toUpperCase().replace(/[^A-Z]/g,"");
  }

  function createState() {
    return {
      rotors:["I","II","III"],
      reflector:"B",
      rings:[0,0,0],
      startPositions:[0,0,0],
      positions:[0,0,0],
      plugMap:{},
      plugPairs:[],
      input:"",
      output:"",
      lastPath:[],
      lastStepped:[false,false,false]
    };
  }

  function validRotorOrder(rotors) {
    return new Set(rotors).size === 3;
  }

  function settingsFromUI() {
    const rotors=[
      document.querySelector("#enRotorL").value,
      document.querySelector("#enRotorM").value,
      document.querySelector("#enRotorR").value
    ];
    const rings=[
      +document.querySelector("#enRingL").value,
      +document.querySelector("#enRingM").value,
      +document.querySelector("#enRingR").value
    ];
    const positions=[
      +document.querySelector("#enPosL").value,
      +document.querySelector("#enPosM").value,
      +document.querySelector("#enPosR").value
    ];
    const reflector=document.querySelector("#enReflector").value;
    const pb=parsePlugboard(document.querySelector("#enPlugboard").value);
    return {rotors,rings,positions,reflector,pb};
  }

  function applySettings(clearMessage=true) {
    const cfg=settingsFromUI();
    const status=document.querySelector("#enConfigStatus");
    if (!validRotorOrder(cfg.rotors)) {
      status.textContent="Scegli tre rotori diversi.";
      status.className="en-config-status error";
      return false;
    }
    if (cfg.pb.error) {
      status.textContent=cfg.pb.error;
      status.className="en-config-status error";
      return false;
    }
    state.rotors=cfg.rotors;
    state.rings=cfg.rings;
    state.startPositions=[...cfg.positions];
    state.positions=[...cfg.positions];
    state.reflector=cfg.reflector;
    state.plugMap=cfg.pb.map;
    state.plugPairs=cfg.pb.pairs;
    if(clearMessage) {
      state.input="";
      state.output="";
      state.lastPath=[];
    }
    status.textContent="Configurazione applicata.";
    status.className="en-config-status ok";
    renderAll();
    return true;
  }

  function resetMachine(clearMessage=true) {
    state.positions=[...state.startPositions];
    state.lastStepped=[false,false,false];
    state.lastPath=[];
    if(clearMessage){state.input="";state.output="";}
    renderAll();
  }

  function pressKey(ch, animate=true) {
    ch=String(ch).toUpperCase();
    if(!A.includes(ch)) return;
    const res=encryptLetter(ch,state);
    state.input+=ch;
    state.output+=res.out;
    state.lastPath=res.path;
    state.lastStepped=res.stepped;
    renderAll();
    if(animate) lightLamp(res.out);
  }

  function processFromStart(text) {
    state.positions=[...state.startPositions];
    state.input="";
    state.output="";
    state.lastPath=[];
    state.lastStepped=[false,false,false];
    for(const ch of cleanText(text)) pressKey(ch,false);
    renderAll();
    if(state.output) lightLamp(state.output.at(-1));
  }

  function group5(text) {
    return text.match(/.{1,5}/g)?.join(" ") || "";
  }

  function lightLamp(ch) {
    clearTimeout(lampTimer);
    document.querySelectorAll(".en-lamp").forEach(x=>x.classList.remove("on"));
    const el=document.querySelector('.en-lamp[data-letter="'+ch+'"]');
    if(el) el.classList.add("on");
    lampTimer=setTimeout(()=>el?.classList.remove("on"),420);
  }

  function renderRotors() {
    const current=state.positions;
    const starts=state.startPositions;
    ["L","M","R"].forEach((id,i)=>{
      const el=document.querySelector("#enWindow"+id);
      if(!el) return;
      el.textContent=chr(current[i]);
      el.classList.toggle("stepped",state.lastStepped[i]);
      const card=el.closest(".en-rotor-live");
      card.querySelector(".en-live-name").textContent=state.rotors[i];
      card.querySelector(".en-notch").textContent="tacca " + ROTORS[state.rotors[i]].notch;
      card.querySelector(".en-ring-live").textContent="Ring " + String(state.rings[i]+1).padStart(2,"0");
      card.querySelector(".en-start-live").textContent="inizio " + chr(starts[i]);
    });
  }

  function renderPlugboard() {
    const box=document.querySelector("#enPlugVisual");
    if(!box) return;
    box.innerHTML=state.plugPairs.length
      ? state.plugPairs.map(p=>'<span>'+p[0]+'↔'+p[1]+'</span>').join("")
      : '<em>nessun collegamento</em>';
  }

  function renderPath() {
    const box=document.querySelector("#enPath");
    if(!box) return;
    box.innerHTML=state.lastPath.length
      ? state.lastPath.map(([label,val],i)=>'<div class="en-path-node '+(i===0?"first":"")+'"><small>'+label+'</small><b>'+val+'</b></div>').join('<span class="en-path-arrow">›</span>')
      : '<span class="result-placeholder">Premi un tasto per vedere il percorso elettrico del segnale.</span>';
  }

  function renderAll() {
    renderRotors();
    renderPlugboard();
    renderPath();
    const input=document.querySelector("#enTapeIn");
    const output=document.querySelector("#enTapeOut");
    if(input) input.textContent=group5(state.input);
    if(output) output.textContent=group5(state.output);
    const count=document.querySelector("#enCount");
    if(count) count.textContent=state.output.length + " lettere";
  }

  function selectOptions(values,selected) {
    return values.map(v=>'<option value="'+v+'" '+(v===selected?"selected":"")+'>'+v+'</option>').join("");
  }

  function ringOptions(selected=0) {
    return [...A].map((ch,i)=>'<option value="'+i+'" '+(i===selected?"selected":"")+'>'+String(i+1).padStart(2,"0")+' ('+ch+')</option>').join("");
  }

  function posOptions(selected=0) {
    return [...A].map((ch,i)=>'<option value="'+i+'" '+(i===selected?"selected":"")+'>'+ch+'</option>').join("");
  }

  function helpHtml() {
    return `
      <h2>Macchina Enigma I</h2>
      <p>Questa simulazione usa i cablaggi storici dei rotori I–V e dei riflettori B/C della Enigma I.</p>
      <p>Prima di ogni pressione il meccanismo fa avanzare i rotori. Il rotore destro avanza sempre; le tacche provocano l’avanzamento degli altri rotori, compreso il caratteristico <strong>doppio passo</strong> del rotore centrale.</p>
      <p>Il segnale passa nel plugboard, attraversa i rotori da destra a sinistra, viene rinviato dal riflettore, torna attraverso i rotori e passa di nuovo nel plugboard.</p>
      <p>La macchina è <strong>reciproca</strong>: con la stessa configurazione, applicare Enigma al testo cifrato restituisce il testo originale. Inoltre nessuna lettera può essere cifrata in sé stessa.</p>
      <p><strong>Ringstellung</strong> cambia l’allineamento del cablaggio interno rispetto all’anello alfabetico. Le posizioni iniziali determinano invece le lettere visibili nelle finestrelle prima di cominciare.</p>
    `;
  }

  function keyboardHtml(cls) {
    return KEY_ROWS.map(row =>
      '<div class="en-key-row">'+[...row].map(ch=>'<button type="button" class="'+cls+'" data-letter="'+ch+'">'+ch+'</button>').join("")+'</div>'
    ).join("");
  }

  function renderModule() {
    moduleOpen=true;
    document.body.classList.add("module-open");
    state=createState();
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=`
      <div class="module-head">
        <div>
          <div class="eyebrow">Codice segreto · simulazione storica</div>
          <h2>Macchina Enigma</h2>
          <p>Configura la macchina, premi i tasti e osserva rotori, lampade e percorso del segnale.</p>
        </div>
        <button class="help-btn" id="enHelp">? COME FUNZIONA</button>
      </div>

      <section class="panel en-settings">
        <div class="en-settings-head">
          <div><h3>Impostazione macchina</h3><span class="badge secret">ENIGMA I · 3 ROTORI</span></div>
          <label>Riflettore
            <select id="enReflector"><option>B</option><option>C</option></select>
          </label>
        </div>

        <div class="en-setting-grid">
          <div class="en-setting-card">
            <strong>Rotore sinistro</strong>
            <label>Rotore<select id="enRotorL">${selectOptions(["I","II","III","IV","V"],"I")}</select></label>
            <label>Ringstellung<select id="enRingL">${ringOptions(0)}</select></label>
            <label>Posizione iniziale<select id="enPosL">${posOptions(0)}</select></label>
          </div>
          <div class="en-setting-card">
            <strong>Rotore centrale</strong>
            <label>Rotore<select id="enRotorM">${selectOptions(["I","II","III","IV","V"],"II")}</select></label>
            <label>Ringstellung<select id="enRingM">${ringOptions(0)}</select></label>
            <label>Posizione iniziale<select id="enPosM">${posOptions(0)}</select></label>
          </div>
          <div class="en-setting-card">
            <strong>Rotore destro</strong>
            <label>Rotore<select id="enRotorR">${selectOptions(["I","II","III","IV","V"],"III")}</select></label>
            <label>Ringstellung<select id="enRingR">${ringOptions(0)}</select></label>
            <label>Posizione iniziale<select id="enPosR">${posOptions(0)}</select></label>
          </div>
        </div>

        <label class="field en-plug-field">Plugboard · coppie separate da spazio, massimo 10
          <input id="enPlugboard" type="text" autocomplete="off" spellcheck="false" placeholder="Es. AV BS CG DL FU HZ IN KM OW RX">
        </label>
        <div class="en-plug-visual" id="enPlugVisual"><em>nessun collegamento</em></div>

        <div class="action-row">
          <button class="primary" id="enApply">APPLICA IMPOSTAZIONI</button>
          <button class="ghost" id="enReset">RESET POSIZIONI</button>
        </div>
        <div class="en-config-status" id="enConfigStatus">Configurazione standard: I–II–III · B · AAA · Ring 01-01-01.</div>
      </section>

      <section class="en-machine">
        <div class="en-rotor-bank">
          ${["L","M","R"].map((id,i)=>`
            <div class="en-rotor-live">
              <small>${i===0?"SINISTRO":i===1?"CENTRALE":"DESTRO"}</small>
              <b class="en-live-name">${["I","II","III"][i]}</b>
              <div class="en-window" id="enWindow${id}">A</div>
              <span class="en-notch">tacca ${["Q","E","V"][i]}</span>
              <span class="en-ring-live">Ring 01</span>
              <span class="en-start-live">inizio A</span>
            </div>`).join("")}
        </div>

        <div class="en-lampboard">
          <div class="en-machine-label">LAMPENFELD</div>
          ${keyboardHtml("en-lamp")}
        </div>

        <div class="en-keyboard">
          <div class="en-machine-label">TASTATUR</div>
          ${keyboardHtml("en-key")}
        </div>
      </section>

      <section class="panel en-tapes">
        <div class="en-tape-head"><h3>Messaggio</h3><span id="enCount">0 lettere</span></div>
        <div class="en-tape-row"><b>IN</b><div id="enTapeIn"></div></div>
        <div class="en-tape-row output"><b>OUT</b><div id="enTapeOut"></div></div>
        <div class="action-row">
          <button class="ghost" id="enClearMessage">CANCELLA MESSAGGIO</button>
          <button class="ghost" id="enCopyOutput">COPIA CIFRATO</button>
        </div>
      </section>

      <section class="panel en-batch">
        <h3>Trasforma un testo intero</h3>
        <p class="pig-instruction">Spazi, accenti, numeri e punteggiatura vengono rimossi: Enigma lavora sulle 26 lettere A–Z.</p>
        <label class="field">Testo
          <textarea id="enBatchText" placeholder="Scrivi o incolla il testo…"></textarea>
        </label>
        <div class="action-row">
          <button class="primary" id="enProcess">TRASFORMA DALL’INIZIO</button>
          <button class="ghost" id="enUseOutput">USA IL RISULTATO COME INGRESSO</button>
        </div>
      </section>

      <section class="panel en-path-panel">
        <h3>Percorso dell’ultimo segnale</h3>
        <div class="en-path" id="enPath">
          <span class="result-placeholder">Premi un tasto per vedere il percorso elettrico del segnale.</span>
        </div>
      </section>
    `;

    document.querySelectorAll(".en-key").forEach(btn=>{
      btn.onclick=()=>pressKey(btn.dataset.letter);
    });

    document.querySelector("#enApply").onclick=()=>applySettings(true);
    document.querySelector("#enReset").onclick=()=>resetMachine(false);
    document.querySelector("#enClearMessage").onclick=()=>resetMachine(true);
    document.querySelector("#enCopyOutput").onclick=async()=>{
      if(state.output) try{await navigator.clipboard.writeText(state.output);}catch{}
    };
    document.querySelector("#enProcess").onclick=()=>{
      if(applySettings(true)) processFromStart(document.querySelector("#enBatchText").value);
    };
    document.querySelector("#enUseOutput").onclick=()=>{
      const out=state.output;
      if(!out) return;
      document.querySelector("#enBatchText").value=out;
      if(applySettings(true)) processFromStart(out);
    };

    document.querySelector("#enHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content && dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    renderAll();
  }

  function selfTest() {
    const s=createState();
    let out="";
    for(const ch of "AAAAA") out+=encryptLetter(ch,s).out;
    return out === "BDZGO";
  }

  function ensureCard() {
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-enigma-card]")) return;
    const title=[...main.querySelectorAll(".section-title")].find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.enigmaCard="1";
    card.innerHTML=`
      <div class="card-icon enigma-card-icon">⚙</div>
      <h4>ENIGMA</h4>
      <p>Configura rotori, riflettore e plugboard e usa una macchina Enigma I simulata.</p>
      <span class="badge secret">CODICE SEGRETO</span>
    `;
    card.onclick=renderModule;
    const pig=cards.querySelector('[data-module="pigpen"]');
    if(pig) cards.insertBefore(card,pig); else cards.appendChild(card);
  }

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector(".en-machine")){
      moduleOpen=false;
      clearTimeout(lampTimer);
    }
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("keydown",ev=>{
    if(!moduleOpen || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
    const ch=ev.key.toUpperCase();
    if(A.includes(ch)){ev.preventDefault();pressKey(ch);}
  });

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();

  if(!selfTest()) console.error("CODEX! Enigma self-test failed");
})();
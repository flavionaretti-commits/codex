(() => {
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const main = $("#main");
  const toastEl = $("#toast");
  const state = {
    sound: localStorage.getItem("codex-sound") !== "off",
    dark: localStorage.getItem("codex-theme") === "dark",
    currentModule: null
  };

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const FONIC_MAP = {
    A:"O", O:"A", E:"I", I:"E", B:"P", P:"B", C:"G", G:"C",
    D:"T", T:"D", F:"V", V:"F", L:"R", R:"L", M:"N", N:"M",
    S:"Z", Z:"S", Q:"Q", U:"U", H:"H"
  };

  const MODULES = {
    caesar: {
      id:"caesar",
      title:"Cifrario di Cesare",
      short:"CESARE",
      category:"secret",
      icon:"↻",
      description:"Sposta ogni lettera dell’alfabeto di un numero fisso di posizioni.",
      help:`
        <h2>Cifrario di Cesare</h2>
        <p>Ogni lettera viene sostituita da quella che si trova un certo numero di posizioni più avanti nell’alfabeto.</p>
        <p>Con chiave <strong>3</strong>: A→D, B→E, C→F… Per decodificare si esegue lo spostamento opposto.</p>
        <p>Spazi, numeri e punteggiatura non vengono modificati.</p>
      `,
      render: renderCaesar
    },
    atbash: {
      id:"atbash",
      title:"Cifrario Atbash",
      short:"ATBASH",
      category:"secret",
      icon:"⇄",
      description:"Sostituisce A con Z, B con Y, C con X e così via.",
      help:`
        <h2>Atbash</h2>
        <p>È un cifrario a sostituzione in cui l’alfabeto viene semplicemente rovesciato.</p>
        <p>A↔Z, B↔Y, C↔X… È <strong>simmetrico</strong>: la stessa operazione codifica e decodifica.</p>
      `,
      render: renderAtbash
    },
    fonic: {
      id:"fonic",
      title:"Somiglianza fonica",
      short:"SOMIGLIANZA FONICA",
      category:"secret",
      icon:"≈",
      description:"Scambia coppie di lettere dal suono o articolazione simile.",
      help:`
        <h2>Codice di somiglianza fonica</h2>
        <p>Le lettere vengono scambiate a coppie: A↔O, E↔I, B↔P, C↔G, D↔T, F↔V, L↔R, M↔N, S↔Z.</p>
        <p>Q, U e H non cambiano. Il codice è <strong>simmetrico</strong>: applicandolo una seconda volta si recupera il testo originale.</p>
        <p>Esempio: <strong>FLAVIO NARETTI → VROFEA MOLIDDE</strong>.</p>
      `,
      render: renderFonic
    },
    vigenere: {
      id:"vigenere",
      title:"Cifrario di Vigenère",
      short:"VIGENÈRE",
      category:"secret",
      icon:"🔑",
      description:"Usa una parola chiave per cambiare lo spostamento lettera dopo lettera.",
      help:`
        <h2>Cifrario di Vigenère</h2>
        <p>Vigenère può essere visto come una successione di cifrari di Cesare: ogni lettera della <strong>chiave</strong> indica uno spostamento diverso.</p>
        <p>Con la convenzione A=0, B=1, C=2… la chiave viene ripetuta lungo il messaggio. Per codificare si sommano gli spostamenti; per decodificare si sottraggono.</p>
        <p>CODEX! fa avanzare la chiave solo sulle lettere: spazi, numeri e punteggiatura restano invariati.</p>
      `,
      render: renderVigenere
    },
    pigpen: {
      id:"pigpen",
      title:"Cifrario Pigpen",
      short:"PIGPEN",
      category:"secret",
      icon:"⌗",
      description:"Sostituisce le lettere con simboli ricavati da griglie e croci.",
      help:`
        <h2>Cifrario Pigpen</h2>
        <p>Pigpen è un cifrario a sostituzione: ogni lettera dell’alfabeto viene rappresentata da una parte di una griglia o di una croce.</p>
        <p>A–I usano la prima griglia; J–R ripetono le stesse forme con un <strong>punto</strong>. S–V usano quattro forme a croce; W–Z le stesse forme con un punto.</p>
        <p>Non esiste una sola convenzione storica universale per l’ordine dei simboli. CODEX! usa una disposizione coerente e molto diffusa e mostra sempre il proprio alfabeto di riferimento.</p>
      `,
      render: renderPigpen
    },
    morse: {
      id:"morse",
      title:"Codice Morse",
      short:"MORSE",
      category:"code",
      icon:"·–",
      description:"Rappresenta lettere e numeri con sequenze di punti e linee.",
      help:`
        <h2>Codice Morse</h2>
        <p>Il Morse rappresenta caratteri mediante segnali brevi (<strong>punti</strong>) e lunghi (<strong>linee</strong>). Non è un cifrario segreto: è un sistema di codifica pensato per trasmettere informazioni.</p>
        <p>Nella temporizzazione standard un punto dura 1 unità, una linea 3; la pausa tra i segni della stessa lettera dura 1 unità, tra lettere 3 e tra parole 7.</p>
        <p>CODEX! usa il Morse internazionale per A–Z, cifre 0–9 e alcuni segni di punteggiatura comuni. Nella scrittura usa <strong>/</strong> come separatore tra parole.</p>
      `,
      render: renderMorse
    },
    ascii: {
      id:"ascii",
      title:"Codice ASCII",
      short:"ASCII",
      category:"code",
      icon:"01",
      description:"Rappresenta i caratteri con numeri decimali, binari ed esadecimali.",
      help:`
        <h2>ASCII</h2>
        <p>ASCII assegna un numero a ciascun carattere. Per esempio la lettera A corrisponde a 65 in decimale, 01000001 in binario e 41 in esadecimale.</p>
        <p>Questa versione mostra i caratteri ASCII standard e permette anche di ricostruire il testo partendo da una sequenza numerica.</p>
      `,
      render: renderAscii
    }
  };

  function applyTheme() {
    document.body.classList.toggle("dark", state.dark);
    $("#themeBtn").textContent = state.dark ? "☀" : "☾";
    localStorage.setItem("codex-theme", state.dark ? "dark" : "light");
  }

  function syncSoundIcon() {
    $("#soundBtn").textContent = state.sound ? "🔊" : "🔇";
    localStorage.setItem("codex-sound", state.sound ? "on" : "off");
  }

  let audioCtx;
  function beep(freq=680, duration=.045, volume=.15) {
    if (!state.sound) return;
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 1500);
  }

  function preserveCase(original, replacement) {
    return original === original.toLowerCase() ? replacement.toLowerCase() : replacement;
  }

  function transformLetters(text, fn) {
    return [...text].map(ch => {
      const up = ch.toUpperCase();
      if (!ALPHABET.includes(up)) return ch;
      return preserveCase(ch, fn(up));
    }).join("");
  }

  function caesar(text, shift) {
    const s = ((shift % 26) + 26) % 26;
    return transformLetters(text, ch => ALPHABET[(ALPHABET.indexOf(ch)+s)%26]);
  }

  function atbash(text) {
    return transformLetters(text, ch => ALPHABET[25 - ALPHABET.indexOf(ch)]);
  }

  function fonic(text) {
    return [...text].map(ch => {
      const up = ch.toUpperCase();
      if (!FONIC_MAP[up]) return ch;
      return preserveCase(ch, FONIC_MAP[up]);
    }).join("");
  }

  function renderHome() {
    state.currentModule = null;
    document.body.classList.remove("module-open");
    main.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Laboratorio interattivo</div>
        <h2>Decifra. Codifica.<br>Capisci il meccanismo.</h2>
        <p>CODEX! raccoglie cifrari segreti e sistemi di codifica. Questa prima versione mette alla prova l’architettura modulare con quattro strumenti diversi.</p>
      </section>

      <div class="section-title">
        <h3>🔐 Codici segreti</h3><span>cifrari e sostituzioni</span>
      </div>
      <section class="cards">
        ${moduleCard(MODULES.caesar)}
        ${moduleCard(MODULES.atbash)}
        ${moduleCard(MODULES.fonic)}
        ${moduleCard(MODULES.vigenere)}
        ${moduleCard(MODULES.pigpen)}
      </section>

      <div class="section-title">
        <h3>🔤 Codici e rappresentazioni</h3><span>informazione, numeri e simboli</span>
      </div>
      <section class="cards">
        ${moduleCard(MODULES.morse)}
        ${moduleCard(MODULES.ascii)}
      </section>
    `;
    $$(".card[data-module]").forEach(btn => btn.addEventListener("click", () => openModule(btn.dataset.module)));
  }

  function moduleCard(m) {
    return `
      <button class="card" data-module="${m.id}">
        <div class="card-icon">${m.icon}</div>
        <h4>${m.short}</h4>
        <p>${m.description}</p>
        <span class="badge ${m.category}">${m.category === "secret" ? "CODICE SEGRETO" : "CODICE"}</span>
      </button>
    `;
  }

  function openModule(id) {
    const m = MODULES[id];
    if (!m) return;
    state.currentModule = id;
    document.body.classList.add("module-open");
    m.render();
    window.scrollTo({top:0, behavior:"smooth"});
    beep(720);
  }

  function moduleHeader(m) {
    return `
      <div class="module-head">
        <div>
          <div class="eyebrow">${m.category === "secret" ? "Codice segreto" : "Codice e rappresentazione"}</div>
          <h2>${m.title}</h2>
          <p>${m.description}</p>
        </div>
        <button class="help-btn" id="moduleHelp">? COME FUNZIONA</button>
      </div>
    `;
  }

  function wireHelp(m) {
    $("#moduleHelp").addEventListener("click", () => {
      $("#helpContent").innerHTML = m.help;
      $("#helpDialog").showModal();
      beep(610);
    });
  }

  function renderCaesar() {
    const m = MODULES.caesar;
    main.innerHTML = moduleHeader(m) + `
      <div class="workspace">
        <section class="panel">
          <h3>Messaggio</h3>
          <label class="field">Testo
            <textarea id="inputText" placeholder="Scrivi qui il messaggio…">ATTACCO ALL'ALBA</textarea>
          </label>
          <label class="field">Chiave di spostamento
            <div class="range-row">
              <input type="range" id="shift" min="1" max="25" value="3">
              <div class="range-value" id="shiftValue">3</div>
            </div>
          </label>
          <div class="action-row">
            <button class="primary" id="encodeBtn">CODIFICA →</button>
            <button class="secondary" id="decodeBtn">← DECODIFICA</button>
            <button class="ghost" id="swapBtn">⇄ SCAMBIA</button>
          </div>
          <div class="alpha-rows">
            <div class="alpha-row" id="alphaTop"></div>
            <div class="alpha-row" id="alphaBottom"></div>
          </div>
        </section>
        <section class="panel">
          <h3>Risultato</h3>
          <div class="result-box" id="result"></div>
          <div class="action-row">
            <button class="ghost" id="copyBtn">COPIA</button>
            <button class="ghost" id="clearBtn">PULISCI</button>
          </div>
          <div class="note">Con chiave 3, A diventa D. Per decodificare, CODEX! compie lo spostamento opposto.</div>
        </section>
      </div>
    `;
    wireHelp(m);
    const input = $("#inputText"), shift = $("#shift"), result = $("#result");
    let lastMode = "encode";

    const drawAlphabet = () => {
      const s = +shift.value;
      $("#alphaTop").innerHTML = [...ALPHABET].map(c => `<div class="alpha-cell">${c}</div>`).join("");
      $("#alphaBottom").innerHTML = [...ALPHABET].map((_,i) => `<div class="alpha-cell">${ALPHABET[(i+s)%26]}</div>`).join("");
    };
    const update = () => {
      $("#shiftValue").textContent = shift.value;
      result.textContent = lastMode === "encode" ? caesar(input.value,+shift.value) : caesar(input.value,-shift.value);
      drawAlphabet();
    };
    $("#encodeBtn").onclick = () => {lastMode="encode";update();beep()};
    $("#decodeBtn").onclick = () => {lastMode="decode";update();beep(560)};
    $("#swapBtn").onclick = () => {input.value=result.textContent; lastMode = lastMode === "encode" ? "decode" : "encode"; update(); beep(820)};
    $("#copyBtn").onclick = () => copyText(result.textContent);
    $("#clearBtn").onclick = () => {input.value="";result.textContent="";beep(430)};
    shift.oninput = update;
    input.oninput = update;
    update();
  }

  function renderAtbash() {
    const m = MODULES.atbash;
    main.innerHTML = moduleHeader(m) + `
      <div class="workspace">
        <section class="panel">
          <h3>Messaggio</h3>
          <label class="field">Testo
            <textarea id="inputText" placeholder="Scrivi qui il messaggio…">CODICE SEGRETO</textarea>
          </label>
          <div class="action-row">
            <button class="primary" id="transformBtn">TRASFORMA ⇄</button>
            <button class="ghost" id="swapBtn">USA IL RISULTATO</button>
          </div>
          <div class="alpha-rows">
            <div class="alpha-row">${[...ALPHABET].map(c=>`<div class="alpha-cell">${c}</div>`).join("")}</div>
            <div class="alpha-row">${[...ALPHABET].reverse().map(c=>`<div class="alpha-cell">${c}</div>`).join("")}</div>
          </div>
          <div class="note">Atbash è simmetrico: la stessa trasformazione serve sia per codificare sia per decodificare.</div>
        </section>
        <section class="panel">
          <h3>Risultato</h3>
          <div class="result-box" id="result"></div>
          <div class="action-row">
            <button class="ghost" id="copyBtn">COPIA</button>
            <button class="ghost" id="clearBtn">PULISCI</button>
          </div>
        </section>
      </div>
    `;
    wireHelp(m);
    const input=$("#inputText"), result=$("#result");
    const update=()=>result.textContent=atbash(input.value);
    $("#transformBtn").onclick=()=>{update();beep()};
    $("#swapBtn").onclick=()=>{input.value=result.textContent;update();beep(820)};
    $("#copyBtn").onclick=()=>copyText(result.textContent);
    $("#clearBtn").onclick=()=>{input.value="";result.textContent="";beep(430)};
    input.oninput=update;
    update();
  }

  function renderFonic() {
    const m = MODULES.fonic;
    const pairs = [["A","O"],["E","I"],["B","P"],["C","G"],["D","T"],["F","V"],["L","R"],["M","N"],["S","Z"]];
    main.innerHTML = moduleHeader(m) + `
      <div class="workspace">
        <section class="panel">
          <h3>Messaggio</h3>
          <label class="field">Testo
            <textarea id="inputText" placeholder="Scrivi qui il messaggio…">Flavio Naretti</textarea>
          </label>
          <div class="action-row">
            <button class="primary" id="transformBtn">CODIFICA / DECODIFICA ⇄</button>
            <button class="ghost" id="swapBtn">USA IL RISULTATO</button>
          </div>
          <div class="mapping-grid">
            ${pairs.map(([a,b])=>`<div class="map-pair">${a} ↔ ${b}</div>`).join("")}
            <div class="map-pair fixed">Q → Q</div>
            <div class="map-pair fixed">U → U</div>
            <div class="map-pair fixed">H → H</div>
          </div>
          <div class="note">Anche questo codice è simmetrico: applicalo due volte e tornerai al messaggio originale.</div>
        </section>
        <section class="panel">
          <h3>Risultato</h3>
          <div class="result-box" id="result"></div>
          <div class="action-row">
            <button class="ghost" id="copyBtn">COPIA</button>
            <button class="ghost" id="clearBtn">PULISCI</button>
          </div>
        </section>
      </div>
    `;
    wireHelp(m);
    const input=$("#inputText"), result=$("#result");
    const update=()=>result.textContent=fonic(input.value);
    $("#transformBtn").onclick=()=>{update();beep()};
    $("#swapBtn").onclick=()=>{input.value=result.textContent;update();beep(820)};
    $("#copyBtn").onclick=()=>copyText(result.textContent);
    $("#clearBtn").onclick=()=>{input.value="";result.textContent="";beep(430)};
    input.oninput=update;
    update();
  }

  function cleanVigenereKey(key) {
    return [...key.toUpperCase()].filter(ch => ALPHABET.includes(ch)).join("");
  }

  function vigenereTransform(text, key, decode=false) {
    const cleanKey = cleanVigenereKey(key);
    if (!cleanKey) return {text:"", rows:[], key:""};
    let ki = 0;
    const rows = [];
    const out = [...text].map(ch => {
      const up = ch.toUpperCase();
      if (!ALPHABET.includes(up)) return ch;
      const kch = cleanKey[ki % cleanKey.length];
      const shift = ALPHABET.indexOf(kch);
      const src = ALPHABET.indexOf(up);
      const dest = (src + (decode ? -shift : shift) + 26) % 26;
      const res = preserveCase(ch, ALPHABET[dest]);
      rows.push({
        source: up,
        key: kch,
        shift,
        result: ALPHABET[dest]
      });
      ki++;
      return res;
    }).join("");
    return {text:out, rows, key:cleanKey};
  }

  function renderVigenere() {
    const m = MODULES.vigenere;
    main.innerHTML = moduleHeader(m) + `
      <div class="workspace">
        <section class="panel">
          <h3>Messaggio e chiave</h3>
          <label class="field">Testo
            <textarea id="vigInput" placeholder="Scrivi qui il messaggio…">ATTACCO ALL'ALBA</textarea>
          </label>
          <label class="field">Parola chiave
            <input id="vigKey" type="text" value="GALILEO" autocomplete="off" spellcheck="false" placeholder="Es. GALILEO">
          </label>
          <div class="action-row">
            <button class="primary" id="vigEncode">CODIFICA →</button>
            <button class="secondary" id="vigDecode">← DECODIFICA</button>
            <button class="ghost" id="vigSwap">⇄ SCAMBIA</button>
          </div>
          <div class="note">La chiave viene ripetuta automaticamente. A=0, B=1, … Z=25.</div>
        </section>

        <section class="panel">
          <h3>Risultato</h3>
          <div class="result-box" id="vigResult"></div>
          <div class="action-row">
            <button class="ghost" id="vigCopy">COPIA</button>
            <button class="ghost" id="vigClear">PULISCI</button>
          </div>
        </section>
      </div>

      <section class="panel vig-explain">
        <div class="vig-explain-head">
          <div>
            <h3>Come lavora la chiave</h3>
            <p id="vigKeyStatus" class="pig-instruction"></p>
          </div>
          <button class="ghost" id="vigToggle">NASCONDI DETTAGLIO</button>
        </div>
        <div id="vigDetail" class="vig-detail"></div>
      </section>
    `;
    wireHelp(m);

    const input=$("#vigInput"), key=$("#vigKey"), result=$("#vigResult");
    let mode="encode";

    const update = () => {
      const cleanKey = cleanVigenereKey(key.value);
      if (!cleanKey) {
        result.innerHTML = '<span class="result-placeholder">Inserisci almeno una lettera nella chiave.</span>';
        $("#vigKeyStatus").textContent = "La chiave deve contenere almeno una lettera A–Z.";
        $("#vigDetail").innerHTML = "";
        return;
      }
      const data = vigenereTransform(input.value, cleanKey, mode==="decode");
      result.textContent = data.text;
      $("#vigKeyStatus").textContent = `Chiave effettiva: ${data.key} · modalità: ${mode==="decode" ? "decodifica" : "codifica"}`;
      $("#vigDetail").innerHTML = data.rows.length ? `
        <div class="vig-row vig-label"><span>TESTO</span>${data.rows.map(r=>`<b>${r.source}</b>`).join("")}</div>
        <div class="vig-row"><span>CHIAVE</span>${data.rows.map(r=>`<b>${r.key}</b>`).join("")}</div>
        <div class="vig-row vig-shift"><span>SPOST.</span>${data.rows.map(r=>`<b>${r.shift}</b>`).join("")}</div>
        <div class="vig-row vig-result-row"><span>RISULT.</span>${data.rows.map(r=>`<b>${r.result}</b>`).join("")}</div>
      ` : '<div class="empty">Scrivi un messaggio per vedere il procedimento.</div>';
    };

    $("#vigEncode").onclick=()=>{mode="encode";update();beep(720)};
    $("#vigDecode").onclick=()=>{mode="decode";update();beep(560)};
    $("#vigSwap").onclick=()=>{
      if (!cleanVigenereKey(key.value)) return;
      input.value=result.textContent;
      mode=mode==="encode"?"decode":"encode";
      update();beep(820);
    };
    $("#vigCopy").onclick=()=>copyText(result.textContent);
    $("#vigClear").onclick=()=>{input.value="";result.textContent="";update();beep(430)};
    $("#vigToggle").onclick=()=>{
      const detail=$("#vigDetail");
      detail.hidden=!detail.hidden;
      $("#vigToggle").textContent=detail.hidden?"MOSTRA DETTAGLIO":"NASCONDI DETTAGLIO";
      beep(620);
    };
    input.oninput=update;
    key.oninput=update;
    update();
  }

  function pigpenMeta(letter) {
    const up = letter.toUpperCase();
    const idx = ALPHABET.indexOf(up);
    if (idx < 0) return null;
    if (idx < 18) {
      const base = idx % 9;
      return {kind:"grid", pos:base, dotted:idx >= 9};
    }
    return {kind:"x", pos:(idx - 18) % 4, dotted:idx >= 22};
  }

  function pigpenSvg(letter, cls="pig-glyph") {
    const meta = pigpenMeta(letter);
    if (!meta) return escapeHtml(letter);
    const stroke = "currentColor";
    let lines = "";
    if (meta.kind === "grid") {
      const row = Math.floor(meta.pos / 3);
      const col = meta.pos % 3;
      if (row > 0) lines += '<path d="M5 6 H31"/>';
      if (row < 2) lines += '<path d="M5 30 H31"/>';
      if (col > 0) lines += '<path d="M6 5 V31"/>';
      if (col < 2) lines += '<path d="M30 5 V31"/>';
    } else {
      const shapes = [
        '<path d="M5 6 L18 20 L31 6"/>',
        '<path d="M30 5 L16 18 L30 31"/>',
        '<path d="M5 30 L18 16 L31 30"/>',
        '<path d="M6 5 L20 18 L6 31"/>'
      ];
      lines = shapes[meta.pos];
    }
    const dot = meta.dotted ? '<circle cx="18" cy="18" r="2.7" fill="currentColor" stroke="none"/>' : "";
    return `<svg class="${cls}" viewBox="0 0 36 36" aria-hidden="true"><g fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${lines}</g>${dot}</svg>`;
  }

  function renderPigpen() {
    const m = MODULES.pigpen;
    main.innerHTML = moduleHeader(m) + `
      <div class="workspace pigpen-workspace">
        <section class="panel">
          <h3>Testo → Pigpen</h3>
          <label class="field">Messaggio
            <textarea id="pigInput" placeholder="Scrivi qui il messaggio…">MESSAGGIO SEGRETO</textarea>
          </label>
          <div class="pig-result" id="pigEncoded"></div>
          <div class="action-row">
            <button class="ghost" id="pigClearEncode">PULISCI</button>
            <button class="ghost" id="pigAlphabetBtn">MOSTRA ALFABETO</button>
          </div>
          <div class="note">Spazi e punteggiatura restano visibili. Le lettere vengono sostituite dai simboli Pigpen.</div>
        </section>

        <section class="panel">
          <h3>Pigpen → Testo</h3>
          <p class="pig-instruction">Riproduci il messaggio cifrato toccando i simboli corrispondenti. I tasti non mostrano le lettere, così puoi davvero decifrare.</p>
          <div class="pig-keyboard" id="pigKeyboard"></div>
          <div class="action-row">
            <button class="ghost" id="pigSpace">SPAZIO</button>
            <button class="ghost" id="pigBack">⌫</button>
            <button class="ghost" id="pigClearDecode">PULISCI</button>
          </div>
          <h3 style="margin-top:18px">Testo decifrato</h3>
          <div class="result-box" id="pigDecoded"></div>
          <div class="action-row">
            <button class="ghost" id="pigCopy">COPIA</button>
          </div>
        </section>
      </div>

      <section class="panel pig-alphabet-panel" id="pigAlphabetPanel" hidden>
        <h3>Alfabeto Pigpen usato da CODEX!</h3>
        <div class="pig-alphabet">
          ${[...ALPHABET].map(ch => `<div class="pig-alpha-item"><span>${ch}</span>${pigpenSvg(ch,"pig-glyph large")}</div>`).join("")}
        </div>
      </section>
    `;
    wireHelp(m);

    const input = $("#pigInput");
    const encoded = $("#pigEncoded");
    const decoded = $("#pigDecoded");
    let decodedText = "";

    const updateEncoded = () => {
      const html = [...input.value].map(ch => {
        if (ALPHABET.includes(ch.toUpperCase())) {
          return `<span class="pig-token" title="${escapeHtml(ch.toUpperCase())}">${pigpenSvg(ch)}</span>`;
        }
        if (ch === " ") return '<span class="pig-space" aria-label="spazio"></span>';
        if (ch === "\n") return '<span class="pig-break"></span>';
        return `<span class="pig-punct">${escapeHtml(ch)}</span>`;
      }).join("");
      encoded.innerHTML = html || '<span class="result-placeholder">Scrivi qualcosa per vedere il messaggio cifrato.</span>';
    };

    const updateDecoded = () => {
      decoded.textContent = decodedText;
    };

    $("#pigKeyboard").innerHTML = [...ALPHABET].map(ch =>
      `<button class="pig-key" data-letter="${ch}" aria-label="Simbolo Pigpen">${pigpenSvg(ch,"pig-glyph key")}</button>`
    ).join("");

    $(".pig-key", $("#pigKeyboard")).forEach(btn => {
      btn.onclick = () => {
        decodedText += btn.dataset.letter;
        updateDecoded();
        beep(690);
      };
    });

    input.oninput = updateEncoded;
    $("#pigClearEncode").onclick = () => {input.value="";updateEncoded();beep(430)};
    $("#pigAlphabetBtn").onclick = () => {
      const panel = $("#pigAlphabetPanel");
      panel.hidden = !panel.hidden;
      $("#pigAlphabetBtn").textContent = panel.hidden ? "MOSTRA ALFABETO" : "NASCONDI ALFABETO";
      if (!panel.hidden) panel.scrollIntoView({behavior:"smooth",block:"nearest"});
      beep(620);
    };
    $("#pigSpace").onclick = () => {decodedText += " ";updateDecoded();beep(560)};
    $("#pigBack").onclick = () => {decodedText = decodedText.slice(0,-1);updateDecoded();beep(480)};
    $("#pigClearDecode").onclick = () => {decodedText="";updateDecoded();beep(430)};
    $("#pigCopy").onclick = () => copyText(decodedText);

    updateEncoded();
    updateDecoded();
  }

  const MORSE_MAP = {
    A:".-", B:"-...", C:"-.-.", D:"-..", E:".", F:"..-.", G:"--.", H:"....",
    I:"..", J:".---", K:"-.-", L:".-..", M:"--", N:"-.", O:"---", P:".--.",
    Q:"--.-", R:".-.", S:"...", T:"-", U:"..-", V:"...-", W:".--", X:"-..-",
    Y:"-.--", Z:"--..",
    "0":"-----", "1":".----", "2":"..---", "3":"...--", "4":"....-", "5":".....",
    "6":"-....", "7":"--...", "8":"---..", "9":"----.",
    ".":".-.-.-", ",":"--..--", "?":"..--..", "'":".----.", "!":"-.-.--",
    "/":"-..-.", "(":"-.--.", ")":"-.--.-", "&":".-...", ":":"---...",
    ";":"-.-.-.", "=":"-...-", "+":".-.-.", "-":"-....-", "_":"..--.-",
    '"':".-..-.", "$":"...-..-", "@":".--.-."
  };
  const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k,v]) => [v,k]));
  let morseAudioSequence = 0;

  function normalizeMorseText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  }

  function encodeMorse(text) {
    const normalized = normalizeMorseText(text);
    return normalized.trim().split(/\s+/).filter(Boolean).map(word =>
      [...word].map(ch => MORSE_MAP[ch] || "�").join(" ")
    ).join(" / ");
  }

  function decodeMorse(code) {
    const trimmed = code.trim();
    if (!trimmed) return "";
    return trimmed.split(/\s+\/\s+/).map(word =>
      word.trim().split(/\s+/).filter(Boolean).map(token => MORSE_REVERSE[token] || "�").join("")
    ).join(" ");
  }

  async function playMorseSequence(code, indicator, button) {
    const myId = ++morseAudioSequence;
    const unit = 115;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const words = code.trim().split(/\s+\/\s+/).filter(Boolean);
    if (!words.length) return;

    button.disabled = true;
    button.textContent = "■ FERMA";
    button.onclick = () => {
      morseAudioSequence++;
      button.disabled = false;
      button.textContent = "▶ ASCOLTA";
      if (indicator) indicator.classList.remove("on","dash");
    };

    try {
      for (let wi=0; wi<words.length; wi++) {
        const letters = words[wi].trim().split(/\s+/).filter(Boolean);
        for (let li=0; li<letters.length; li++) {
          const token = letters[li];
          if (!/^[.-]+$/.test(token)) continue;
          for (let si=0; si<token.length; si++) {
            if (myId !== morseAudioSequence) return;
            const symbol = token[si];
            const dur = symbol === "." ? unit : unit*3;
            if (indicator) {
              indicator.textContent = symbol;
              indicator.classList.add("on");
              indicator.classList.toggle("dash", symbol === "-");
            }
            beep(690, dur/1000, .24);
            await sleep(dur);
            if (indicator) indicator.classList.remove("on","dash");
            if (si < token.length-1) await sleep(unit);
          }
          if (li < letters.length-1) await sleep(unit*3);
        }
        if (wi < words.length-1) await sleep(unit*7);
      }
    } finally {
      if (myId === morseAudioSequence) {
        button.disabled = false;
        button.textContent = "▶ ASCOLTA";
        button.onclick = () => startPlayback();
        if (indicator) {
          indicator.textContent = "·–";
          indicator.classList.remove("on","dash");
        }
      }
    }

    function startPlayback() {
      playMorseSequence(code, indicator, button);
    }
  }

  function renderMorse() {
    const m = MODULES.morse;
    morseAudioSequence++;
    main.innerHTML = moduleHeader(m) + `
      <div class="workspace">
        <section class="panel">
          <h3>Testo → Morse</h3>
          <label class="field">Messaggio
            <textarea id="morseText" placeholder="Scrivi qui il messaggio…">SOS CODEX</textarea>
          </label>
          <h3>Codice</h3>
          <div class="result-box morse-output" id="morseEncoded"></div>
          <div class="morse-audio-row">
            <div class="morse-lamp" id="morseLamp" aria-hidden="true">·–</div>
            <button class="primary" id="morsePlay">▶ ASCOLTA</button>
            <label class="morse-speed">Velocità
              <select id="morseSpeed">
                <option value="160">Lenta</option>
                <option value="115" selected>Normale</option>
                <option value="80">Veloce</option>
              </select>
            </label>
          </div>
          <div class="action-row">
            <button class="ghost" id="morseCopy">COPIA</button>
            <button class="ghost" id="morseClearText">PULISCI</button>
          </div>
          <div class="note">Le parole sono separate da <strong>/</strong>. Le lettere accentate vengono ricondotte alla lettera base: È → E, à → A.</div>
        </section>

        <section class="panel">
          <h3>Morse → Testo</h3>
          <label class="field">Codice Morse
            <textarea id="morseCode" class="morse-entry" spellcheck="false" placeholder="... --- ... / -.-. --- -.. . -..-">... --- ... / -.-. --- -.. . -..-</textarea>
          </label>
          <div class="morse-entry-buttons">
            <button class="ghost morse-symbol-btn" data-symbol=".">· PUNTO</button>
            <button class="ghost morse-symbol-btn" data-symbol="-">– LINEA</button>
            <button class="ghost morse-symbol-btn" data-symbol=" ">PAUSA LETTERA</button>
            <button class="ghost morse-symbol-btn" data-symbol=" / ">PAUSA PAROLA</button>
            <button class="ghost" id="morseBack">⌫</button>
          </div>
          <h3 style="margin-top:18px">Testo decodificato</h3>
          <div class="result-box" id="morseDecoded"></div>
          <div class="action-row">
            <button class="ghost" id="morseCopyDecoded">COPIA</button>
            <button class="ghost" id="morseClearCode">PULISCI</button>
          </div>
        </section>
      </div>

      <section class="panel morse-reference">
        <div class="vig-explain-head">
          <div>
            <h3>Alfabeto Morse internazionale</h3>
            <p class="pig-instruction">Tocca una tessera per inserirne il codice nel campo di decodifica.</p>
          </div>
          <button class="ghost" id="morseToggleRef">NASCONDI TABELLA</button>
        </div>
        <div class="morse-grid" id="morseGrid">
          ${Object.entries(MORSE_MAP).filter(([ch]) => /^[A-Z0-9]$/.test(ch)).map(([ch,code]) =>
            `<button class="morse-ref-item" data-code="${code}"><strong>${ch}</strong><span>${code}</span></button>`
          ).join("")}
        </div>
      </section>
    `;
    wireHelp(m);

    const text=$("#morseText"), code=$("#morseCode");
    const encoded=$("#morseEncoded"), decoded=$("#morseDecoded");
    const playBtn=$("#morsePlay"), lamp=$("#morseLamp");

    const updateEncode=()=>{
      const out=encodeMorse(text.value);
      encoded.textContent=out;
      if (!out) encoded.innerHTML='<span class="result-placeholder">Scrivi un messaggio per convertirlo in Morse.</span>';
    };
    const updateDecode=()=>{
      const out=decodeMorse(code.value);
      decoded.textContent=out;
    };

    const startPlay=async()=>{
      const current=encodeMorse(text.value);
      if (!current) return;
      const unit=+$("#morseSpeed").value;
      const myId=++morseAudioSequence;
      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      const words=current.split(/\s+\/\s+/).filter(Boolean);
      playBtn.textContent="■ FERMA";
      playBtn.classList.add("playing");
      const oldClick=playBtn.onclick;
      playBtn.onclick=()=>{
        morseAudioSequence++;
        lamp.textContent="·–";
        lamp.classList.remove("on","dash");
        playBtn.textContent="▶ ASCOLTA";
        playBtn.classList.remove("playing");
        playBtn.onclick=oldClick;
      };
      for(let wi=0;wi<words.length;wi++){
        const letters=words[wi].trim().split(/\s+/).filter(Boolean);
        for(let li=0;li<letters.length;li++){
          const token=letters[li];
          if(!/^[.-]+$/.test(token)) continue;
          for(let si=0;si<token.length;si++){
            if(myId!==morseAudioSequence) return;
            const sym=token[si], dur=sym==="."?unit:unit*3;
            lamp.textContent=sym==="."?"·":"–";
            lamp.classList.add("on");
            lamp.classList.toggle("dash",sym==="-");
            beep(690,dur/1000,.24);
            await sleep(dur);
            lamp.classList.remove("on","dash");
            if(si<token.length-1) await sleep(unit);
          }
          if(li<letters.length-1) await sleep(unit*3);
        }
        if(wi<words.length-1) await sleep(unit*7);
      }
      if(myId===morseAudioSequence){
        lamp.textContent="·–";
        playBtn.textContent="▶ ASCOLTA";
        playBtn.classList.remove("playing");
        playBtn.onclick=oldClick;
      }
    };

    playBtn.onclick=startPlay;
    text.oninput=updateEncode;
    code.oninput=updateDecode;
    $("#morseCopy").onclick=()=>copyText(encodeMorse(text.value));
    $("#morseCopyDecoded").onclick=()=>copyText(decoded.textContent);
    $("#morseClearText").onclick=()=>{text.value="";updateEncode();morseAudioSequence++;beep(430)};
    $("#morseClearCode").onclick=()=>{code.value="";updateDecode();beep(430)};
    $("#morseBack").onclick=()=>{code.value=code.value.slice(0,-1);updateDecode();code.focus();beep(470)};
    $(".morse-symbol-btn").forEach(btn=>btn.onclick=()=>{
      code.value+=btn.dataset.symbol;
      updateDecode();code.focus();beep(btn.dataset.symbol==="-"?570:720);
    });
    $(".morse-ref-item").forEach(btn=>btn.onclick=()=>{
      const sep=code.value && !/\s$/.test(code.value)?" ":"";
      code.value+=sep+btn.dataset.code+" ";
      updateDecode();code.focus();beep(660);
    });
    $("#morseToggleRef").onclick=()=>{
      const grid=$("#morseGrid");
      grid.hidden=!grid.hidden;
      $("#morseToggleRef").textContent=grid.hidden?"MOSTRA TABELLA":"NASCONDI TABELLA";
      beep(620);
    };

    updateEncode();
    updateDecode();
  }

  function renderAscii() {
    const m = MODULES.ascii;
    main.innerHTML = moduleHeader(m) + `
      <div class="workspace">
        <section class="panel">
          <h3>Testo → ASCII</h3>
          <label class="field">Testo
            <textarea id="asciiText" placeholder="Scrivi testo ASCII…">CODEX!</textarea>
          </label>
          <div class="segmented" id="viewMode">
            <button data-view="all" class="active">TUTTI</button>
            <button data-view="dec">DEC</button>
            <button data-view="bin">BIN</button>
            <button data-view="hex">HEX</button>
          </div>
          <div class="table-wrap" id="asciiTable"></div>
        </section>

        <section class="panel">
          <h3>ASCII → Testo</h3>
          <label class="field">Formato in ingresso
            <select id="asciiInputMode">
              <option value="dec">Decimale</option>
              <option value="bin">Binario</option>
              <option value="hex">Esadecimale</option>
            </select>
          </label>
          <label class="field">Valori separati da spazi
            <textarea id="asciiCodes" placeholder="67 79 68 69 88 33">67 79 68 69 88 33</textarea>
          </label>
          <button class="secondary" id="decodeAscii">DECODIFICA</button>
          <h3 style="margin-top:18px">Risultato</h3>
          <div class="result-box" id="asciiDecoded"></div>
          <div class="action-row">
            <button class="ghost" id="copyAscii">COPIA</button>
          </div>
          <div class="note">Questa versione lavora con ASCII standard (0–127). I caratteri fuori da questo intervallo vengono segnalati.</div>
        </section>
      </div>
    `;
    wireHelp(m);

    let view = "all";
    const text=$("#asciiText"), table=$("#asciiTable"), codes=$("#asciiCodes"), decoded=$("#asciiDecoded");

    const renderTable = () => {
      const chars = [...text.value];
      if (!chars.length) { table.innerHTML=`<div class="empty">Scrivi qualcosa per vedere i codici.</div>`; return; }
      const rows = chars.map(ch => {
        const code = ch.charCodeAt(0);
        const valid = code <= 127;
        const disp = ch === " " ? "␠" : ch === "\n" ? "↵" : escapeHtml(ch);
        const dec = valid ? code : "—";
        const bin = valid ? code.toString(2).padStart(8,"0") : "fuori ASCII";
        const hex = valid ? code.toString(16).toUpperCase().padStart(2,"0") : "—";
        return {disp,dec,bin,hex};
      });
      const cols = view === "all" ? ["char","dec","bin","hex"] : ["char",view];
      const heads = {char:"Carattere",dec:"Decimale",bin:"Binario",hex:"Hex"};
      table.innerHTML = `<table><thead><tr>${cols.map(c=>`<th>${heads[c]}</th>`).join("")}</tr></thead><tbody>${
        rows.map(r=>`<tr>${cols.map(c=>`<td class="mono">${c==="char"?r.disp:r[c]}</td>`).join("")}</tr>`).join("")
      }</tbody></table>`;
    };

    const decode = () => {
      const mode=$("#asciiInputMode").value;
      const tokens = codes.value.trim().split(/[\s,;]+/).filter(Boolean);
      const radix = mode==="dec"?10:mode==="bin"?2:16;
      const out=[];
      let bad=false;
      for (const tok of tokens) {
        const n = parseInt(tok,radix);
        const canonical = mode==="bin" ? /^[01]+$/ : mode==="hex" ? /^[0-9a-f]+$/i : /^\d+$/;
        if (!canonical.test(tok) || Number.isNaN(n) || n<0 || n>127) { out.push("�"); bad=true; }
        else out.push(String.fromCharCode(n));
      }
      decoded.textContent = out.join("");
      if (bad) toast("Alcuni valori non sono ASCII validi");
    };

    $$("#viewMode button").forEach(btn => btn.onclick = () => {
      view=btn.dataset.view;
      $$("#viewMode button").forEach(b=>b.classList.toggle("active",b===btn));
      renderTable();beep(680);
    });
    text.oninput=renderTable;
    $("#decodeAscii").onclick=()=>{decode();beep(560)};
    codes.oninput=decode;
    $("#asciiInputMode").onchange=decode;
    $("#copyAscii").onclick=()=>copyText(decoded.textContent);

    renderTable(); decode();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copiato");
      beep(900);
    } catch {
      toast("Copia non disponibile");
    }
  }

  $("#homeBtn").addEventListener("click", () => {renderHome();beep(520)});
  $("#brandBtn").addEventListener("click", () => {renderHome();beep(520)});
  $("#brandBtn").addEventListener("keydown", e => {if(e.key==="Enter"||e.key===" "){renderHome();beep(520)}});
  $("#themeBtn").addEventListener("click", () => {state.dark=!state.dark;applyTheme();beep(520)});
  $("#soundBtn").addEventListener("click", () => {state.sound=!state.sound;syncSoundIcon();if(state.sound)beep(760);});
  $("#fullscreenBtn").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
      beep(650);
    } catch { toast("Schermo intero non disponibile"); }
  });
  $("#infoBtn").addEventListener("click", () => {$("#infoDialog").showModal();beep(610)});
  $$("[data-close]").forEach(btn => btn.addEventListener("click", () => $("#"+btn.dataset.close).close()));
  ["infoDialog","helpDialog"].forEach(id => {
    $("#"+id).addEventListener("click", e => {
      const dialog = e.currentTarget;
      const rect = dialog.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
    });
  });

  applyTheme();
  syncSoundIcon();
  renderHome();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
  }
})();

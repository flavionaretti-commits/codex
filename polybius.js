(() => {
  "use strict";

  const BASE = "ABCDEFGHIKLMNOPQRSTUVWXYZ";
  let moduleOpen = false;

  function normalizeLetters(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/J/g, "I")
      .replace(/[^A-Z]/g, "");
  }

  function buildAlphabet(keyword="") {
    const out = [];
    for (const ch of normalizeLetters(keyword) + BASE) {
      if (!out.includes(ch)) out.push(ch);
    }
    return out.slice(0,25);
  }

  function buildMaps(alphabet) {
    const toCode = {};
    const fromCode = {};
    alphabet.forEach((ch,i) => {
      const row = Math.floor(i/5)+1;
      const col = (i%5)+1;
      const code = String(row)+String(col);
      toCode[ch] = code;
      fromCode[code] = ch;
    });
    // I and J always share a cell.
    if (toCode.I) toCode.J = toCode.I;
    return {toCode,fromCode};
  }

  function encode(text, maps) {
    const tokens = [];
    const steps = [];
    for (const raw of String(text || "")) {
      if (/\s/.test(raw)) {
        if (tokens.length && tokens.at(-1) !== "/") tokens.push("/");
        steps.push({space:true});
        continue;
      }
      const up = raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toUpperCase();
      const ch = up === "J" ? "J" : up;
      if (/^[A-Z]$/.test(ch)) {
        const code = maps.toCode[ch];
        if (code) {
          tokens.push(code);
          steps.push({char:raw.toUpperCase(), code, merged:ch==="J"});
        }
      } else if (raw.trim()) {
        tokens.push(raw);
        steps.push({char:raw, code:raw, punct:true});
      }
    }
    while (tokens.at(-1)==="/") tokens.pop();
    return {text:tokens.join(" "),steps};
  }

  function decode(codeText, maps) {
    const raw = String(codeText || "").trim();
    if (!raw) return {text:"",tokens:[]};

    const pieces = raw
      .replace(/\//g," / ")
      .split(/\s+/)
      .filter(Boolean);

    let out = "";
    const tokens = [];

    for (const p of pieces) {
      if (p === "/") {
        if (out && !out.endsWith(" ")) out += " ";
        tokens.push({space:true});
        continue;
      }
      if (/^[1-5][1-5]$/.test(p)) {
        const ch = maps.fromCode[p];
        if (ch) {
          out += ch;
          tokens.push({code:p,char:ch});
        } else {
          out += "�";
          tokens.push({code:p,char:"�",bad:true});
        }
      } else if (p.length===1 && !/\d/.test(p)) {
        out += p;
        tokens.push({code:p,char:p,punct:true});
      } else {
        out += "�";
        tokens.push({code:p,char:"�",bad:true});
      }
    }
    return {text:out.trim(),tokens};
  }

  function squareHtml(alphabet) {
    let html = '<div class="poly-corner">↘</div>';
    for(let c=1;c<=5;c++) html += '<div class="poly-head">'+c+'</div>';
    for(let r=1;r<=5;r++) {
      html += '<div class="poly-head">'+r+'</div>';
      for(let c=1;c<=5;c++) {
        const i=(r-1)*5+(c-1);
        const ch=alphabet[i];
        const label=ch==="I" ? "I/J" : ch;
        html += '<button type="button" class="poly-cell" data-code="'+r+c+'" data-char="'+ch+'">' +
          '<strong>'+label+'</strong><span>'+r+c+'</span></button>';
      }
    }
    return html;
  }

  function renderModule() {
    moduleOpen = true;
    const main = document.querySelector("#main");
    if (!main) return;

    main.innerHTML = `
      <div class="module-head">
        <div>
          <div class="eyebrow">Codice segreto · sostituzione frazionata</div>
          <h2>Quadrato di Polibio</h2>
          <p>Ogni lettera viene sostituita dalle coordinate della sua casella in una griglia 5×5.</p>
        </div>
        <button class="help-btn" id="polyHelp">? COME FUNZIONA</button>
      </div>

      <div class="workspace poly-workspace">
        <section class="panel">
          <h3>Quadrato 5×5</h3>

          <div class="poly-key-row">
            <label class="field">Parola chiave <small>(opzionale)</small>
              <input id="polyKeyword" type="text" autocomplete="off" spellcheck="false" placeholder="Lascia vuoto per il quadrato classico">
            </label>
            <button class="ghost" id="polyResetKey">STANDARD</button>
          </div>

          <div class="poly-square" id="polySquare"></div>

          <div class="poly-legend">
            <span><b>prima cifra</b> = riga</span>
            <span><b>seconda cifra</b> = colonna</span>
            <span><b>I/J</b> condividono la stessa casella</span>
          </div>

          <div class="note">
            Tocca una casella per inserire automaticamente le sue coordinate nella decodifica.
          </div>
        </section>

        <section class="panel">
          <h3>Testo → coordinate</h3>
          <label class="field">Messaggio
            <textarea id="polyText" placeholder="Scrivi qui il messaggio…">CIAO POLIBIO</textarea>
          </label>

          <div class="result-box poly-result" id="polyEncoded"></div>
          <div class="poly-steps" id="polyEncodeSteps"></div>

          <div class="action-row">
            <button class="ghost" id="polyCopyEncoded">COPIA CODICE</button>
            <button class="ghost" id="polyClearText">PULISCI</button>
          </div>

          <h3 class="poly-decode-title">Coordinate → testo</h3>
          <label class="field">
            Codice
            <textarea id="polyCode" class="poly-code-input" spellcheck="false" placeholder="Es. 13 24 11 34 / 35 34 31 24 12 24 34"></textarea>
          </label>

          <div class="result-box poly-decoded" id="polyDecoded"></div>
          <div class="poly-steps" id="polyDecodeSteps"></div>

          <div class="action-row">
            <button class="ghost" id="polyCopyDecoded">COPIA TESTO</button>
            <button class="ghost" id="polyBack">⌫</button>
            <button class="ghost" id="polySpace">SPAZIO</button>
            <button class="ghost" id="polyClearCode">PULISCI</button>
          </div>
        </section>
      </div>
    `;

    const keyword = document.querySelector("#polyKeyword");
    const square = document.querySelector("#polySquare");
    const text = document.querySelector("#polyText");
    const code = document.querySelector("#polyCode");
    const encoded = document.querySelector("#polyEncoded");
    const decoded = document.querySelector("#polyDecoded");
    const encSteps = document.querySelector("#polyEncodeSteps");
    const decSteps = document.querySelector("#polyDecodeSteps");

    let alphabet = buildAlphabet("");
    let maps = buildMaps(alphabet);

    function highlight(codeValue) {
      square.querySelectorAll(".poly-cell").forEach(cell => {
        cell.classList.toggle("active",cell.dataset.code===codeValue);
      });
    }

    function renderSquare() {
      alphabet = buildAlphabet(keyword.value);
      maps = buildMaps(alphabet);
      square.innerHTML = squareHtml(alphabet);

      square.querySelectorAll(".poly-cell").forEach(cell => {
        cell.onclick = () => {
          const v = cell.dataset.code;
          const needsSpace = code.value.trim() && !/\s$/.test(code.value);
          code.value += (needsSpace ? " " : "") + v + " ";
          updateDecode();
          highlight(v);
          code.focus();
        };
        cell.onmouseenter = () => highlight(cell.dataset.code);
        cell.onmouseleave = () => highlight("");
      });

      updateEncode();
      updateDecode();
    }

    function updateEncode() {
      const result = encode(text.value,maps);
      encoded.textContent = result.text;
      if(!result.text) encoded.innerHTML='<span class="result-placeholder">Scrivi un messaggio per convertirlo in coordinate.</span>';

      encSteps.innerHTML = result.steps.length
        ? result.steps.map(s => {
            if(s.space) return '<span class="poly-word-gap">/</span>';
            const cls=s.merged ? " merged" : "";
            return '<button type="button" class="poly-step'+cls+'" data-code="'+s.code+'"><b>'+s.char+'</b><span>→</span><strong>'+s.code+'</strong></button>';
          }).join("")
        : "";

      encSteps.querySelectorAll("[data-code]").forEach(el=>{
        el.onmouseenter=()=>highlight(el.dataset.code);
        el.onmouseleave=()=>highlight("");
        el.onclick=()=>highlight(el.dataset.code);
      });
    }

    function updateDecode() {
      const result = decode(code.value,maps);
      decoded.textContent = result.text;
      if(!result.text) decoded.innerHTML='<span class="result-placeholder">Inserisci coordinate da 11 a 55.</span>';

      decSteps.innerHTML = result.tokens.length
        ? result.tokens.map(s => {
            if(s.space) return '<span class="poly-word-gap">/</span>';
            return '<button type="button" class="poly-step'+(s.bad?" bad":"")+'" data-code="'+s.code+'"><b>'+s.code+'</b><span>→</span><strong>'+s.char+'</strong></button>';
          }).join("")
        : "";

      decSteps.querySelectorAll("[data-code]").forEach(el=>{
        el.onmouseenter=()=>highlight(el.dataset.code);
        el.onmouseleave=()=>highlight("");
      });
    }

    keyword.addEventListener("input",renderSquare);
    text.addEventListener("input",updateEncode);
    code.addEventListener("input",updateDecode);

    document.querySelector("#polyResetKey").onclick=()=>{
      keyword.value="";
      renderSquare();
    };
    document.querySelector("#polyClearText").onclick=()=>{
      text.value="";
      updateEncode();
    };
    document.querySelector("#polyClearCode").onclick=()=>{
      code.value="";
      updateDecode();
    };
    document.querySelector("#polyBack").onclick=()=>{
      const parts=code.value.trimEnd().split(/\s+/);
      parts.pop();
      code.value=parts.join(" ");
      if(code.value) code.value+=" ";
      updateDecode();
      code.focus();
    };
    document.querySelector("#polySpace").onclick=()=>{
      const trimmed=code.value.trimEnd();
      code.value=trimmed + (trimmed ? " / " : "/ ");
      updateDecode();
      code.focus();
    };

    document.querySelector("#polyCopyEncoded").onclick=async()=>{
      const value=encoded.textContent.trim();
      if(value) try{await navigator.clipboard.writeText(value);}catch{}
    };
    document.querySelector("#polyCopyDecoded").onclick=async()=>{
      const value=decoded.textContent.trim();
      if(value) try{await navigator.clipboard.writeText(value);}catch{}
    };

    document.querySelector("#polyHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content && dialog) {
        content.innerHTML=`
          <h2>Quadrato di Polibio</h2>
          <p>Il quadrato di Polibio usa una griglia 5×5. Ogni lettera è identificata da due cifre: <strong>prima la riga, poi la colonna</strong>.</p>
          <p>Nel quadrato classico le 26 lettere dell’alfabeto devono entrare in 25 caselle, quindi <strong>I e J condividono la stessa posizione</strong>. Per questo, dopo la decodifica, una I può talvolta rappresentare una J e va interpretata dal contesto.</p>
          <p>Con una <strong>parola chiave</strong>, CODEX! inserisce prima le lettere non ripetute della chiave e poi completa il quadrato con le lettere mancanti. In questo modo si ottiene un quadrato segreto personalizzato.</p>
          <p>È un cifrario di sostituzione semplice: da solo non è sicuro secondo gli standard moderni, ma è molto importante storicamente e didatticamente perché trasforma lettere in coordinate numeriche.</p>
        `;
        dialog.showModal();
      }
    };

    renderSquare();
  }

  function ensureCard() {
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-polybius-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.polybiusCard="1";
    card.innerHTML=`
      <div class="card-icon poly-card-icon" aria-hidden="true">
        <span>11</span><span>12</span><span>21</span><span>22</span>
      </div>
      <h4>POLIBIO</h4>
      <p>Trasforma le lettere in coordinate con un quadrato 5×5, anche personalizzato.</p>
      <span class="badge secret">CODICE SEGRETO</span>
    `;
    card.onclick=renderModule;

    const pig=cards.querySelector('[data-module="pigpen"]');
    if(pig) cards.insertBefore(card,pig);
    else cards.appendChild(card);
  }

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#polySquare")) moduleOpen=false;
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();
})();
(() => {
  "use strict";

  const L = {
    0:"0001101",1:"0011001",2:"0010011",3:"0111101",4:"0100011",
    5:"0110001",6:"0101111",7:"0111011",8:"0110111",9:"0001011"
  };
  const G = {
    0:"0100111",1:"0110011",2:"0011011",3:"0100001",4:"0011101",
    5:"0111001",6:"0000101",7:"0010001",8:"0001001",9:"0010111"
  };
  const R = {
    0:"1110010",1:"1100110",2:"1101100",3:"1000010",4:"1011100",
    5:"1001110",6:"1010000",7:"1000100",8:"1001000",9:"1110100"
  };
  const PARITY = {
    0:"LLLLLL",1:"LLGLGG",2:"LLGGLG",3:"LLGGGL",4:"LGLLGG",
    5:"LGGLLG",6:"LGGGLL",7:"LGLGLG",8:"LGLGGL",9:"LGGLGL"
  };

  let scannerControls = null;
  let nativeStream = null;
  let nativeLoopToken = 0;
  let moduleOpen = false;

  function onlyDigits(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function calcCheckDigit(base12) {
    if (!/^\d{12}$/.test(base12)) return null;
    let sum = 0;
    for (let i=0;i<12;i++) {
      const n = +base12[i];
      sum += n * (i % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
  }

  function validateEAN13(code) {
    return /^\d{13}$/.test(code) && calcCheckDigit(code.slice(0,12)) === +code[12];
  }

  function checkExplanation(base12) {
    if (!/^\d{12}$/.test(base12)) return "";
    const odd = [], even = [];
    for (let i=0;i<12;i++) {
      (i % 2 === 0 ? odd : even).push(+base12[i]);
    }
    const s1 = odd.reduce((a,b)=>a+b,0);
    const s3 = even.reduce((a,b)=>a+b,0);
    const total = s1 + 3*s3;
    const check = (10 - total % 10) % 10;
    return `(${odd.join("+")}) + 3×(${even.join("+")}) = ${total} → cifra di controllo <strong>${check}</strong>`;
  }

  function encodeBits(code) {
    if (!validateEAN13(code)) return "";
    const first = +code[0];
    const parity = PARITY[first];
    let bits = "101";
    for (let i=1;i<=6;i++) {
      const d = +code[i];
      bits += parity[i-1] === "L" ? L[d] : G[d];
    }
    bits += "01010";
    for (let i=7;i<=12;i++) bits += R[+code[i]];
    bits += "101";
    return bits;
  }

  function barcodeSvg(code) {
    const bits = encodeBits(code);
    if (!bits) return "";
    const moduleW = 3;
    const quietL = 11, quietR = 7;
    const totalModules = quietL + 95 + quietR;
    const width = totalModules * moduleW;
    const barY = 8, normalH = 92, guardH = 104;
    const guards = new Set([0,1,2,45,46,47,48,49,92,93,94]);
    let bars = "";
    for (let i=0;i<bits.length;i++) {
      if (bits[i] !== "1") continue;
      const h = guards.has(i) ? guardH : normalH;
      bars += `<rect x="${(quietL+i)*moduleW}" y="${barY}" width="${moduleW}" height="${h}" fill="#111"/>`;
    }

    const firstX = (quietL - 4.5) * moduleW;
    const leftStart = quietL + 3;
    const rightStart = quietL + 50;
    let digits = `<text x="${firstX}" y="130" font-size="16" font-family="ui-monospace, monospace" text-anchor="middle" fill="#111">${code[0]}</text>`;
    for (let i=0;i<6;i++) {
      const x=(leftStart + i*7 + 3.5)*moduleW;
      digits += `<text x="${x}" y="130" font-size="16" font-family="ui-monospace, monospace" text-anchor="middle" fill="#111">${code[i+1]}</text>`;
    }
    for (let i=0;i<6;i++) {
      const x=(rightStart + i*7 + 3.5)*moduleW;
      digits += `<text x="${x}" y="130" font-size="16" font-family="ui-monospace, monospace" text-anchor="middle" fill="#111">${code[i+7]}</text>`;
    }

    return `<svg class="ean-svg" viewBox="0 0 ${width} 140" role="img" aria-label="Codice a barre EAN-13 ${code}">
      <rect width="100%" height="100%" fill="#fff"/>
      ${bars}
      ${digits}
    </svg>`;
  }

  function stopScanner() {
    nativeLoopToken++;
    if (scannerControls) {
      try { scannerControls.stop(); } catch {}
      scannerControls = null;
    }
    if (nativeStream) {
      nativeStream.getTracks().forEach(t => t.stop());
      nativeStream = null;
    }
    const video = document.querySelector("#eanScannerVideo");
    if (video) {
      try { video.pause(); } catch {}
      video.srcObject = null;
    }
    const btn = document.querySelector("#eanStartScan");
    if (btn) btn.disabled = false;
    const stop = document.querySelector("#eanStopScan");
    if (stop) stop.disabled = true;
  }

  function scannerStatus(text, kind="") {
    const el = document.querySelector("#eanScanStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "ean-scan-status " + kind;
  }

  function onDetected(raw) {
    const value = onlyDigits(raw);
    const result = document.querySelector("#eanScanned");
    if (!result) return false;
    if (!/^\d{13}$/.test(value)) {
      scannerStatus("Codice rilevato, ma non è un EAN-13.", "warn");
      return false;
    }
    if (!validateEAN13(value)) {
      scannerStatus("EAN-13 rilevato, ma la cifra di controllo non è valida.", "warn");
      result.textContent = value;
      return false;
    }
    result.textContent = value;
    result.dataset.value = value;
    scannerStatus("EAN-13 letto correttamente.", "ok");
    stopScanner();
    try {
      navigator.vibrate?.(80);
    } catch {}
    return true;
  }

  function loadZXing() {
    if (window.ZXingBrowser) return Promise.resolve(window.ZXingBrowser);
    if (window.__codexZXingPromise) return window.__codexZXingPromise;

    window.__codexZXingPromise = new Promise((resolve,reject) => {
      const s=document.createElement("script");
      s.src="https://unpkg.com/@zxing/browser@0.2.1";
      s.async=true;
      s.onload=()=> window.ZXingBrowser ? resolve(window.ZXingBrowser) : reject(new Error("ZXing non disponibile"));
      s.onerror=()=>reject(new Error("Impossibile caricare il lettore compatibile"));
      document.head.appendChild(s);
    });
    return window.__codexZXingPromise;
  }

  async function startNativeScanner(video) {
    const formats = await BarcodeDetector.getSupportedFormats();
    if (!formats.includes("ean_13")) throw new Error("EAN-13 non supportato dal lettore nativo");
    const detector = new BarcodeDetector({formats:["ean_13"]});

    nativeStream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:"environment"},
        width:{ideal:1280},
        height:{ideal:720}
      },
      audio:false
    });
    video.srcObject=nativeStream;
    await video.play();
    scannerStatus("Inquadra il codice a barre dentro la cornice.", "live");

    const token=++nativeLoopToken;
    const loop=async()=>{
      if(token!==nativeLoopToken || !document.body.contains(video)) return;
      try {
        const found=await detector.detect(video);
        for(const item of found){
          if(onDetected(item.rawValue)) return;
        }
      } catch {}
      setTimeout(loop,140);
    };
    loop();
  }

  async function startZXingScanner(video) {
    const ZX = await loadZXing();
    const reader = new ZX.BrowserMultiFormatReader();
    scannerStatus("Inquadra il codice a barre dentro la cornice.", "live");
    scannerControls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (!result) return;
      const raw = typeof result.getText === "function" ? result.getText() : (result.text || String(result));
      onDetected(raw);
    });
  }

  async function startScanner() {
    const video=document.querySelector("#eanScannerVideo");
    const start=document.querySelector("#eanStartScan");
    const stop=document.querySelector("#eanStopScan");
    if(!video || !navigator.mediaDevices?.getUserMedia){
      scannerStatus("La fotocamera non è disponibile in questo browser.", "error");
      return;
    }
    stopScanner();
    start.disabled=true;
    stop.disabled=false;
    scannerStatus("Richiesta accesso alla fotocamera…","live");

    try {
      let nativeOK=false;
      if ("BarcodeDetector" in window) {
        try {
          await startNativeScanner(video);
          nativeOK=true;
        } catch {
          stopScanner();
          start.disabled=true;
          stop.disabled=false;
        }
      }
      if (!nativeOK) await startZXingScanner(video);
    } catch(err) {
      stopScanner();
      scannerStatus("Non riesco ad avviare la lettura. Controlla il permesso fotocamera e la connessione.", "error");
    }
  }

  function helpHtml() {
    return `
      <h2>Codice a barre EAN-13</h2>
      <p>EAN-13 rappresenta un numero di 13 cifre con 95 moduli bianchi e neri. L’ultima cifra è una <strong>cifra di controllo</strong> calcolata dalle prime dodici.</p>
      <p>La prima cifra non viene disegnata direttamente come sette barre: determina invece la sequenza L/G usata per le sei cifre della metà sinistra.</p>
      <p>Le tre guardie hanno struttura <strong>101</strong> all’inizio, <strong>01010</strong> al centro e <strong>101</strong> alla fine.</p>
      <p>Le prime cifre fanno parte dell’assegnazione GS1: non vanno interpretate automaticamente come “Paese di produzione”.</p>
    `;
  }

  function renderModule() {
    moduleOpen=true;
    stopScanner();
    document.body.classList.add("module-open");
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=`
      <div class="module-head">
        <div>
          <div class="eyebrow">Codice e rappresentazione</div>
          <h2>Codice a barre EAN-13</h2>
          <p>Genera, verifica e leggi con la fotocamera i codici a barre EAN-13.</p>
        </div>
        <button class="help-btn" id="eanHelp">? COME FUNZIONA</button>
      </div>

      <div class="workspace ean-workspace">
        <section class="panel">
          <h3>Genera EAN-13</h3>
          <label class="field">Prime 12 cifre oppure EAN-13 completo
            <input id="eanInput" class="ean-number-input" inputmode="numeric" pattern="[0-9]*" maxlength="13" value="800123456789">
          </label>

          <div class="ean-status" id="eanStatus"></div>
          <div class="ean-barcode-box" id="eanBarcode"></div>

          <div class="ean-number-big" id="eanNumber"></div>
          <div class="action-row">
            <button class="ghost" id="eanCopy">COPIA NUMERO</button>
            <button class="ghost" id="eanClear">PULISCI</button>
          </div>

          <div class="ean-check-box">
            <strong>Cifra di controllo</strong>
            <div id="eanCheckMath"></div>
          </div>
        </section>

        <section class="panel">
          <h3>Leggi con lo smartphone</h3>
          <div class="ean-camera">
            <video id="eanScannerVideo" playsinline muted></video>
            <div class="ean-scan-frame"><span></span></div>
          </div>
          <div class="action-row">
            <button class="primary" id="eanStartScan">📷 AVVIA LETTORE</button>
            <button class="ghost" id="eanStopScan" disabled>FERMA</button>
          </div>
          <div class="ean-scan-status" id="eanScanStatus">Tocca “Avvia lettore” e consenti l’uso della fotocamera.</div>

          <h3 class="ean-read-title">Codice letto</h3>
          <div class="result-box ean-scanned" id="eanScanned"></div>
          <div class="action-row">
            <button class="ghost" id="eanUseScanned">USA NEL GENERATORE</button>
            <button class="ghost" id="eanCopyScanned">COPIA</button>
          </div>
          <div class="note">Su smartphone viene preferita la fotocamera posteriore. Tieni il codice abbastanza vicino e orizzontale.</div>
        </section>
      </div>

      <section class="panel ean-anatomy">
        <h3>Come è fatto un EAN-13</h3>
        <div class="ean-anatomy-row">
          <div><b>1ª cifra</b><span>sceglie la parità L/G</span></div>
          <div><b>101</b><span>guardia iniziale</span></div>
          <div><b>6 cifre</b><span>metà sinistra</span></div>
          <div><b>01010</b><span>guardia centrale</span></div>
          <div><b>6 cifre</b><span>metà destra</span></div>
          <div><b>101</b><span>guardia finale</span></div>
        </div>
        <div class="ean-detail" id="eanDetail"></div>
      </section>
    `;

    const input=document.querySelector("#eanInput");
    const barcode=document.querySelector("#eanBarcode");
    const status=document.querySelector("#eanStatus");
    const number=document.querySelector("#eanNumber");
    const math=document.querySelector("#eanCheckMath");
    const detail=document.querySelector("#eanDetail");

    function updateGenerator(){
      let raw=onlyDigits(input.value).slice(0,13);
      if(input.value!==raw) input.value=raw;

      let code="", state="";
      if(raw.length===12){
        const check=calcCheckDigit(raw);
        code=raw+check;
        state=`Cifra di controllo calcolata automaticamente: <strong>${check}</strong>`;
        status.className="ean-status ok";
      }else if(raw.length===13){
        const expected=calcCheckDigit(raw.slice(0,12));
        if(validateEAN13(raw)){
          code=raw;
          state="EAN-13 valido.";
          status.className="ean-status ok";
        }else{
          state=`Cifra di controllo errata: l’ultima cifra dovrebbe essere <strong>${expected}</strong>.`;
          status.className="ean-status error";
        }
      }else{
        status.className="ean-status";
        state="Inserisci 12 cifre per calcolare la tredicesima, oppure un EAN-13 completo.";
      }

      status.innerHTML=state;

      if(code){
        barcode.innerHTML=barcodeSvg(code);
        number.textContent=code;
        number.dataset.value=code;
        math.innerHTML=checkExplanation(code.slice(0,12));
        detail.innerHTML=`
          <span>Prima cifra: <strong>${code[0]}</strong></span>
          <span>Parità sinistra: <strong>${PARITY[+code[0]]}</strong></span>
          <span>Cifra di controllo: <strong>${code[12]}</strong></span>
          <span>Moduli codificati: <strong>95</strong></span>
        `;
      }else{
        barcode.innerHTML='<span class="result-placeholder">Il codice a barre comparirà qui.</span>';
        number.textContent="";
        number.dataset.value="";
        math.innerHTML=raw.length>=12 ? checkExplanation(raw.slice(0,12)) : "";
        detail.innerHTML="";
      }
    }

    input.addEventListener("input",updateGenerator);
    document.querySelector("#eanClear").onclick=()=>{input.value="";updateGenerator();};
    document.querySelector("#eanCopy").onclick=async()=>{
      const v=number.dataset.value||"";
      if(v) try{await navigator.clipboard.writeText(v);}catch{}
    };

    document.querySelector("#eanStartScan").onclick=startScanner;
    document.querySelector("#eanStopScan").onclick=()=>{
      stopScanner();
      scannerStatus("Lettura fermata.");
    };

    document.querySelector("#eanUseScanned").onclick=()=>{
      const v=document.querySelector("#eanScanned").dataset.value||document.querySelector("#eanScanned").textContent.trim();
      if(validateEAN13(v)){
        input.value=v;
        updateGenerator();
        input.scrollIntoView({behavior:"smooth",block:"center"});
      }
    };
    document.querySelector("#eanCopyScanned").onclick=async()=>{
      const v=document.querySelector("#eanScanned").textContent.trim();
      if(v) try{await navigator.clipboard.writeText(v);}catch{}
    };

    document.querySelector("#eanHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content && dialog){
        content.innerHTML=helpHtml();
        dialog.showModal();
      }
    };

    updateGenerator();
  }

  function ensureCard(){
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main) return;
    if(document.querySelector("[data-ean13-card]")) return;

    const titles=[...main.querySelectorAll(".section-title")];
    const section=titles.find(x=>x.textContent.toLowerCase().includes("codici e rappresentazioni"));
    const cards=section?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.ean13Card="1";
    card.innerHTML=`
      <div class="card-icon ean-card-icon"><span></span><span></span><span></span><span></span><span></span></div>
      <h4>EAN-13</h4>
      <p>Genera, verifica e leggi con la fotocamera i codici a barre commerciali.</p>
      <span class="badge code">CODICE</span>
    `;
    card.addEventListener("click",renderModule);

    const ascii=cards.querySelector('[data-module="ascii"]');
    if(ascii) cards.insertBefore(card,ascii);
    else cards.appendChild(card);
  }

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#eanInput")){
      moduleOpen=false;
      stopScanner();
    }
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pagehide",stopScanner);
  document.addEventListener("visibilitychange",()=>{if(document.hidden && moduleOpen) stopScanner();});
  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();
})();
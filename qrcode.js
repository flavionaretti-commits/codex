(() => {
  "use strict";

  let moduleOpen = false;
  let scannerControls = null;
  let nativeStream = null;
  let nativeLoopToken = 0;
  let qrModel = null;
  let lastGeneratedText = "";
  let lastScannedText = "";

  function status(text, kind="") {
    const el = document.querySelector("#qrStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "qr-status " + kind;
  }

  function scanStatus(text, kind="") {
    const el = document.querySelector("#qrScanStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "qr-scan-status " + kind;
  }

  function isUrl(text) {
    try {
      const u = new URL(text);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function loadQRCodeLibrary() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (window.__codexQRCodePromise) return window.__codexQRCodePromise;
    window.__codexQRCodePromise = new Promise((resolve,reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/qrcode-generator@1.4.4/qrcode.js";
      s.async = true;
      s.onload = () => window.qrcode ? resolve(window.qrcode) : reject(new Error("Libreria QR non disponibile"));
      s.onerror = () => reject(new Error("Impossibile caricare il generatore QR"));
      document.head.appendChild(s);
    });
    return window.__codexQRCodePromise;
  }

  function loadZXing() {
    if (window.ZXingBrowser) return Promise.resolve(window.ZXingBrowser);
    if (window.__codexZXingPromise) return window.__codexZXingPromise;
    window.__codexZXingPromise = new Promise((resolve,reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/@zxing/browser@0.2.1";
      s.async = true;
      s.onload = () => window.ZXingBrowser ? resolve(window.ZXingBrowser) : reject(new Error("ZXing non disponibile"));
      s.onerror = () => reject(new Error("Impossibile caricare il lettore QR"));
      document.head.appendChild(s);
    });
    return window.__codexZXingPromise;
  }

  function drawQR(model, canvas, targetPx=512) {
    const count = model.getModuleCount();
    const quiet = 4;
    const total = count + quiet * 2;
    const modulePx = Math.max(1, Math.floor(targetPx / total));
    const size = modulePx * total;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,size,size);
    ctx.fillStyle = "#000";

    for(let r=0;r<count;r++) {
      for(let c=0;c<count;c++) {
        if(model.isDark(r,c)) {
          ctx.fillRect((c+quiet)*modulePx,(r+quiet)*modulePx,modulePx,modulePx);
        }
      }
    }
  }

  async function generateQR() {
    const input = document.querySelector("#qrInput");
    const ecc = document.querySelector("#qrEcc");
    const size = document.querySelector("#qrSize");
    const canvas = document.querySelector("#qrCanvas");
    const meta = document.querySelector("#qrMeta");
    const openBtn = document.querySelector("#qrOpenGenerated");
    if (!input || !canvas) return;

    const text = input.value;
    if (!text.trim()) {
      qrModel = null;
      lastGeneratedText = "";
      canvas.width = 1; canvas.height = 1;
      canvas.classList.add("empty");
      status("Scrivi un testo, un URL o un altro contenuto per generare il QR.");
      meta.innerHTML = "";
      openBtn.hidden = true;
      return;
    }

    status("Genero il QR…","live");
    try {
      const makeQR = await loadQRCodeLibrary();
      const model = makeQR(0, ecc.value);
      model.addData(text);
      model.make();
      qrModel = model;
      lastGeneratedText = text;
      drawQR(model, canvas, +size.value);
      canvas.classList.remove("empty");

      const modules = model.getModuleCount();
      const version = Math.round((modules - 21) / 4) + 1;
      meta.innerHTML =
        '<span>Versione <strong>'+version+'</strong></span>' +
        '<span><strong>'+modules+'×'+modules+'</strong> moduli</span>' +
        '<span>Correzione <strong>'+ecc.value+'</strong></span>' +
        '<span>Quiet zone <strong>4 moduli</strong></span>';

      status("QR generato correttamente.","ok");
      openBtn.hidden = !isUrl(text.trim());
    } catch(err) {
      qrModel = null;
      status("Il contenuto è troppo lungo per queste impostazioni oppure il generatore non è disponibile.","error");
      meta.innerHTML = "";
      openBtn.hidden = true;
    }
  }

  function downloadPNG() {
    const canvas = document.querySelector("#qrCanvas");
    if (!qrModel || !canvas || canvas.width < 10) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qrcode-codex.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
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
    const video = document.querySelector("#qrScannerVideo");
    if (video) {
      try { video.pause(); } catch {}
      video.srcObject = null;
    }
    const start = document.querySelector("#qrStartScan");
    const stop = document.querySelector("#qrStopScan");
    if(start) start.disabled = false;
    if(stop) stop.disabled = true;
  }

  function onDetected(raw) {
    const text = String(raw ?? "").trim();
    if (!text) return false;
    lastScannedText = text;
    const out = document.querySelector("#qrScanned");
    const open = document.querySelector("#qrOpenScanned");
    if (!out) return false;
    out.textContent = text;
    open.hidden = !isUrl(text);
    scanStatus("QR letto correttamente.","ok");
    stopScanner();
    try { navigator.vibrate?.(80); } catch {}
    return true;
  }

  async function startNativeScanner(video) {
    const formats = await BarcodeDetector.getSupportedFormats();
    if (!formats.includes("qr_code")) throw new Error("QR non supportato dal lettore nativo");
    const detector = new BarcodeDetector({formats:["qr_code"]});

    nativeStream = await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    video.srcObject = nativeStream;
    await video.play();
    scanStatus("Inquadra il QR dentro la cornice.","live");

    const token = ++nativeLoopToken;
    const loop = async () => {
      if(token !== nativeLoopToken || !document.body.contains(video)) return;
      try {
        const found = await detector.detect(video);
        if(found?.length && onDetected(found[0].rawValue)) return;
      } catch {}
      setTimeout(loop,120);
    };
    loop();
  }

  async function startZXingScanner(video) {
    const ZX = await loadZXing();
    const reader = new ZX.BrowserQRCodeReader();
    scanStatus("Inquadra il QR dentro la cornice.","live");
    scannerControls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (!result) return;
      const raw = typeof result.getText === "function" ? result.getText() : (result.text || String(result));
      onDetected(raw);
    });
  }

  async function startScanner() {
    const video = document.querySelector("#qrScannerVideo");
    const start = document.querySelector("#qrStartScan");
    const stop = document.querySelector("#qrStopScan");
    if(!video || !navigator.mediaDevices?.getUserMedia) {
      scanStatus("La fotocamera non è disponibile in questo browser.","error");
      return;
    }

    stopScanner();
    start.disabled = true;
    stop.disabled = false;
    scanStatus("Richiesta accesso alla fotocamera…","live");

    try {
      let nativeOK = false;
      if ("BarcodeDetector" in window) {
        try {
          await startNativeScanner(video);
          nativeOK = true;
        } catch {
          stopScanner();
          start.disabled = true;
          stop.disabled = false;
        }
      }
      if(!nativeOK) await startZXingScanner(video);
    } catch {
      stopScanner();
      scanStatus("Non riesco ad avviare la fotocamera. Controlla il permesso e la connessione.","error");
    }
  }

  function helpHtml() {
    return `
      <h2>QR Code</h2>
      <p>Un QR Code è una matrice di moduli bianchi e neri. I tre grandi quadrati agli angoli aiutano il lettore a riconoscere posizione e orientamento.</p>
      <p>La <strong>quiet zone</strong> è il bordo bianco libero attorno al codice: CODEX! usa i 4 moduli previsti dallo standard.</p>
      <p>I livelli di correzione errori sono <strong>L, M, Q, H</strong>: aumentando il livello, il QR può sopportare più danni o coperture, ma contiene meno dati a parità di dimensione.</p>
      <p>La versione va da 1 a 40: CODEX! sceglie automaticamente la più piccola che contiene il testo inserito.</p>
      <p>Un QR può contenere testo, URL e molti altri dati. CODEX! non apre automaticamente i link letti: sei tu a scegliere se aprirli.</p>
    `;
  }

  function renderModule() {
    moduleOpen = true;
    stopScanner();
    const main = document.querySelector("#main");
    if(!main) return;

    main.innerHTML = `
      <div class="module-head">
        <div>
          <div class="eyebrow">Codice e rappresentazione</div>
          <h2>QR CODE</h2>
          <p>Genera un QR, proiettalo, salvalo oppure leggilo con la fotocamera.</p>
        </div>
        <button class="help-btn" id="qrHelp">? COME FUNZIONA</button>
      </div>

      <div class="workspace qr-workspace">
        <section class="panel">
          <h3>Genera QR</h3>
          <label class="field">Contenuto
            <textarea id="qrInput" placeholder="Testo, URL, messaggio…">https://flavionaretti-commits.github.io/codex/</textarea>
          </label>

          <div class="qr-options">
            <label>Correzione errori
              <select id="qrEcc">
                <option value="L">L · bassa</option>
                <option value="M" selected>M · media</option>
                <option value="Q">Q · alta</option>
                <option value="H">H · massima</option>
              </select>
            </label>
            <label>Dimensione PNG
              <select id="qrSize">
                <option value="320">320 px</option>
                <option value="512" selected>512 px</option>
                <option value="768">768 px</option>
                <option value="1024">1024 px</option>
              </select>
            </label>
          </div>

          <div class="qr-preview">
            <canvas id="qrCanvas" aria-label="QR generato"></canvas>
          </div>

          <div class="qr-meta" id="qrMeta"></div>
          <div class="qr-status" id="qrStatus"></div>

          <div class="action-row">
            <button class="primary" id="qrGenerate">GENERA</button>
            <button class="ghost" id="qrDownload">SALVA PNG</button>
            <button class="ghost" id="qrCopy">COPIA CONTENUTO</button>
            <button class="ghost" id="qrOpenGenerated" hidden>APRI LINK ↗</button>
          </div>
        </section>

        <section class="panel">
          <h3>Leggi con lo smartphone</h3>
          <div class="qr-camera">
            <video id="qrScannerVideo" playsinline muted></video>
            <div class="qr-scan-frame"><span></span></div>
          </div>

          <div class="action-row">
            <button class="primary" id="qrStartScan">📷 AVVIA LETTORE</button>
            <button class="ghost" id="qrStopScan" disabled>FERMA</button>
          </div>

          <div class="qr-scan-status" id="qrScanStatus">Tocca “Avvia lettore” e consenti l’uso della fotocamera.</div>

          <h3 class="qr-read-title">Contenuto letto</h3>
          <div class="result-box qr-scanned" id="qrScanned"></div>

          <div class="action-row">
            <button class="ghost" id="qrUseScanned">USA NEL GENERATORE</button>
            <button class="ghost" id="qrCopyScanned">COPIA</button>
            <button class="ghost" id="qrOpenScanned" hidden>APRI LINK ↗</button>
          </div>
        </section>
      </div>

      <section class="panel qr-anatomy">
        <h3>Anatomia di un QR</h3>
        <div class="qr-anatomy-grid">
          <div><span class="qr-mini finder"></span><b>Finder pattern</b><small>orientamento</small></div>
          <div><span class="qr-mini timing"></span><b>Timing pattern</b><small>griglia e passo</small></div>
          <div><span class="qr-mini data"></span><b>Dati</b><small>contenuto codificato</small></div>
          <div><span class="qr-mini ecc"></span><b>Correzione errori</b><small>ridondanza</small></div>
          <div><span class="qr-mini quiet"></span><b>Quiet zone</b><small>bordo bianco</small></div>
        </div>
      </section>
    `;

    document.querySelector("#qrGenerate").onclick = generateQR;
    document.querySelector("#qrEcc").onchange = generateQR;
    document.querySelector("#qrSize").onchange = generateQR;
    document.querySelector("#qrInput").addEventListener("input", () => {
      clearTimeout(window.__codexQrDebounce);
      window.__codexQrDebounce = setTimeout(generateQR,220);
    });

    document.querySelector("#qrDownload").onclick = downloadPNG;
    document.querySelector("#qrCopy").onclick = async () => {
      if(lastGeneratedText) try { await navigator.clipboard.writeText(lastGeneratedText); } catch {}
    };
    document.querySelector("#qrOpenGenerated").onclick = () => {
      const t = document.querySelector("#qrInput").value.trim();
      if(isUrl(t)) window.open(t,"_blank","noopener,noreferrer");
    };

    document.querySelector("#qrStartScan").onclick = startScanner;
    document.querySelector("#qrStopScan").onclick = () => {
      stopScanner();
      scanStatus("Lettura fermata.");
    };
    document.querySelector("#qrUseScanned").onclick = () => {
      if(!lastScannedText) return;
      document.querySelector("#qrInput").value = lastScannedText;
      generateQR();
      document.querySelector("#qrInput").scrollIntoView({behavior:"smooth",block:"center"});
    };
    document.querySelector("#qrCopyScanned").onclick = async () => {
      if(lastScannedText) try { await navigator.clipboard.writeText(lastScannedText); } catch {}
    };
    document.querySelector("#qrOpenScanned").onclick = () => {
      if(isUrl(lastScannedText)) window.open(lastScannedText,"_blank","noopener,noreferrer");
    };

    document.querySelector("#qrHelp").onclick = () => {
      const content = document.querySelector("#helpContent");
      const dialog = document.querySelector("#helpDialog");
      if(content && dialog) {
        content.innerHTML = helpHtml();
        dialog.showModal();
      }
    };

    generateQR();
  }

  function ensureCard() {
    if(moduleOpen) return;
    const main = document.querySelector("#main");
    if(!main || document.querySelector("[data-qr-card]")) return;

    const title = [...main.querySelectorAll(".section-title")]
      .find(x => x.textContent.toLowerCase().includes("codici e rappresentazioni"));
    const cards = title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card = document.createElement("button");
    card.className = "card";
    card.dataset.qrCard = "1";
    card.innerHTML = `
      <div class="card-icon qr-card-icon" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <h4>QR CODE</h4>
      <p>Genera QR da testo o URL e leggili con la fotocamera.</p>
      <span class="badge code">CODICE</span>
    `;
    card.onclick = renderModule;

    const ean = cards.querySelector("[data-ean13-card]");
    const ascii = cards.querySelector('[data-module="ascii"]');
    if(ean) cards.insertBefore(card,ean);
    else if(ascii) cards.insertBefore(card,ascii);
    else cards.appendChild(card);
  }

  const observer = new MutationObserver(() => {
    const main = document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#qrInput")) {
      moduleOpen = false;
      stopScanner();
    }
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pagehide",stopScanner);
  document.addEventListener("visibilitychange",()=> {
    if(document.hidden && moduleOpen) stopScanner();
  });
  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();
})();
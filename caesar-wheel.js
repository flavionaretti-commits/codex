(() => {
  "use strict";

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const STEP = 360 / 26;

  function shiftChar(ch, shift) {
    const up = ch.toUpperCase();
    const idx = ALPHABET.indexOf(up);
    if (idx < 0) return ch;
    const out = ALPHABET[(idx + shift + 26) % 26];
    return ch === ch.toLowerCase() ? out.toLowerCase() : out;
  }

  function transform(text, shift) {
    return [...text].map(ch => shiftChar(ch, shift)).join("");
  }

  function normShift(n) {
    return ((n % 26) + 26) % 26;
  }

  function angleFromEvent(ev, el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
  }

  function buildLetters(ring, radius, inner=false) {
    ring.innerHTML = "";
    for (let i=0;i<26;i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = inner ? "cw-letter cw-inner-letter" : "cw-letter cw-outer-letter";
      b.dataset.slot = String(i);
      const ang = (i * STEP - 90) * Math.PI / 180;
      b.style.setProperty("--x", (50 + Math.cos(ang) * radius) + "%");
      b.style.setProperty("--y", (50 + Math.sin(ang) * radius) + "%");
      ring.appendChild(b);
    }
  }

  function enhance() {
    const oldShift = document.querySelector("#shift");
    const oldInput = document.querySelector("#inputText");
    const workspace = oldShift && oldInput ? oldShift.closest(".workspace") : null;
    if (!workspace || workspace.dataset.caesarWheel === "1") return;
    if (!document.querySelector(".module-head h2")?.textContent.includes("Cesare")) return;

    workspace.dataset.caesarWheel = "1";

    workspace.innerHTML = `
      <section class="panel cw-panel">
        <div class="cw-mode-row">
          <button class="cw-mode encode active" id="cwEncode">CODIFICA</button>
          <button class="cw-mode decode" id="cwDecode">DECODIFICA</button>
        </div>

        <div class="cw-legend">
          <span class="encode-dot"></span><b>rosso</b> = codifica
          <span class="decode-dot"></span><b>verde</b> = decodifica
        </div>

        <div class="cw-wheel-wrap">
          <div class="cw-wheel" id="cwWheel">
            <div class="cw-ring-label cw-ring-label-outer">ALFABETO FISSO</div>
            <div class="cw-ring-label cw-ring-label-inner">RUOTA MOBILE</div>
            <div class="cw-outer-ring" id="cwOuter"></div>
            <div class="cw-inner-disc" id="cwInnerDisc">
              <div class="cw-inner-ring" id="cwInner"></div>
            </div>
            <div class="cw-center">
              <span>CHIAVE</span>
              <strong id="cwShiftValue">+3</strong>
              <small>trascina la ruota</small>
            </div>
          </div>
          <div class="cw-step-buttons">
            <button type="button" id="cwMinus" aria-label="Sposta indietro">−</button>
            <button type="button" id="cwPlus" aria-label="Sposta avanti">+</button>
          </div>
        </div>

        <div class="cw-pair" id="cwPair">
          <span class="cw-pair-source">A</span>
          <span class="cw-arrow">→</span>
          <span class="cw-pair-target">D</span>
        </div>
        <p class="cw-hint" id="cwHint">Tocca una lettera esterna oppure trascina la ruota interna.</p>

        <label class="field">Messaggio
          <textarea id="cwInput" placeholder="Scrivi qui il messaggio…">ATTACCO ALL'ALBA</textarea>
        </label>

        <div class="action-row">
          <button class="primary cw-action-encode" id="cwEncodeAction">CODIFICA →</button>
          <button class="secondary cw-action-decode" id="cwDecodeAction">← DECODIFICA</button>
          <button class="ghost" id="cwSwap">⇄ SCAMBIA</button>
        </div>
      </section>

      <section class="panel cw-result-panel">
        <h3>Risultato</h3>
        <div class="result-box cw-result" id="cwResult"></div>
        <div class="action-row">
          <button class="ghost" id="cwCopy">COPIA</button>
          <button class="ghost" id="cwClear">PULISCI</button>
        </div>
        <div class="note" id="cwNote"></div>
      </section>
    `;

    const outer = document.querySelector("#cwOuter");
    const inner = document.querySelector("#cwInner");
    const wheel = document.querySelector("#cwWheel");
    const disc = document.querySelector("#cwInnerDisc");
    const input = document.querySelector("#cwInput");
    const result = document.querySelector("#cwResult");
    const shiftValue = document.querySelector("#cwShiftValue");
    const pair = document.querySelector("#cwPair");
    const note = document.querySelector("#cwNote");

    buildLetters(outer, 43, false);
    buildLetters(inner, 33, true);

    let shift = 3;
    let mode = "encode";
    let selectedSlot = 0;
    let dragging = false;
    let startAngle = 0;
    let startShift = shift;

    function sourceAndTarget() {
      const plain = ALPHABET[selectedSlot];
      const coded = ALPHABET[(selectedSlot + shift) % 26];
      return mode === "encode"
        ? { source: plain, target: coded }
        : { source: coded, target: plain };
    }

    function renderWheel() {
      const outerLetters = outer.querySelectorAll(".cw-letter");
      const innerLetters = inner.querySelectorAll(".cw-letter");

      outerLetters.forEach((el,i) => {
        el.textContent = ALPHABET[i];
        el.classList.toggle("selected", i === selectedSlot);
      });

      innerLetters.forEach((el,i) => {
        el.textContent = ALPHABET[(i + shift) % 26];
        el.classList.toggle("selected", i === selectedSlot);
      });

      shiftValue.textContent = "+" + shift;
      disc.style.setProperty("--cw-angle", (shift * STEP) + "deg");

      document.querySelector("#cwEncode").classList.toggle("active", mode === "encode");
      document.querySelector("#cwDecode").classList.toggle("active", mode === "decode");
      workspace.classList.toggle("cw-decode-mode", mode === "decode");
      workspace.classList.toggle("cw-encode-mode", mode === "encode");

      const st = sourceAndTarget();
      pair.querySelector(".cw-pair-source").textContent = st.source;
      pair.querySelector(".cw-pair-target").textContent = st.target;
      pair.classList.toggle("decode", mode === "decode");

      note.innerHTML = mode === "encode"
        ? `Con chiave <strong>+${shift}</strong>, ${st.source} diventa <strong>${st.target}</strong>. Leggi dall’alfabeto esterno verso la ruota interna.`
        : `Con chiave <strong>+${shift}</strong>, ${st.source} torna a <strong>${st.target}</strong>. Leggi dalla ruota interna verso l’alfabeto esterno.`;

      updateResult();
    }

    function updateResult() {
      const s = mode === "encode" ? shift : -shift;
      result.textContent = transform(input.value, s);
    }

    function setShift(n, sound=true) {
      shift = normShift(n);
      renderWheel();
      if (sound && window.AudioContext) {
        try {
          const ctx = new AudioContext();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 520 + shift * 8;
          g.gain.value = .035;
          o.connect(g).connect(ctx.destination);
          o.start();
          g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .045);
          o.stop(ctx.currentTime + .05);
        } catch {}
      }
    }

    outer.querySelectorAll(".cw-letter").forEach(el => {
      el.addEventListener("click", () => {
        selectedSlot = +el.dataset.slot;
        renderWheel();
      });
    });

    inner.querySelectorAll(".cw-letter").forEach(el => {
      el.addEventListener("click", ev => {
        ev.stopPropagation();
        selectedSlot = +el.dataset.slot;
        renderWheel();
      });
    });

    disc.addEventListener("pointerdown", ev => {
      if (ev.target.closest(".cw-letter")) return;
      dragging = true;
      startAngle = angleFromEvent(ev, wheel);
      startShift = shift;
      disc.setPointerCapture?.(ev.pointerId);
      disc.classList.add("dragging");
    });

    disc.addEventListener("pointermove", ev => {
      if (!dragging) return;
      const a = angleFromEvent(ev, wheel);
      let delta = a - startAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      setShift(startShift + Math.round(delta / STEP), false);
    });

    const endDrag = ev => {
      if (!dragging) return;
      dragging = false;
      disc.releasePointerCapture?.(ev.pointerId);
      disc.classList.remove("dragging");
    };
    disc.addEventListener("pointerup", endDrag);
    disc.addEventListener("pointercancel", endDrag);

    document.querySelector("#cwMinus").onclick = () => setShift(shift - 1);
    document.querySelector("#cwPlus").onclick = () => setShift(shift + 1);

    document.querySelector("#cwEncode").onclick = () => { mode="encode"; renderWheel(); };
    document.querySelector("#cwDecode").onclick = () => { mode="decode"; renderWheel(); };
    document.querySelector("#cwEncodeAction").onclick = () => { mode="encode"; renderWheel(); };
    document.querySelector("#cwDecodeAction").onclick = () => { mode="decode"; renderWheel(); };

    document.querySelector("#cwSwap").onclick = () => {
      input.value = result.textContent;
      mode = mode === "encode" ? "decode" : "encode";
      renderWheel();
    };

    document.querySelector("#cwClear").onclick = () => {
      input.value = "";
      updateResult();
    };

    document.querySelector("#cwCopy").onclick = async () => {
      try { await navigator.clipboard.writeText(result.textContent); } catch {}
    };

    input.addEventListener("input", updateResult);
    renderWheel();
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  document.addEventListener("DOMContentLoaded", enhance);
  enhance();
})();
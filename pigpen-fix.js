(() => {
  "use strict";

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function meta(letter) {
    const idx = ALPHABET.indexOf(letter.toUpperCase());
    if (idx < 0) return null;
    if (idx < 18) {
      return { kind: "grid", pos: idx % 9, dotted: idx >= 9 };
    }
    return { kind: "x", pos: (idx - 18) % 4, dotted: idx >= 22 };
  }

  function svg(letter, cls="pig-glyph") {
    const m = meta(letter);
    if (!m) return letter;
    let lines = "";
    if (m.kind === "grid") {
      const row = Math.floor(m.pos / 3);
      const col = m.pos % 3;
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
      lines = shapes[m.pos];
    }
    const dot = m.dotted
      ? '<circle cx="18" cy="18" r="2.7" fill="currentColor" stroke="none"/>'
      : "";
    return '<svg class="' + cls + '" viewBox="0 0 36 36" aria-hidden="true">' +
      '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
      lines + '</g>' + dot + '</svg>';
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function wirePigpen() {
    const input = document.querySelector("#pigInput");
    const encoded = document.querySelector("#pigEncoded");
    const keyboard = document.querySelector("#pigKeyboard");
    const decoded = document.querySelector("#pigDecoded");

    if (!input || !encoded || !keyboard || !decoded) return;
    if (input.dataset.pigFixed === "1") return;
    input.dataset.pigFixed = "1";

    let decodedText = "";

    function updateEncoded() {
      const html = [...input.value].map(ch => {
        if (ALPHABET.includes(ch.toUpperCase())) {
          return '<span class="pig-token" title="' + escapeHtml(ch.toUpperCase()) + '">' +
            svg(ch) + '</span>';
        }
        if (ch === " ") return '<span class="pig-space" aria-label="spazio"></span>';
        if (ch === "\n") return '<span class="pig-break"></span>';
        return '<span class="pig-punct">' + escapeHtml(ch) + '</span>';
      }).join("");

      encoded.innerHTML = html ||
        '<span class="result-placeholder">Scrivi qualcosa per vedere il messaggio cifrato.</span>';
    }

    function updateDecoded() {
      decoded.textContent = decodedText;
    }

    // Rebuild keyboard explicitly so every key is wired.
    keyboard.innerHTML = [...ALPHABET].map(ch =>
      '<button class="pig-key" data-letter="' + ch + '" aria-label="Simbolo Pigpen">' +
      svg(ch, "pig-glyph key") + '</button>'
    ).join("");

    keyboard.querySelectorAll(".pig-key").forEach(btn => {
      btn.addEventListener("click", () => {
        decodedText += btn.dataset.letter;
        updateDecoded();
      });
    });

    input.addEventListener("input", updateEncoded);

    const clearEncode = document.querySelector("#pigClearEncode");
    if (clearEncode) clearEncode.onclick = () => {
      input.value = "";
      updateEncoded();
    };

    const alphabetBtn = document.querySelector("#pigAlphabetBtn");
    const alphabetPanel = document.querySelector("#pigAlphabetPanel");
    if (alphabetBtn && alphabetPanel) {
      alphabetBtn.onclick = () => {
        alphabetPanel.hidden = !alphabetPanel.hidden;
        alphabetBtn.textContent = alphabetPanel.hidden ? "MOSTRA ALFABETO" : "NASCONDI ALFABETO";
      };
    }

    const space = document.querySelector("#pigSpace");
    if (space) space.onclick = () => {
      decodedText += " ";
      updateDecoded();
    };

    const back = document.querySelector("#pigBack");
    if (back) back.onclick = () => {
      decodedText = decodedText.slice(0, -1);
      updateDecoded();
    };

    const clearDecode = document.querySelector("#pigClearDecode");
    if (clearDecode) clearDecode.onclick = () => {
      decodedText = "";
      updateDecoded();
    };

    const copy = document.querySelector("#pigCopy");
    if (copy) copy.onclick = async () => {
      try { await navigator.clipboard.writeText(decodedText); } catch {}
    };

    updateEncoded();
    updateDecoded();
  }

  const observer = new MutationObserver(wirePigpen);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", wirePigpen);
  wirePigpen();
})();
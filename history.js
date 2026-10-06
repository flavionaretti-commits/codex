(() => {
  "use strict";

  const STORIES = {
    "cifrario di cesare": {
      era:"I secolo a.C.",
      title:"Dalla Roma di Cesare",
      text:"Il cifrario prende il nome da Giulio Cesare. Svetonio racconta che Cesare usava una sostituzione alfabetica per proteggere messaggi riservati: nella forma più nota, ogni lettera viene spostata di tre posizioni. Era adatto a comunicazioni militari e politiche semplici, non a una sicurezza forte."
    },
    "atbash": {
      era:"Antichità",
      title:"Un cifrario dell’alfabeto ebraico",
      text:"Atbash nasce come sostituzione nell’alfabeto ebraico: la prima lettera viene scambiata con l’ultima, la seconda con la penultima e così via. Il nome deriva dalle coppie Alef–Tav e Bet–Shin. È tradizionalmente collegato a esempi presenti nel libro di Geremia ed è uno dei cifrari più antichi conosciuti."
    },
    "codice di somiglianza fonica": {
      era:"CODEX! · età contemporanea",
      title:"Un codice didattico moderno",
      text:"Questo non è un cifrario storico standard: è una costruzione didattica usata in CODEX! per mostrare come si possa creare una sostituzione coerente scegliendo coppie di lettere dalla sonorità o articolazione simile. Serve soprattutto per sperimentare il concetto di chiave di sostituzione."
    },
    "cifrario di vigenère": {
      era:"XVI secolo",
      title:"Il grande cifrario polialfabetico",
      text:"Il metodo oggi chiamato Vigenère deriva dal lavoro di Giovan Battista Bellaso, che nel 1553 descrisse un cifrario polialfabetico a parola chiave. Blaise de Vigenère pubblicò in seguito sistemi affini e il suo nome rimase legato al metodo. Per secoli fu considerato molto resistente e venne usato in diplomazia e comunicazioni militari."
    },
    "cifrario pigpen": {
      era:"XVIII–XIX secolo",
      title:"Griglie, simboli e società iniziatiche",
      text:"Le origini precise del Pigpen non sono certe. Vari cifrari geometrici simili compaiono tra Settecento e Ottocento e il sistema divenne particolarmente associato alla Massoneria. Le lettere vengono sostituite da frammenti di griglie e croci, con punti per distinguere una seconda serie di simboli."
    },
    "braille italiano a 6 punti": {
      era:"1820–1830",
      title:"Louis Braille e la lettura tattile",
      text:"Louis Braille sviluppò il suo sistema da adolescente, ispirandosi anche alla scrittura notturna di Charles Barbier. La prima versione fu pubblicata nel 1829 e poi perfezionata. Le celle a sei punti permisero una lettura e scrittura tattile rapida e sono alla base del Braille usato ancora oggi in tutto il mondo."
    },
    "codice morse": {
      era:"1830–1840",
      title:"Il linguaggio del telegrafo",
      text:"Il Morse nacque con il telegrafo elettrico sviluppato da Samuel Morse e Alfred Vail. Lettere e numeri venivano rappresentati da segnali brevi e lunghi trasmessi lungo i fili. Nell’Ottocento e nel Novecento diventò fondamentale per telegrafia, radio, navigazione marittima e comunicazioni d’emergenza."
    },
    "ascii": {
      era:"1963–1967",
      title:"Un alfabeto comune per i computer",
      text:"ASCII fu creato negli Stati Uniti come standard comune per rappresentare caratteri nei sistemi di telecomunicazione e nei computer. La versione classica usa 7 bit e definisce 128 codici. È diventato una base storica dell’informatica moderna e molti dei suoi valori sono conservati anche in Unicode."
    },
    "codice a barre ean-13": {
      era:"Anni 1970",
      title:"Il codice del commercio moderno",
      text:"EAN-13 nacque in Europa negli anni Settanta come evoluzione dei sistemi di identificazione a barre usati nella grande distribuzione. Le 13 cifre identificano un numero GTIN e includono una cifra di controllo. Oggi lo standard è gestito nell’ecosistema GS1 ed è diffusissimo su prodotti e confezioni."
    },
    "qr code": {
      era:"1994",
      title:"Dal controllo dei componenti alle fotocamere",
      text:"Il QR Code fu sviluppato nel 1994 da Denso Wave, in Giappone, da un gruppo guidato da Masahiro Hara. Serviva inizialmente a tracciare rapidamente componenti nella produzione automobilistica. La grande capacità, la lettura veloce e la correzione degli errori lo hanno poi reso comune per link, biglietti, pagamenti e logistica."
    },
    "macchina enigma": {
      era:"1918–1945",
      title:"La macchina cifrante della Seconda guerra mondiale",
      text:"Enigma fu progettata dopo la Prima guerra mondiale dall’ingegnere tedesco Arthur Scherbius e commercializzata negli anni Venti. Diverse versioni furono adottate dalle forze armate tedesche. Il lavoro dei crittoanalisti polacchi e, durante la guerra, di Bletchley Park contribuì in modo decisivo alla sua decifrazione."
    },
    "quadrato di polibio": {
      era:"II secolo a.C.",
      title:"Coordinate per trasmettere lettere",
      text:"Lo storico greco Polibio descrisse un sistema per rappresentare lettere mediante coordinate e trasmetterle a distanza con segnali. Il moderno quadrato 5×5 deriva da quel principio. L’unione I/J è invece un adattamento successivo necessario per far entrare l’alfabeto latino in 25 caselle."
    },
    "scitala spartana": {
      era:"Antica Grecia",
      title:"Il nastro avvolto degli Spartani",
      text:"La scitala è tradizionalmente associata a Sparta e viene descritta da autori antichi come Plutarco. Una striscia veniva avvolta attorno a un bastone e il messaggio risultava leggibile solo usando un cilindro compatibile. Gli studiosi discutono alcuni dettagli del suo uso reale, ma è diventata l’esempio classico di cifrario a trasposizione."
    },
    "playfair": {
      era:"1854",
      title:"Il cifrario a coppie di Wheatstone",
      text:"Il cifrario fu ideato nel 1854 da Charles Wheatstone e promosso da Lord Playfair, da cui prese il nome. Cifrando coppie di lettere era più resistente delle semplici sostituzioni monoalfabetiche e rimaneva pratico da usare a mano. Fu impiegato in ambito militare britannico, anche durante la guerra boera e la Prima guerra mondiale."
    }
  };

  function injectStyle() {
    if (document.querySelector("#codex-history-style")) return;
    const style = document.createElement("style");
    style.id = "codex-history-style";
    style.textContent =
      ".module-actions{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}" +
      ".history-btn{white-space:nowrap}" +
      ".history-sheet{padding-right:6px}" +
      ".history-era{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;padding:6px 10px;border-radius:999px;background:var(--panel-2);color:var(--accent);font-size:11px;font-weight:900;letter-spacing:.04em}" +
      ".history-sheet h2{margin:0 0 12px}" +
      ".history-sheet p{font-size:16px;line-height:1.62;color:var(--muted);margin:0}" +
      ".history-note{margin-top:16px;padding:11px 13px;border-left:4px solid var(--accent);border-radius:10px;background:var(--panel-2);color:var(--muted);font-size:12px}" +
      "@media(max-width:620px){.module-actions{width:100%;justify-content:flex-start}.module-actions .help-btn{flex:1 1 auto}}";
    document.head.appendChild(style);
  }

  function ensureDialog() {
    let dialog = document.querySelector("#historyDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "historyDialog";
    dialog.className = "modal modal-wide";
    dialog.innerHTML = '<button class="modal-close" type="button" aria-label="Chiudi">×</button><div id="historyContent"></div>';
    document.body.appendChild(dialog);
    dialog.querySelector(".modal-close").onclick = () => dialog.close();
    dialog.addEventListener("click", ev => {
      if (ev.target === dialog) dialog.close();
    });
    return dialog;
  }

  function normalizeTitle(text) {
    return String(text || "").trim().toLocaleLowerCase("it");
  }

  function addHistoryButton() {
    const header = document.querySelector(".module-head");
    const heading = header && header.querySelector("h2");
    if (!header || !heading) return;

    const story = STORIES[normalizeTitle(heading.textContent)];
    if (!story || header.querySelector(".history-btn")) return;

    let actions = header.querySelector(".module-actions");
    const help = header.querySelector(".help-btn");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "module-actions";
      if (help) {
        help.replaceWith(actions);
        actions.appendChild(help);
      } else {
        header.appendChild(actions);
      }
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "help-btn history-btn";
    btn.textContent = "◷ STORIA";
    btn.onclick = () => {
      const dialog = ensureDialog();
      const content = dialog.querySelector("#historyContent");
      content.innerHTML =
        '<div class="history-sheet">' +
        '<div class="history-era">◷ ' + story.era + '</div>' +
        '<h2>' + story.title + '</h2>' +
        '<p>' + story.text + '</p>' +
        '<div class="history-note">Scheda storica sintetica: contesto essenziale, senza appesantire il modulo.</div>' +
        '</div>';
      dialog.showModal();
    };
    actions.appendChild(btn);
  }

  injectStyle();
  ensureDialog();

  const observer = new MutationObserver(addHistoryButton);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("DOMContentLoaded",addHistoryButton);
  addHistoryButton();
})();
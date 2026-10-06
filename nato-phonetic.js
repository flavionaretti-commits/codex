(() => {
  "use strict";

  const NATO = {
    A:"Alfa", B:"Bravo", C:"Charlie", D:"Delta", E:"Echo", F:"Foxtrot",
    G:"Golf", H:"Hotel", I:"India", J:"Juliett", K:"Kilo", L:"Lima",
    M:"Mike", N:"November", O:"Oscar", P:"Papa", Q:"Quebec", R:"Romeo",
    S:"Sierra", T:"Tango", U:"Uniform", V:"Victor", W:"Whiskey",
    X:"X-ray", Y:"Yankee", Z:"Zulu"
  };

  const PRON = {
    A:"AL FAH", B:"BRAH VOH", C:"CHAR LEE", D:"DELL TAH", E:"ECK OH",
    F:"FOKS TROT", G:"GOLF", H:"HO TELL", I:"IN DEE AH", J:"JEW LEE ETT",
    K:"KEY LOH", L:"LEE MAH", M:"MIKE", N:"NO VEM BER", O:"OSS CAH",
    P:"PAH PAH", Q:"KEH BECK", R:"ROW ME OH", S:"SEE AIR RAH",
    T:"TANG GO", U:"YOU NEE FORM", V:"VIK TAH", W:"WISS KEY",
    X:"ECKS RAY", Y:"YANG KEY", Z:"ZOO LOO"
  };

  const DIGITS = {
    "0":"ZE-RO","1":"WUN","2":"TOO","3":"TREE","4":"FOW-er",
    "5":"FIFE","6":"SIX","7":"SEV-en","8":"AIT","9":"NIN-er"
  };

  const NATO_REVERSE = Object.fromEntries(
    Object.entries(NATO).map(([letter,word]) => [word.toUpperCase().replace(/[^A-Z]/g,""),letter])
  );
  NATO_REVERSE.ALPHA = "A";
  NATO_REVERSE.JULIET = "J";
  NATO_REVERSE.XRAY = "X";

  const DIGIT_REVERSE = {};
  Object.entries(DIGITS).forEach(([digit,word])=>{
    DIGIT_REVERSE[word.toUpperCase().replace(/[^A-Z]/g,"")] = digit;
  });
  Object.assign(DIGIT_REVERSE,{
    ZERO:"0",ONE:"1",TWO:"2",THREE:"3",FOUR:"4",FIVE:"5",
    SEVEN:"7",EIGHT:"8",NINE:"9"
  });

  let moduleOpen=false;
  let speaking=false;

  function injectStyle(){
    if(document.querySelector("#nato-style")) return;
    const s=document.createElement("style");
    s.id="nato-style";
    s.textContent=
      ".nato-card-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:2px solid currentColor;font:900 13px/1 monospace;letter-spacing:.03em}"+
      ".nato-workspace{grid-template-columns:minmax(0,1fr) minmax(320px,.95fr)}"+
      ".nato-output{min-height:115px;font:800 18px/1.65 monospace;overflow-wrap:anywhere}"+
      ".nato-output .slash{color:var(--muted);padding:0 4px}"+
      ".nato-token{display:inline-block;padding:4px 7px;margin:3px;border-radius:8px;background:var(--panel-2);border:1px solid var(--line)}"+
      ".nato-token.active{background:var(--accent);color:#fff;border-color:var(--accent)}"+
      ".nato-controls{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}"+
      ".nato-speed{min-width:140px}"+
      ".nato-reference{margin-top:18px}"+
      ".nato-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px;margin-top:12px}"+
      ".nato-item{border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);padding:10px;display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;text-align:left;cursor:pointer}"+
      ".nato-item:hover,.nato-item.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--bg))}"+
      ".nato-letter{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--panel-2);font:900 15px/1 Georgia,serif}"+
      ".nato-word strong{display:block;font-size:13px}.nato-word small{display:block;color:var(--muted);font-size:9px;margin-top:3px;letter-spacing:.04em}"+
      ".nato-speaker{font-size:14px;color:var(--muted)}"+
      ".nato-decode-title{margin-top:24px!important}"+
      ".nato-radio-note{margin-top:18px}"+
      ".nato-digit-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:10px}"+
      ".nato-digit{padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--bg);text-align:center}"+
      ".nato-digit b{display:block;font:900 16px/1 monospace}.nato-digit span{display:block;color:var(--muted);font:800 10px/1 monospace;margin-top:5px}"+
      "@media(max-width:900px){.nato-workspace{grid-template-columns:1fr}.nato-grid{grid-template-columns:repeat(3,minmax(140px,1fr))}}"+
      "@media(max-width:620px){.nato-grid{grid-template-columns:repeat(2,minmax(130px,1fr))}.nato-digit-grid{grid-template-columns:repeat(2,1fr)}}";
    document.head.appendChild(s);
  }

  function encode(text){
    const tokens=[];
    for(const ch of String(text||"")){
      if(/[A-Za-z]/.test(ch)){
        tokens.push({type:"letter",char:ch.toUpperCase(),word:NATO[ch.toUpperCase()]});
      }else if(/[0-9]/.test(ch)){
        tokens.push({type:"digit",char:ch,word:DIGITS[ch]});
      }else if(/\s/.test(ch)){
        if(tokens.length && tokens.at(-1)?.type!=="space") tokens.push({type:"space",word:"/"});
      }else if(ch.trim()){
        tokens.push({type:"punct",char:ch,word:ch});
      }
    }
    while(tokens.at(-1)?.type==="space") tokens.pop();
    return tokens;
  }

  function decode(text){
    const raw=String(text||"").trim();
    if(!raw) return {text:"",bad:[]};
    const parts=raw.replace(/\//g," / ").split(/\s+/).filter(Boolean);
    let out="";
    const bad=[];
    for(const p of parts){
      if(p==="/"){
        if(out && !out.endsWith(" ")) out+=" ";
        continue;
      }
      const key=p.toUpperCase().replace(/[^A-Z]/g,"");
      if(NATO_REVERSE[key]) out+=NATO_REVERSE[key];
      else if(DIGIT_REVERSE[key]) out+=DIGIT_REVERSE[key];
      else if(p.length===1 && /[^A-Za-z0-9]/.test(p)) out+=p;
      else bad.push(p);
    }
    return {text:out.trim(),bad};
  }

  function esc(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function speakWord(word,button){
    if(!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    document.querySelectorAll(".nato-item").forEach(x=>x.classList.remove("active"));
    button?.classList.add("active");
    const u=new SpeechSynthesisUtterance(word.replace(/-/g," "));
    u.lang="en";
    u.rate=.78;
    u.onend=()=>button?.classList.remove("active");
    u.onerror=()=>button?.classList.remove("active");
    window.speechSynthesis.speak(u);
  }

  function speakSequence(tokens){
    if(!("speechSynthesis" in window) || speaking) return;
    const words=tokens.filter(t=>t.type==="letter"||t.type==="digit");
    if(!words.length) return;
    speaking=true;
    let i=0;

    function next(){
      if(i>=words.length){
        speaking=false;
        document.querySelectorAll(".nato-token").forEach(x=>x.classList.remove("active"));
        return;
      }
      const tok=words[i++];
      document.querySelectorAll(".nato-token").forEach(x=>x.classList.remove("active"));
      const el=document.querySelector('.nato-token[data-seq="'+(i-1)+'"]');
      el?.classList.add("active");

      const u=new SpeechSynthesisUtterance(tok.word.replace(/-/g," "));
      u.lang="en";
      const speed=document.querySelector("#natoSpeed")?.value || "0.82";
      u.rate=+speed;
      u.onend=next;
      u.onerror=next;
      window.speechSynthesis.speak(u);
    }

    window.speechSynthesis.cancel();
    next();
  }

  function helpHtml(){
    return '<h2>Alfabeto fonetico NATO</h2>'+
      '<p>È un <strong>alfabeto di spelling radiotelefonico</strong>: ogni lettera viene sostituita da una parola facilmente distinguibile anche con rumore, interferenze o accenti diversi.</p>'+
      '<p>Esempio: <strong>CAT → Charlie Alfa Tango</strong>.</p>'+
      '<p>Non è un cifrario segreto: serve a ridurre gli errori quando si devono comunicare lettere, sigle, nomi, targhe, nominativi o coordinate.</p>'+
      '<p>Le forme ufficiali includono <strong>Alfa</strong> con F, <strong>Juliett</strong> con due T e <strong>X-ray</strong>.</p>'+
      '<p>CODEX! mostra anche le pronunce radiotelefoniche dei numeri, dove 3 diventa TREE, 5 FIFE e 9 NIN-er.</p>';
  }

  function renderModule(){
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    const reference=Object.entries(NATO).map(([letter,word])=>
      '<button type="button" class="nato-item" data-letter="'+letter+'" data-word="'+word+'">'+
      '<span class="nato-letter">'+letter+'</span>'+
      '<span class="nato-word"><strong>'+word+'</strong><small>'+PRON[letter]+'</small></span>'+
      '<span class="nato-speaker">🔊</span></button>'
    ).join("");

    const digits=Object.entries(DIGITS).map(([digit,word])=>
      '<div class="nato-digit"><b>'+digit+'</b><span>'+word+'</span></div>'
    ).join("");

    main.innerHTML=
      '<div class="module-head"><div>'+
      '<div class="eyebrow">Codice e rappresentazione · radiotelefonia</div>'+
      '<h2>Alfabeto fonetico NATO</h2>'+
      '<p>Trasforma lettere e sigle nelle parole standard Alfa, Bravo, Charlie…</p>'+
      '</div><button class="help-btn" id="natoHelp">? COME FUNZIONA</button></div>'+

      '<div class="workspace nato-workspace">'+
        '<section class="panel"><h3>Testo → NATO</h3>'+
          '<label class="field">Testo o sigla<textarea id="natoInput" placeholder="Scrivi qui…">NATO 1956</textarea></label>'+
          '<div class="result-box nato-output" id="natoOutput"></div>'+
          '<div class="nato-controls">'+
            '<button class="primary" id="natoListen">🔊 ASCOLTA</button>'+
            '<select class="nato-speed" id="natoSpeed"><option value=".65">LENTO</option><option value=".82" selected>NORMALE</option><option value="1">VELOCE</option></select>'+
            '<button class="ghost" id="natoCopy">COPIA</button>'+
            '<button class="ghost" id="natoClear">PULISCI</button>'+
          '</div>'+
          '<div class="note">Spazi tra parole → / · lettere → parole NATO · cifre → pronuncia radio ICAO.</div>'+
        '</section>'+

        '<section class="panel"><h3>NATO → testo</h3>'+
          '<label class="field">Parole radio<textarea id="natoDecode" spellcheck="false" placeholder="November Alfa Tango Oscar / WUN NIN-er FIFE SIX"></textarea></label>'+
          '<div class="result-box nato-output" id="natoDecoded"></div>'+
          '<div class="nato-controls">'+
            '<button class="ghost" id="natoUse">USA IL RISULTATO</button>'+
            '<button class="ghost" id="natoCopyDecoded">COPIA</button>'+
            '<button class="ghost" id="natoClearDecoded">PULISCI</button>'+
          '</div>'+
          '<div class="nato-radio-note" id="natoDecodeNote"></div>'+
        '</section>'+
      '</div>'+

      '<section class="panel nato-reference">'+
        '<h3>Alfabeto ufficiale A–Z</h3>'+
        '<div class="nato-grid" id="natoGrid">'+reference+'</div>'+
        '<div class="note">Tocca una parola per ascoltarla. La pronuncia scritta sotto segue la convenzione radiotelefonica ICAO in forma semplificata.</div>'+
      '</section>'+

      '<section class="panel nato-reference">'+
        '<h3>Numeri in radiotelefonia</h3>'+
        '<div class="nato-digit-grid">'+digits+'</div>'+
      '</section>';

    const input=document.querySelector("#natoInput");
    const output=document.querySelector("#natoOutput");
    const decodeInput=document.querySelector("#natoDecode");
    const decoded=document.querySelector("#natoDecoded");
    const note=document.querySelector("#natoDecodeNote");

    let currentTokens=[];

    function updateEncode(){
      currentTokens=encode(input.value);
      let seq=0;
      output.innerHTML=currentTokens.length ? currentTokens.map(t=>{
        if(t.type==="space") return '<span class="slash">/</span>';
        if(t.type==="letter"||t.type==="digit"){
          return '<span class="nato-token" data-seq="'+(seq++)+'">'+esc(t.word)+'</span>';
        }
        return '<span class="nato-token">'+esc(t.word)+'</span>';
      }).join(" ") : '<span class="result-placeholder">Scrivi qualcosa da sillabare.</span>';
    }

    function updateDecode(){
      const res=decode(decodeInput.value);
      decoded.textContent=res.text;
      if(!res.text) decoded.innerHTML='<span class="result-placeholder">Inserisci parole NATO per ricostruire il testo.</span>';
      note.className="nato-radio-note"+(res.bad.length?" note":"");
      note.textContent=res.bad.length ? "Parole non riconosciute: "+res.bad.join(", ") : "";
    }

    input.addEventListener("input",updateEncode);
    decodeInput.addEventListener("input",updateDecode);

    document.querySelector("#natoListen").onclick=()=>speakSequence(currentTokens);
    document.querySelector("#natoCopy").onclick=async()=>{
      const value=currentTokens.map(t=>t.word).join(" ");
      if(value) try{await navigator.clipboard.writeText(value);}catch{}
    };
    document.querySelector("#natoClear").onclick=()=>{input.value="";updateEncode();};

    document.querySelector("#natoUse").onclick=()=>{
      const res=decode(decodeInput.value);
      input.value=res.text;
      updateEncode();
      input.scrollIntoView({behavior:"smooth",block:"center"});
    };
    document.querySelector("#natoCopyDecoded").onclick=async()=>{
      const res=decode(decodeInput.value).text;
      if(res) try{await navigator.clipboard.writeText(res);}catch{}
    };
    document.querySelector("#natoClearDecoded").onclick=()=>{decodeInput.value="";updateDecode();};

    document.querySelectorAll(".nato-item").forEach(btn=>{
      btn.onclick=()=>speakWord(btn.dataset.word,btn);
    });

    document.querySelector("#natoHelp").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    updateEncode();
    updateDecode();
  }

  function ensureCard(){
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main || document.querySelector("[data-nato-card]")) return;

    const title=[...main.querySelectorAll(".section-title")]
      .find(x=>x.textContent.toLowerCase().includes("codici e rappresentazioni"));
    const cards=title?.nextElementSibling;
    if(!cards || !cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.natoCard="1";
    card.innerHTML=
      '<div class="card-icon nato-card-icon" aria-hidden="true">A→ALFA</div>'+
      '<h4>NATO</h4>'+
      '<p>Sillaba lettere e sigle con Alfa, Bravo, Charlie e ascolta la trasmissione.</p>'+
      '<span class="badge code">CODICE</span>';
    card.onclick=renderModule;

    const morse=cards.querySelector('[data-module="morse"]');
    if(morse) morse.insertAdjacentElement("afterend",card);
    else cards.prepend(card);
  }

  injectStyle();

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen && main && !document.querySelector("#natoInput")){
      moduleOpen=false;
      try{window.speechSynthesis?.cancel();}catch{}
      speaking=false;
    }
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();
})();
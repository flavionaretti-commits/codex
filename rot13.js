(() => {
  "use strict";

  const A="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let moduleOpen=false;

  function rot13(text){
    return [...String(text||"")].map(ch=>{
      const up=ch.toUpperCase();
      const i=A.indexOf(up);
      if(i<0) return ch;
      const out=A[(i+13)%26];
      return ch===ch.toLowerCase()?out.toLowerCase():out;
    }).join("");
  }

  function injectStyle(){
    if(document.querySelector("#rot13-style")) return;
    const s=document.createElement("style");
    s.id="rot13-style";
    s.textContent=
      ".r13-card-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:2px solid currentColor;font:900 18px/1 Georgia,serif}"+
      ".r13-workspace{grid-template-columns:minmax(0,1fr) minmax(320px,.9fr)}"+
      ".r13-badge{width:86px;height:86px;margin:4px auto 16px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:white;font:900 22px/1 Georgia,serif}"+
      ".r13-map{display:grid;grid-template-columns:repeat(7,minmax(52px,1fr));gap:7px;margin:12px 0 16px}"+
      ".r13-pair{min-height:54px;border:1px solid var(--line);border-radius:11px;background:var(--bg);color:var(--ink);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:4px;cursor:pointer;padding:7px}"+
      ".r13-pair span{font:900 16px/1 monospace}.r13-pair b{color:var(--accent);font-size:12px}"+
      ".r13-pair:hover,.r13-pair.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--bg))}"+
      ".r13-result{min-height:130px;font:900 21px/1.5 monospace;overflow-wrap:anywhere}"+
      ".r13-proof{margin-top:14px;padding:12px 13px;border-radius:12px;background:var(--panel-2);color:var(--muted);font-size:12px;line-height:1.45;overflow-wrap:anywhere}"+
      ".r13-proof strong{color:var(--ink)}.r13-proof span{font-family:monospace;color:var(--accent)}"+
      ".r13-why{margin-top:18px;text-align:center}.r13-circle{display:flex;align-items:center;justify-content:center;gap:12px;margin:16px 0}"+
      ".r13-circle div{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--panel-2);border:1px solid var(--line);font:900 26px/1 Georgia,serif}"+
      ".r13-circle span{font:900 12px/1 monospace;color:var(--accent)}.r13-why p{color:var(--muted);font-size:13px}"+
      "@media(max-width:860px){.r13-workspace{grid-template-columns:1fr}}"+
      "@media(max-width:620px){.r13-map{grid-template-columns:repeat(4,minmax(58px,1fr))}.r13-circle{gap:7px}.r13-circle div{width:54px;height:54px}}";
    document.head.appendChild(s);
  }

  function mapHtml(){
    let html="";
    for(let i=0;i<13;i++){
      html+='<button type="button" class="r13-pair"><span>'+A[i]+'</span><b>↔</b><span>'+A[i+13]+'</span></button>';
    }
    return html;
  }

  function helpHtml(){
    return '<h2>ROT13</h2>'+
      '<p>ROT13 è un caso particolare del cifrario di Cesare: ogni lettera viene spostata di <strong>13 posizioni</strong>.</p>'+
      '<p>Poiché l’alfabeto ha 26 lettere, 13 è esattamente metà giro. Per questo <strong>la stessa operazione cifra e decifra</strong>.</p>'+
      '<p>Esempio: <strong>A ↔ N</strong>, <strong>B ↔ O</strong>, <strong>C ↔ P</strong>.</p>'+
      '<p>Spazi, numeri e punteggiatura restano invariati. Applicando ROT13 due volte si torna sempre al testo originale.</p>';
  }

  function renderModule(){
    moduleOpen=true;
    const main=document.querySelector("#main");
    if(!main) return;

    main.innerHTML=
      '<div class="module-head"><div>'+
      '<div class="eyebrow">Codice segreto · Cesare a chiave fissa</div>'+
      '<h2>ROT13</h2>'+
      '<p>Uno spostamento di 13 lettere: la stessa operazione cifra e decifra.</p>'+
      '</div><button class="help-btn" id="r13Help">? COME FUNZIONA</button></div>'+
      '<div class="workspace r13-workspace">'+
        '<section class="panel"><h3>Testo</h3>'+
          '<label class="field">Messaggio<textarea id="r13Input" placeholder="Scrivi qui il messaggio…">MESSAGGIO SEGRETO</textarea></label>'+
          '<div class="r13-badge">ROT +13</div>'+
          '<div class="r13-map" id="r13Map">'+mapHtml()+'</div>'+
          '<div class="note">ROT13 è involutivo: applicarlo due volte equivale a non aver fatto nulla.</div>'+
        '</section>'+
        '<section class="panel"><h3>Risultato</h3>'+
          '<div class="result-box r13-result" id="r13Result"></div>'+
          '<div class="action-row">'+
            '<button class="primary" id="r13Again">APPLICA DI NUOVO</button>'+
            '<button class="ghost" id="r13Use">USA COME INGRESSO</button>'+
            '<button class="ghost" id="r13Copy">COPIA</button>'+
            '<button class="ghost" id="r13Clear">PULISCI</button>'+
          '</div>'+
          '<div class="r13-proof" id="r13Proof"></div>'+
        '</section>'+
      '</div>'+
      '<section class="panel r13-why"><h3>Perché funziona due volte?</h3>'+
        '<div class="r13-circle"><div>A</div><span>+13</span><div>N</div><span>+13</span><div>A</div></div>'+
        '<p>13 + 13 = 26: dopo due applicazioni si compie un giro completo dell’alfabeto.</p>'+
      '</section>';

    const input=document.querySelector("#r13Input");
    const result=document.querySelector("#r13Result");
    const proof=document.querySelector("#r13Proof");

    function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
    function update(){
      const out=rot13(input.value);
      result.textContent=out;
      if(!out){
        result.innerHTML='<span class="result-placeholder">Scrivi qualcosa per applicare ROT13.</span>';
        proof.textContent="";
      }else{
        proof.innerHTML='<strong>Controllo:</strong> applicando ancora ROT13 → <span>'+esc(rot13(out))+'</span>';
      }
    }

    document.querySelectorAll(".r13-pair").forEach(btn=>{
      btn.onclick=()=>{
        document.querySelectorAll(".r13-pair").forEach(x=>x.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    input.addEventListener("input",update);

    document.querySelector("#r13Again").onclick=()=>{
      input.value=result.textContent;
      update();
    };
    document.querySelector("#r13Use").onclick=()=>{
      input.value=result.textContent;
      update();
      input.focus();
    };
    document.querySelector("#r13Copy").onclick=async()=>{
      const out=rot13(input.value);
      if(out) try{await navigator.clipboard.writeText(out);}catch{}
    };
    document.querySelector("#r13Clear").onclick=()=>{input.value="";update();};

    document.querySelector("#r13Help").onclick=()=>{
      const content=document.querySelector("#helpContent");
      const dialog=document.querySelector("#helpDialog");
      if(content&&dialog){content.innerHTML=helpHtml();dialog.showModal();}
    };

    update();
  }

  function ensureCard(){
    if(moduleOpen) return;
    const main=document.querySelector("#main");
    if(!main||document.querySelector("[data-rot13-card]")) return;

    const title=[...main.querySelectorAll(".section-title")].find(x=>x.textContent.toLowerCase().includes("codici segreti"));
    const cards=title?.nextElementSibling;
    if(!cards||!cards.classList.contains("cards")) return;

    const card=document.createElement("button");
    card.className="card";
    card.dataset.rot13Card="1";
    card.innerHTML=
      '<div class="card-icon r13-card-icon" aria-hidden="true">13</div>'+
      '<h4>ROT13</h4>'+
      '<p>Il Cesare a spostamento fisso di 13 lettere: cifra e decifra con la stessa operazione.</p>'+
      '<span class="badge secret">CODICE SEGRETO</span>';
    card.onclick=renderModule;

    const caesar=cards.querySelector('[data-module="caesar"]');
    if(caesar) caesar.insertAdjacentElement("afterend",card);
    else cards.prepend(card);
  }

  injectStyle();

  const observer=new MutationObserver(()=>{
    const main=document.querySelector("#main");
    if(moduleOpen&&main&&!document.querySelector("#r13Input")) moduleOpen=false;
    ensureCard();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",ensureCard);
  ensureCard();
})();
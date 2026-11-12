/* ===== صفحات الخطط التعريفية =====
 * #plans       : تعريف بكل خطط المدرسة (المسؤول، عدد البرامج، الإنجاز، ملف الخطة)
 * #plan-<id>   : صفحة خطة واحدة: تعريفها وملفها PDF وبرامجها
 * ملف الخطة يُرفع من نموذج «إضافة خطة / تعديل الخطة» ويُحفظ مع بيانات الخطة.
 */
(function(){
'use strict';
const PDFI='<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 16.5v-4h1.2a1.2 1.2 0 0 1 0 2.4H8.5M12.5 12.5v4h.8a2 2 0 0 0 0-4zM16.5 16.5v-4H18M16.5 14.5h1.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
const DLI='<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const EYEI='<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

const editor=()=>typeof canAdd==='function'&&canAdd()&&typeof window.CD_planDialog==='function';
const progsOf=pl=>P.filter(p=>String(p.plan_id)===String(pl.id));
const ownerName=pl=>{const n=(pl.owner||'').trim();return n&&!/^[—\-–]+$/.test(n)?n:''};
const av=(n,s)=>window.CD_avatar?window.CD_avatar(n,s):'';
const size=b=>!b?'':b<1024*1024?Math.max(1,Math.round(b/1024))+' ك.ب':(b/1024/1024).toFixed(1)+' م.ب';
const dlUrl=pdf=>pdf.url+(pdf.url.includes('?')?'&':'?')+'download='+encodeURIComponent(pdf.name||'ملف الخطة.pdf');
const progsWord=n=>n===0?'لا برامج':n===1?'برنامج واحد':n===2?'برنامجان':n<=10?fmt(n)+' برامج':fmt(n)+' برنامجًا';
function sums(pl){const l=progsOf(pl),d=l.filter(p=>stat(p)==='مكتمل').length;const r=l.length?Math.round(d/l.length*100):0;
  const doms=[...new Set(l.map(p=>p.domain).filter(Boolean))];
  const ws=l.flatMap(p=>p.weeks||[]).filter(x=>x!=null);return {l,d,r,doms,w0:ws.length?Math.min(...ws):null,w1:ws.length?Math.max(...ws):null}}
const splitName=n=>{const w=String(n||'').trim().split(/\s+/);return w.length>1?[w[0],w.slice(1).join(' ')]:['',w[0]||'']};

const docArt=()=>`<div class="pln-art"><div class="pln-doc"><i class="h"></i><i></i><i></i><i class="s"></i><i></i><i class="s"></i><span class="pln-tag">PDF</span></div><div class="pln-doc b"><i class="h"></i><i></i><i class="s"></i><i></i></div><span class="pln-ok">${ic('check')}</span></div>`;

function ownerBox(pl,big){const n=ownerName(pl);
  if(!n)return `<span class="pln-own none">${ic('user')}<span><small>المسؤول عن الخطة</small><b>لم يُحدَّد بعد</b></span></span>`;
  const r=window.CD_role?window.CD_role(n):'';
  return `<span class="pln-own">${av(n,big?52:40)||ic('user')}<span><small>المسؤول عن الخطة</small><b>${esc(n)}</b>${r?`<em>${esc(r)}</em>`:''}</span></span>`}

function planCard(pl){const s=sums(pl),pdf=pl.pdf&&pl.pdf.url?pl.pdf:null;
  return `<article class="pln-c" style="${C(PC(pl.id))}">
   <a class="pln-top" href="#plan-${esc(pl.id)}"><i>${ic('plan')}</i><span><b>${esc(pl.name)}</b><small>${esc(pl.year||'1448هـ')}</small></span></a>
   <p class="pln-d">${esc(pl.desc||'خطة من خطط مدرسة لبيد بن ربيعة المتوسطة للعام الدراسي 1448هـ.')}</p>
   ${ownerBox(pl)}
   <div class="pln-n"><span><b>${fmt(s.l.length)}</b><small>برنامج</small></span><span><b>${fmt(s.d)}</b><small>مكتمل</small></span><span><b>${s.r}%</b><small>الإنجاز</small></span></div>
   <div class="bar"><span style="width:${s.r}%"></span></div>
   <div class="pln-f"><a class="btn soft" href="#plan-${esc(pl.id)}">${ic('arrow')} صفحة الخطة</a>${pdf?`<a class="btn pln-pdfb" href="${esc(pdf.url)}" target="_blank" rel="noopener">${PDFI} ملف الخطة</a>`:'<span class="muted small">لم يُرفق ملف الخطة</span>'}</div>
  </article>`}

function plansIndex(){
  const tot=PL.reduce((a,pl)=>a+progsOf(pl).length,0),files=PL.filter(pl=>pl.pdf&&pl.pdf.url).length;
  return pgHero({chip:`${ic('plan')} العام الدراسي 1448هـ`,t1:'خطط',t2:'المدرسة',desc:'تعريف بكل خطة من خطط المدرسة: هدفها والمسؤول عنها وعدد برامجها ونسبة إنجازها، مع ملف الخطة المعتمد للاطلاع والتنزيل.',art:docArt(),float:pgChipCard(fmt(PL.length),'خطط معتمدة',`${progsWord(tot)} • ${fmt(files)} ملف مرفق`)})+
   `<div class="sec pln-sec"><h2>الخطط <span class="muted">(${fmt(PL.length)})</span></h2>${editor()?`<button class="btn pri" type="button" id="pln-add">${ic('plus')} إضافة خطة</button>`:''}</div>
   ${PL.length?`<div class="pln-grid">${PL.map(planCard).join('')}</div>`:'<div class="empty">لا توجد خطط بعد.</div>'}`}

function planPage(id){const pl=PL.find(x=>String(x.id)===String(id));
  if(!pl)return `<div class="empty">الخطة غير موجودة. <a href="#plans">عرض كل الخطط</a></div>`;
  const s=sums(pl),pdf=pl.pdf&&pl.pdf.url?pl.pdf:null,[t1,t2]=splitName(pl.name),page='plan-'+pl.id,ed=editor();
  const facts=[[ic('layers'),'عدد البرامج',progsWord(s.l.length)],[ic('check'),'البرامج المكتملة',`${fmt(s.d)} من ${fmt(s.l.length)}`],[ic('chart'),'نسبة الإنجاز',s.r+'%'],[ic('target'),'المجالات',s.doms.length?fmt(s.doms.length)+' مجالات':'—'],[ic('cal'),'فترة التنفيذ',s.w0!=null?(s.w0===s.w1?`الأسبوع ${s.w0}`:`الأسابيع ${s.w0} – ${s.w1}`):'—'],[ic('clock'),'العام الدراسي',esc(pl.year||'1448هـ')]];
  const list=fsxApply(s.l.slice().sort((a,b)=>(a.weeks[0]||99)-(b.weeks[0]||99)||String(a.code).localeCompare(String(b.code))),page);
  return pgHero({chip:`${ic('plan')} خطة • ${esc(pl.year||'1448هـ')}`,t1,t2,desc:esc(pl.desc||'خطة من خطط مدرسة لبيد بن ربيعة المتوسطة للعام الدراسي 1448هـ.'),
     extra:`<div class="pln-hx"><a class="btn" href="#plans">→ كل الخطط</a>${pdf?`<a class="btn pri" href="${esc(pdf.url)}" target="_blank" rel="noopener">${PDFI} ملف الخطة</a>`:''}${ed?`<button class="btn" type="button" data-pln-edit="${esc(pl.id)}">${ic('edit')} تعديل الخطة</button>`:''}</div>`,
     art:docArt(),float:pgChipCard(s.r+'%','نسبة الإنجاز',`${fmt(s.d)} من ${fmt(s.l.length)} مكتمل`)})+
  `<section class="pln-info" style="${C(PC(pl.id))}">${ownerBox(pl,true)}<div class="pln-facts">${facts.map(([i,l,v])=>`<div><i>${i}</i><span><small>${l}</small><b>${v}</b></span></div>`).join('')}</div></section>
  <section class="pln-file" style="${C(PC(pl.id))}">
   ${pdf?`<div class="rpv-bar"><span class="rpv-t">${PDFI} ملف الخطة: <bdi>${esc(pdf.name||'ملف الخطة.pdf')}</bdi></span><span class="rpv-a"><a class="btn pri" href="${esc(pdf.url)}" target="_blank" rel="noopener">${EYEI} فتح في نافذة جديدة</a><a class="btn" href="${esc(dlUrl(pdf))}">${DLI} تنزيل PDF</a>${ed?`<button class="btn" type="button" data-pln-edit="${esc(pl.id)}">${ic('edit')} استبدال</button>`:''}</span></div>
     <p class="rpv-hint" id="pln-hint">${[size(pdf.size),pdf.at?'أُرفق '+dmy(pdf.at.slice(0,10)):''].filter(Boolean).join(' • ')}</p>
     <div class="rpv-wrap pln-pv"><div class="pln-pages" id="pln-pages" data-url="${esc(pdf.url)}"><div class="pln-load"><span class="pln-spin"></span>جارٍ تحميل ملف الخطة…</div></div></div>`
    :`<div class="sec"><h2>${PDFI} ملف الخطة</h2></div><div class="pln-none">${PDFI}<b>لم يُرفق ملف الخطة بعد</b><span class="muted small">${ed?'أرفق ملف الخطة بصيغة PDF ليطّلع عليه الجميع ويُنزّلوه.':'سيظهر ملف الخطة هنا فور إرفاقه.'}</span>${ed?`<button class="btn pri" type="button" data-pln-edit="${esc(pl.id)}">${ic('plus')} إرفاق ملف الخطة</button>`:''}</div>`}
  </section>
  ${s.l.length?kpiRow(s.l,page)+viewBar(`<h2>برامج الخطة <span class="muted">(${fmt(list.length)})</span></h2>`)+(list.length?progBlock(list):'<div class="empty">لا توجد برامج بهذه الحالة في الخطة.</div>'):'<div class="empty">لا توجد برامج في هذه الخطة بعد.</div>'}`}

/* ---------- عرض ملف الخطة صفحاتٍ مثل معاينة التقرير (pdf.js محلي) ---------- */
let LIB=null;const DOCS=new Map();
function pdfLib(){if(!LIB){const base=new URL('assets/pdfjs/',document.baseURI).href;LIB=import(base+'pdf.min.mjs').then(m=>{m.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';return m})}return LIB}
async function renderPdf(box){const url=box.dataset.url;
  try{const lib=await pdfLib();if(!DOCS.has(url))DOCS.set(url,lib.getDocument({url}).promise);const doc=await DOCS.get(url);
    if(!box.isConnected)return;const hint=document.getElementById('pln-hint');
    if(hint&&!hint.dataset.n){hint.dataset.n=1;hint.textContent=[hint.textContent,doc.numPages===1?'صفحة واحدة':doc.numPages===2?'صفحتان':fmt(doc.numPages)+' صفحات'].filter(Boolean).join(' • ')}
    box.innerHTML='';const dpr=Math.min(2,window.devicePixelRatio||1),maxW=Math.min(794,box.parentElement.clientWidth-24);
    for(let n=1;n<=doc.numPages;n++){if(!box.isConnected)return;const pg=await doc.getPage(n);const v0=pg.getViewport({scale:1}),sc=maxW/v0.width,vp=pg.getViewport({scale:sc*dpr});
      const wrap=document.createElement('div');wrap.className='pln-pg';wrap.style.width=Math.round(v0.width*sc)+'px';wrap.style.aspectRatio=v0.width+'/'+v0.height;
      const cv=document.createElement('canvas');cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);cv.setAttribute('aria-label','صفحة '+n+' من ملف الخطة');cv.setAttribute('role','img');
      wrap.appendChild(cv);const no=document.createElement('span');no.className='pln-no';no.textContent=n+' / '+doc.numPages;wrap.appendChild(no);box.appendChild(wrap);
      await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise}
  }catch(e){console.error(e);if(box.isConnected)box.innerHTML=`<div class="pln-load err">${PDFI}<b>تعذّر عرض الملف هنا</b><span>افتحه أو نزّله من الأزرار أعلاه.</span></div>`}}

function bind(v){
  const pv=v.querySelector('#pln-pages');if(pv)renderPdf(pv);
  const a=v.querySelector('#pln-add');if(a)a.onclick=()=>window.CD_planDialog(null);
  v.querySelectorAll('[data-pln-edit]').forEach(b=>b.onclick=()=>window.CD_planDialog(b.dataset.plnEdit));
}

const _route=route;
route=function(keep){const h=(location.hash||'#home').slice(1);
  if(h!=='plans'&&!/^plan-[^/]+$/.test(h))return _route.apply(this,arguments);
  const v=document.getElementById('view'),sy=scrollY;
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.n==='plans'));
  const cp=document.getElementById('cp');if(cp)cp.hidden=true;
  if(window.CD_showBar)window.CD_showBar(null);
  v.innerHTML=h==='plans'?plansIndex():planPage(decodeURIComponent(h.slice(5)));bind(v);try{window.CD_decorate&&window.CD_decorate(v)}catch(e){}
  if(typeof hxBind==='function')hxBind();
  if(keep===true)window.scrollTo(0,sy);else window.scrollTo(0,0)};
// فتح الرابط المباشر لصفحة خطة
if(/^#plans?(-|$)/.test(location.hash))route(true);
})();

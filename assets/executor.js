/* ===== بوابة المنفذ — صفحة واحدة «مكتبي» (#me): البرامج المسندة وتوثيقها وتقاريرها معًا؛ #me-docs القديم يحوّل إليها =====
 * - تظهر لكل منسوب نواة نشط؛ البرامج المسندة إليه هي ما يحمل owner_staff_id = معرّفه.
 * - التوثيق يُكتب في المجموعة executions بمعرّف المنفذ نفسه، وتسمح القاعدة بذلك له فقط (sp_0003/0004).
 */
(function(){
'use strict';
const PAGES={me:['مكتبي','برامجك المسندة وتوثيقها وتقاريرها في صفحة واحدة.','home']};
const S={f:'all'};
const me=()=>window.SP&&SP.access&&SP.access.staff_id||null;
const T=()=>todayISO();
const roleName=()=>{const a=(window.SP&&SP.access)||{};return a.admin?'مدير النواة الرقمية':a.coordinator?'منسق الخطط الذكية':a.add?'محرر الخطط الذكية':'منفذ البرامج'};
const nn=s=>String(s||'').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0621-\u064Aa-zA-Z0-9]+/g,' ').trim();
/* برامجي = ما أُسند إلى المنسوب فقط: بمعرّفه، أو باسمه إن لم يُربط البرنامج بمعرّف بعد. لا يُعرض أي برنامج لغيره. */
const mine=()=>{const id=me();if(!id)return [];const m=(SP.dir&&SP.dir[id])||{},k=nn(m.name||(SP.access&&SP.access.name));
  return P.filter(p=>p.owner_staff_id?p.owner_staff_id===id:(!!k&&nn(p.owner_name)===k))};
const rng=p=>{const s=p.planned_date||'',e=p.planned_end||s;return [s,e]};
const when=p=>{const [s,e]=rng(p);return s?(dmy(s)+(e&&e!==s?' – '+dmy(e):'')):(p.planned_text||'غير مجدول')};
const kind=p=>{if(p.status==='ملغي')return 'x';if(done(p))return 'done';const [s,e]=rng(p);if(e&&e<=T())return 'due';if(s&&s>T())return 'soon';if(s)return 'now';return 'nodate'};
const KL={done:['موثّق','ok'],due:['بانتظار التوثيق','bad'],soon:['قادم','info'],now:['جارٍ الآن','warn'],nodate:['غير مجدول',''],x:['ملغي','']};
const chip=p=>{const k=KL[kind(p)];return `<span class="ex-chip ${k[1]}">${k[0]}</span>`};
const hm=d=>{try{return d.toLocaleTimeString('ar-SA-u-ca-gregory-nu-latn',{hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};
const exs=p=>exFor(p.id).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));

/* الترويسة (الهوية، القائمة الداكنة، التنبيهات، شريط الصفحة) موحدة في coordinator.js */
const showBar=h=>{if(window.CD_showBar)CD_showBar(h)};

const row=(p,acts)=>`<div class="ex-row"><div class="nm"><b>${esc(p.name)}</b><small>${esc(p.plan_name||'')} • ${esc(when(p))}${p.location?' • '+esc(p.location):''}</small></div><div class="ex-act">${chip(p)}${acts||''}</div></div>`;
const docBtn=p=>`<button type="button" class="btn pri cd-sm" data-doc="${p.id}">${ic('plus')} توثيق تنفيذ</button>`;
const openBtn=p=>`<a class="btn soft cd-sm" href="#p-${p.id}">فتح البرنامج</a>`;

const PULSE='M0,40 L90,40 L105,34 L120,40 L170,40 L192,8 L206,70 L218,24 L228,40 L300,40 L318,32 L336,40 L400,40 L422,14 L436,66 L448,28 L458,40 L600,40';
const wd=s=>{try{return new Date(s+'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{weekday:'long'})}catch(e){return ''}};
const mo=s=>{try{return new Date(s+'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{month:'long'})}catch(e){return ''}};
const inDays=s=>Math.round((new Date(s+'T12:00:00')-new Date(T()+'T12:00:00'))/864e5);
const short2=n=>{const w=String(n||'').trim().split(/\s+/);return w.length>1?w[0]+' '+w[w.length-1]:(w[0]||'')};
const FT=[['all','كل البرامج','layers','var(--brand)'],['done','موثّقة','check','#2e9e5b'],['now','قيد التنفيذ','clock','#2f6fd0'],['soon','قادمة','cal','#7a8a94'],['due','تحتاج توثيقًا','bell','#c0392b'],['stall','متعثرة','x','#d98a00']];
const fm=(p,k)=>k==='all'?kind(p)!=='x':k==='stall'?p.status==='متعثر'&&kind(p)!=='x':kind(p)===k;

function pageMe(){
  const L=mine(),id=me(),m=(SP.dir&&SP.dir[id])||{},nm=m.name||(SP.access&&SP.access.name)||'';
  const live=L.filter(p=>kind(p)!=='x'),dn=live.filter(p=>kind(p)==='done').length,pct=live.length?Math.round(dn/live.length*100):0;
  const due=L.filter(p=>fm(p,'due'));
  if(!S.init){S.init=1;S.f=due.length?'due':'all'}
  const av=m.photo?`<img src="${esc(m.photo)}" alt="" class="ex-hav">`:`<span class="ex-hav" aria-hidden="true">${esc((nm||'؟').trim().charAt(0))}</span>`;
  const head=`<section class="pb-hero ex-hero"><div class="pb-tt"><div class="ex-hid">${av}<div><small>مرحبًا بك</small><h2>${esc(short2(nm))}</h2></div></div><span class="pb-chip">${ic('target')} ${esc(roleName())}</span></div>
    <svg class="pb-pulse" viewBox="0 0 600 80" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="b" d="${PULSE}"/><path class="a" pathLength="100" d="${PULSE}"/></svg>
    <div class="pb-pc"><small>${typeof hijri==='function'?esc(hijri(T())):''}</small><b>${pct}%</b><span>${dn} من ${live.length} موثّق</span><i style="--w:${pct}%"></i></div></section>`;
  const tiles=`<div class="pb-tiles" role="group" aria-label="تصفية برامجي">${FT.filter(([k])=>k!=='stall'||L.some(p=>fm(p,'stall'))||S.f==='stall').map(([k,tt,i,c],ix)=>{const n=L.filter(p=>fm(p,k)).length;return `<button type="button" class="pb-t${S.f===k?' on':''}" style="--tc:${c};--i:${ix}" data-f="${k}" aria-pressed="${S.f===k}"><span class="e">${ic(i)}</span><b>${n}</b><span class="l">${tt}</span></button>`}).join('')}</div>`;
  const nxt=L.filter(p=>kind(p)==='now'||kind(p)==='soon').sort((a,b)=>(rng(a)[0]||'9').localeCompare(rng(b)[0]||'9'))[0];
  const spot=nxt?(()=>{const [s]=rng(nxt),k=kind(nxt),n=s?inDays(s):null;
    return `<section class="ex-spot"><div class="ex-sd" aria-hidden="true">${s?`<small>${esc(wd(s))}</small><b>${esc(String(+s.slice(8,10)))}</b><span>${esc(mo(s))}</span>`:'<b>—</b>'}</div>
    <div class="ex-si"><small>${k==='now'?'برنامجك الجاري الآن':'برنامجك القادم'}</small><h3>${esc(nxt.name)}</h3><p>${esc(nxt.plan_name||'')} • ${esc(when(nxt))}${nxt.time?' • '+esc(nxt.time):''}${nxt.location?' • '+esc(nxt.location):''}</p>
    <div class="ex-sa"><span class="ex-chip ${k==='now'?'warn':'info'}">${k==='now'?'يجري الآن':(n===0?'اليوم':n===1?'غدًا':'بعد '+n+' أيام')}</span>${openBtn(nxt)}</div></div></section>`})():'';
  const order={due:0,now:1,soon:2,nodate:3,done:4,x:5},st=p=>rng(p)[0]||'9';
  const list=L.filter(p=>fm(p,S.f)).sort((a,b)=>S.f==='done'?String(rng(b)[1]).localeCompare(String(rng(a)[1])):S.f==='all'?(order[kind(a)]-order[kind(b)]||st(a).localeCompare(st(b))):st(a).localeCompare(st(b)));
  const lbl=(FT.find(x=>x[0]===S.f)||FT[0])[1];
  const item=p=>{const E=exs(p),k=kind(p);
    return `<div class="pb-r ex-pr" style="--sc:${k==='done'?'#2e9e5b':k==='due'?'#c0392b':k==='now'?'#2f6fd0':'#7a8a94'}"><div class="pb-rm"><a href="#p-${esc(String(p.id))}">${esc(p.name)}</a><small>${esc(p.plan_name||'')} • ${esc(when(p))}${p.location?' • '+esc(p.location):''}</small>${p.status==='متعثر'?`<em>السبب: ${esc(p.stall_note||'لم يُكتب سبب')}</em>`:''}
      ${E.length?`<span class="ex-reps">${E.map(x=>`<a class="ex-rl" href="#report-${esc(x.id)}">${ic('rep')}<span>تنفيذ رقم ${esc(x.no||1)} • ${esc(greg(x.date))}${x.approved_at?'':' • بانتظار اعتماد المنسق (لا يُنشر قبله)'}</span><small>${(x.images||[]).length} صور${x.beneficiaries!=null?' • '+fmt(x.beneficiaries)+' مستفيد':''}</small></a>`).join('')}</span>`:''}</div>
      <span class="pb-ra">${chip(p)}${k==='x'?'':docBtn(p)}${openBtn(p)}</span></div>`};
  return `<div class="cd cp-board pb">${head}${tiles}${spot}<section class="panel pb-list"><div class="pb-lh"><h3>${lbl}<b>${list.length}</b></h3></div>${list.length?list.map(item).join(''):`<p class="muted cp-empty">${S.f==='due'?'لا توجد برامج بانتظار التوثيق. أحسنت.':'لا توجد برامج في هذا التصنيف.'}</p>`}</section></div>`}

function lock(sg){return `<div class="wrap"><div class="ex-lock">${ic('user')}<h2>${sg?'حسابك غير مرتبط بمنسوبي النواة':'سجّل الدخول لعرض مكتبك'}</h2><p class="muted">${sg?'يلزم أن يكون حسابك منسوبًا نشطًا في النواة الرقمية لتظهر برامجك. راجع مدير النواة.':'الدخول موحد بمعرّف الدخول نفسه في النواة الرقمية.'}</p>${sg?'':'<button class="btn pri" type="button" id="ex-login">دخول</button>'}</div></div>`}

const _route=route;
route=function(keep){
  const h=(location.hash||'#home').slice(1);
  if(h==='me-docs'){location.replace('#me');return}
  if(!PAGES[h])return _route(keep);
  if(window.SP&&SP.rvCoord){location.replace('#admin');return}   // لوحة المنسق: «برامجي» في لوحة المعلم فقط
  const v=document.getElementById('view'),sy=scrollY;
  document.querySelectorAll('#nav a').forEach(a=>a.classList.remove('on'));
  if(!READY||!(window.SP&&SP.access!==undefined)){showBar(h);v.innerHTML='<div class="empty">جارٍ التحميل…</div>';return}
  if(!SP.signedIn||!me()||!(SP.access&&SP.access.executor)){showBar(null);v.innerHTML=lock(SP.signedIn);const lg=v.querySelector('#ex-login');if(lg)lg.onclick=SP.login;return}
  showBar(h);
  v.innerHTML=pageMe();
  v.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>{const p=P.find(x=>String(x.id)===b.dataset.doc);if(p)execForm(p)});
  v.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{S.f=b.dataset.f;route(true)});
  v.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{S.f=b.dataset.go;route(true)});
  if(keep===true)window.scrollTo(0,sy);else window.scrollTo(0,0);
};
route(true);
})();

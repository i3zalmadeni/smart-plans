/* ===== بوابة المنفذ — صفحتان: مكتبي الإلكتروني (#me) وتوثيق برامجي (#me-docs) =====
 * - تظهر لكل منسوب نواة نشط؛ البرامج المسندة إليه هي ما يحمل owner_staff_id = معرّفه.
 * - التوثيق يُكتب في المجموعة executions بمعرّف المنفذ نفسه، وتسمح القاعدة بذلك له فقط (sp_0003/0004).
 */
(function(){
'use strict';
const PAGES={me:['مكتبي الإلكتروني','برامجك المسندة وما يحتاج توثيقًا وما هو قادم.','home'],'me-docs':['توثيق برامجي','وثّق تنفيذ برامجك واطّلع على تقارير التنفيذ.','rep']};
const S={f:'all'};let LASTUP=new Date();
const me=()=>window.SP&&SP.access&&SP.access.staff_id||null;
const T=()=>todayISO();
const mine=()=>{const id=me();return id?P.filter(p=>p.owner_staff_id===id):[]};
const rng=p=>{const s=p.planned_date||'',e=p.planned_end||s;return [s,e]};
const when=p=>{const [s,e]=rng(p);return s?(dmy(s)+(e&&e!==s?' – '+dmy(e):'')):(p.planned_text||'غير مجدول')};
const kind=p=>{if(p.status==='ملغي')return 'x';if(done(p))return 'done';const [s,e]=rng(p);if(e&&e<=T())return 'due';if(s&&s>T())return 'soon';if(s)return 'now';return 'nodate'};
const KL={done:['موثّق','ok'],due:['بانتظار التوثيق','bad'],soon:['قادم','info'],now:['جارٍ الآن','warn'],nodate:['غير مجدول',''],x:['ملغي','']};
const chip=p=>{const k=KL[kind(p)];return `<span class="ex-chip ${k[1]}">${k[0]}</span>`};
const hm=d=>{try{return d.toLocaleTimeString('ar-SA-u-ca-gregory-nu-latn',{hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};
const exs=p=>exFor(p.id).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));

function bar(h){
  const [t,d,i]=PAGES[h];const nm=(SP.access&&SP.access.name)||'';
  const it=(href,icon,label)=>`<a href="#${href}" class="${h===href?'on':''}"${h===href?' aria-current="page"':''}>${ic(icon)}<span>${label}</span></a>`;
  return `<div class="cp-top"><div class="wrap cp-topin">
    <a class="cp-sys" href="#me"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M30 4c2 14 8 20 24 24-16 4-22 10-24 26-2-16-8-22-24-26 16-4 22-10 24-24z" fill="#0f8a94"/><path d="M50 4c.8 5 3 7.2 8 8-5 .8-7.2 3-8 8-.8-5-3-7.2-8-8 5-.8 7.2-3 8-8z" fill="#f0b34a"/></svg><span><b>الخطط الذكية</b><small>بوابة المنفذ</small></span></a>
    <a class="cp-site" href="#home">الموقع الإلكتروني</a>
    <span class="cp-moe"><b>وزارة التعليم</b><i aria-hidden="true"></i><span class="cp-core"><img src="assets/core-logo.svg" alt="" width="24" height="24">النواة الرقمية</span></span></div></div>
  <div class="cp-strip" aria-hidden="true"></div>
  <div class="cp-sub" role="navigation" aria-label="صفحات المنفذ"><div class="wrap cp-subin"><nav class="cp-nav">${it('me','home','مكتبي الإلكتروني')}${it('me-docs','rep','توثيق برامجي')}${SP.can('add')?`<a href="#admin">${ic('layers')}<span>لوحة التحكم</span></a>`:''}</nav>
    <span class="cp-user"><span class="cp-who">${ic('user')}<span>${esc(nm)}</span></span><button type="button" class="cp-out" id="ex-out">خروج</button></span></div></div>
  <div class="cp-page"><div class="wrap cp-pagein"><span class="cp-pi">${ic(i)}</span><div class="cp-pt"><h1>${t}</h1><p>${d}</p></div>
    <div class="cp-pm"><span class="cp-up">آخر تحديث ${hm(LASTUP)}</span><button type="button" class="btn soft cd-sm" id="ex-refresh">${ic('rep')} تحديث</button></div></div></div>`}
function showBar(h){let b=document.getElementById('ex-bar');
  if(window.CD_showBar)CD_showBar(null);
  document.body.classList.toggle('cp-on',!!h);
  if(!h){if(b)b.hidden=true;return}
  if(!b){b=document.createElement('div');b.id='ex-bar';document.body.prepend(b)}
  b.hidden=false;b.innerHTML=bar(h);
  b.querySelector('#ex-out').onclick=()=>SP.signOut();
  b.querySelector('#ex-refresh').onclick=()=>{try{DB&&DB.refresh&&DB.refresh()}catch(e){}LASTUP=new Date();setTimeout(()=>{route(true);toast('حُدّثت البيانات')},350)}}

const row=(p,acts)=>`<div class="ex-row"><div class="nm"><b>${esc(p.name)}</b><small>${esc(p.plan_name||'')} • ${esc(when(p))}${p.location?' • '+esc(p.location):''}</small></div><div class="ex-act">${chip(p)}${acts||''}</div></div>`;
const docBtn=p=>`<button type="button" class="btn pri cd-sm" data-doc="${p.id}">${ic('plus')} توثيق تنفيذ</button>`;
const openBtn=p=>`<a class="btn soft cd-sm" href="#p-${p.id}">فتح البرنامج</a>`;

function meHeader(){const id=me(),m=(SP.dir&&SP.dir[id])||{name:(SP.access&&SP.access.name)||'',title:'',photo:null};
  const av=m.photo?`<img src="${esc(m.photo)}" alt="">`:`<span class="ex-av" aria-hidden="true">${esc((m.name||'؟').trim().charAt(0))}</span>`;
  return `<div class="ex-me">${av}<div><h2>مرحبًا ${esc(m.name)}</h2><p>${esc(m.title||'منسوب النواة الرقمية')}</p></div></div>`}

function pageMe(){
  const L=mine(),g=k=>L.filter(p=>kind(p)===k);
  const due=g('due'),now=g('now'),soon=g('soon').sort((a,b)=>rng(a)[0].localeCompare(rng(b)[0])),dn=g('done');
  const last=L.flatMap(p=>exs(p).map(e=>({e,p}))).sort((a,b)=>String(b.e.date).localeCompare(String(a.e.date))).slice(0,5);
  const kp=(n,l,f,w)=>`<button type="button" data-go="${f}" class="${w||''}"><b>${fmt(n)}</b><span>${l}</span></button>`;
  const sec=(t,items,empty,more)=>`<section class="ex-sec"><h3>${t}<small>${items.length||''}</small></h3>${items.length?items.join(''):`<div class="ex-empty">${empty}</div>`}${more||''}</section>`;
  return `<div class="wrap ex">${meHeader()}
  <div class="ex-kp">${kp(L.length,'برامجي','all')}${kp(dn.length,'موثّقة','done')}${kp(due.length,'بانتظار التوثيق','due',due.length?'warn':'')}${kp(now.length+soon.length,'جارية وقادمة','soon')}</div>
  ${sec('تحتاج توثيقًا الآن',due.map(p=>row(p,docBtn(p))),'لا توجد برامج بانتظار التوثيق.')}
  ${sec('جارية حاليًا',now.map(p=>row(p,docBtn(p)+openBtn(p))),'لا توجد برامج جارية اليوم.')}
  ${sec('القادمة',soon.slice(0,6).map(p=>row(p,openBtn(p))),'لا توجد برامج قادمة.')}
  ${sec('آخر توثيقاتي',last.map(({e,p})=>`<div class="ex-row"><div class="nm"><b>${esc(p.name)}</b><small>${esc(greg(e.date))} • تنفيذ رقم ${esc(e.no||1)}</small></div><div class="ex-act"><a class="btn soft cd-sm" href="#report-${esc(e.id)}">${ic('rep')} التقرير</a></div></div>`),'لم توثّق أي تنفيذ بعد.','<p style="margin:10px 0 0"><a class="btn soft" href="#me-docs">إلى توثيق برامجي</a></p>')}
  </div>`}

function pageDocs(){
  const L=mine(),F=[['all','الكل'],['due','بانتظار التوثيق'],['now','جارية'],['soon','قادمة'],['done','موثّقة']];
  const cnt=k=>k==='all'?L.length:L.filter(p=>kind(p)===k).length;
  const list=L.filter(p=>S.f==='all'||kind(p)===S.f).sort((a,b)=>(rng(a)[0]||'9').localeCompare(rng(b)[0]||'9'));
  const item=p=>{const E=exs(p);
    return `<div class="ex-row" style="align-items:flex-start"><div class="nm"><b>${esc(p.name)}</b><small>${esc(p.plan_name||'')} • ${esc(when(p))}${p.location?' • '+esc(p.location):''}</small>
      ${E.map(e=>`<div class="ex-rep"><div class="top"><b>تنفيذ رقم ${esc(e.no||1)} • ${esc(greg(e.date))}</b><a class="btn soft cd-sm" href="#report-${esc(e.id)}">${ic('rep')} تقرير التنفيذ</a></div>
        <p>${esc(clip(e.description,160))}</p><small class="muted">${e.beneficiaries!=null?fmt(e.beneficiaries)+' مستفيد • ':''}${(e.images||[]).length} صور${(e.attachments||[]).length?' • '+(e.attachments||[]).length+' مرفقات':''}</small></div>`).join('')}
    </div><div class="ex-act">${chip(p)}${kind(p)==='x'?'':docBtn(p)}</div></div>`};
  return `<div class="wrap ex"><section class="ex-sec"><div class="ex-flt" role="group" aria-label="تصفية البرامج">${F.map(([k,t])=>`<button type="button" data-f="${k}" class="${S.f===k?'on':''}" aria-pressed="${S.f===k}">${t} (${cnt(k)})</button>`).join('')}</div></section>
  <section class="ex-sec">${list.length?list.map(item).join(''):'<div class="ex-empty">لا توجد برامج في هذا التصنيف.</div>'}</section></div>`}

function lock(sg){return `<div class="wrap"><div class="ex-lock">${ic('user')}<h2>${sg?'حسابك غير مرتبط بمنسوبي النواة':'سجّل الدخول لعرض مكتبك'}</h2><p class="muted">${sg?'يلزم أن يكون حسابك منسوبًا نشطًا في النواة الرقمية لتظهر برامجك. راجع مدير النواة.':'الدخول موحد بمعرّف الدخول نفسه في النواة الرقمية.'}</p>${sg?'':'<button class="btn pri" type="button" id="ex-login">دخول</button>'}</div></div>`}

const _route=route;
route=function(keep){
  const h=(location.hash||'#home').slice(1);
  if(!PAGES[h]){const b=document.getElementById('ex-bar');if(b)b.hidden=true;return _route(keep)}
  const v=document.getElementById('view'),sy=scrollY;
  document.querySelectorAll('#nav a').forEach(a=>a.classList.remove('on'));
  if(!READY||!(window.SP&&SP.access!==undefined)){showBar(null);v.innerHTML='<div class="empty">جارٍ التحميل…</div>';return}
  if(!SP.signedIn||!me()||!(SP.access&&SP.access.executor)){showBar(null);v.innerHTML=lock(SP.signedIn);const lg=v.querySelector('#ex-login');if(lg)lg.onclick=SP.login;return}
  showBar(h);
  v.innerHTML=h==='me'?pageMe():pageDocs();
  v.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>{const p=P.find(x=>String(x.id)===b.dataset.doc);if(p)execForm(p)});
  v.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{S.f=b.dataset.f;route(true)});
  v.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{S.f=b.dataset.go;location.hash='#me-docs'});
  if(keep===true)window.scrollTo(0,sy);else window.scrollTo(0,0);
};
route(true);
})();

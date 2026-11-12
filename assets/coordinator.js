/* ===== لوحة التحكم — إضافة مستقلة فوق الموقع دون تغيير صفحاته =====
 * - تُحفظ تعديلات المنسق في جدول السجلات نفسه (مجموعة executions) بعلامة kind:'coordinator'،
 *   فلا تحتاج قاعدة البيانات أي تعديل، ولا تختلط بسجلات التوثيق (لا تحمل رقم برنامج).
 *   وهي سجل متتابع (كل تعديل سطر جديد)،
 *   وتُطبَّق فوق بيانات الخطة الأصلية عند كل تحميل، فتنعكس على جميع صفحات الموقع.
 * - التعديل والاعتماد لمن سجّل الدخول فقط.
 */
(function(){
'use strict';
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const UIK='sp-coord-ui';
const D=Object.assign({mode:'plan',plan:null,week:null,dom:null,own:null,fs:'',q:'',grace:0,all:false},ls.get(UIK,{}));
D.fs='';D.q='';D.pq='';D.uq='';
const saveUI=()=>ls.set(UIK,{pmode:D.pmode,mplan:D.mplan,mode:D.mode,plan:D.plan,week:D.week,dom:D.dom,own:D.own,grace:D.grace});
const ORIG={};BASEP.forEach(p=>{ORIG[p.id]=JSON.parse(JSON.stringify(p))});
const CO_COL='executions';let LASTUP=new Date();
let CO=[],SUB=false,WHO='',REMOVED=[];let PEOPLE={};
const WAICON='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3z"/></svg>';
const ROLES=['معلم','وكيل الشؤون التعليمية','وكيل شؤون الطلاب','الموجه الطلابي','رائد النشاط','منسق الجودة','منسق التقويم الذاتي','أمين مصادر التعلم','محضر المختبر','المرشد الصحي','إداري'];
const STS=['لم يبدأ','قيد التنفيذ','مكتمل','متعثر','ملغي'];
const SC={'مكتمل':'var(--ok)','قيد التنفيذ':'var(--info)','لم يبدأ':'var(--cd-idle)','متأخر':'var(--bad)','متعثر':'var(--warn)','ملغي':'var(--muted)'};
const SL={'مكتمل':'مكتمل','قيد التنفيذ':'قيد التنفيذ','لم يبدأ':'مخطط','متأخر':'متأخر التوثيق','متعثر':'متعثر','ملغي':'ملغي'};
const ORDER=['مكتمل','قيد التنفيذ','لم يبدأ','متأخر','متعثر','ملغي'];
const REASONS=['تعارض مع جدول المدرسة','غياب المنفذ','نقص الموارد أو المتطلبات','تأجيل بقرار الإدارة','لم يُرفع التوثيق في وقته'];
const FL={beneficiary:'الفئة المستهدفة',name:'الاسم',plan_id:'الخطة',domain:'الموضوع',planned_date:'تاريخ البداية',planned_end:'تاريخ النهاية',time:'الوقت',location:'المكان',owner_name:'المنفذ',beneficiary:'المستفيد',goal:'الهدف',indicator:'المؤشر',required_evidence:'الشواهد',status:'الحالة',stall_note:'سبب التعثر',approved_at:'الاعتماد'};
const T=()=>todayISO();
const addDays=(s,n)=>{const x=new Date(s+'T12:00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
const t12=t=>{if(!t)return '';let[h,m]=t.split(':').map(Number);const am=h<12;h=h%12||12;return h+':'+String(m).padStart(2,'0')+(am?' ص':' م')};
const fmtWhen=iso=>{try{const d=new Date(iso);const m=Math.round((Date.now()-d)/6e4);if(m<1)return 'الآن';if(m<60)return 'قبل '+m+' د';if(m<1440)return 'قبل '+Math.round(m/60)+' س';return dmy(iso.slice(0,10))}catch(e){return ''}};
const canApprove=()=>!(window.SP&&SP.can)||SP.can('approve');
const ownerOf=p=>{const n=(p.owner_name||'').trim();return !n||/^[—\-–]+$/.test(n)?'غير محدد':n};
const planOf=id=>(typeof PL!=='undefined'?PL:[]).find(x=>String(x.id)===String(id))||DATA.plans.find(x=>String(x.id)===String(id))||{id,name:'—'};

/* ---------- التواريخ والحالة ---------- */
const startOf=p=>p.planned_date||((p.weeks||[]).map(wkInfo).filter(Boolean)[0]||{}).start_date||'';
const endOf=p=>{if(p.planned_end)return p.planned_end;const ws=(p.weeks||[]).map(wkInfo).filter(Boolean);return ws.length?ws[ws.length-1].end_date:(p.planned_date||'')};
const weeksFor=(s,e)=>s?CAL().filter(w=>w.start_date<=(e||s)&&w.end_date>=s).map(w=>w.number):[];
const inWeek=(p,w)=>(p.weeks||[]).includes(w.number)||(!(p.weeks||[]).length&&!!startOf(p)&&startOf(p)<=w.end_date&&endOf(p)>=w.start_date);
const isDue=p=>{const e=endOf(p);return !!e&&addDays(e,+D.grace||0)<T()};
const needs=p=>isDue(p)&&!done(p)&&!['مكتمل','ملغي','متعثر'].includes(p.status);
const ds=p=>(done(p)||p.status==='مكتمل')?'مكتمل':needs(p)?'متأخر':(STS.includes(p.status)?p.status:'لم يبدأ');
window.CD_DS=ds; // توحيد حالة البرنامج في كل صفحات الموقع مع لوحة التحكم

/* ---------- تطبيق تعديلات المنسق فوق الخطة الأصلية ---------- */
function setFields(p,f){
  Object.assign(p,f);
  if('plan_id' in f)p.plan_name=planOf(f.plan_id).name;
  if('planned_date' in f||'planned_end' in f){
    const s=p.planned_date,e=p.planned_end||p.planned_date;
    p.weeks=weeksFor(s,e);
    p.planned_range=s?(dmy(s)+'/'+s.slice(0,4)+(e&&e!==s?' إلى '+dmy(e)+'/'+e.slice(0,4):'')):null;
    p.planned_text=p.weeks.length?('الأسبوع '+(p.weeks.length>1?p.weeks[0]+' إلى الأسبوع '+p.weeks[p.weeks.length-1]:p.weeks[0])):(s?dmy(s):'غير محدد');
    const w=wkInfo(p.weeks[0]);if(w){p.term=w.term;p.term_text=w.term===1?'الفصل الدراسي الأول':w.term===2?'الفصل الدراسي الثاني':'الفصل الدراسي الثالث'}
  }
}
function apply(){
  LASTUP=new Date();
  for(let i=BASEP.length-1;i>=0;i--)if(BASEP[i]._co)BASEP.splice(i,1);
  for(const p of BASEP){const o=ORIG[p.id];if(!o)continue;for(const k of Object.keys(p))if(!(k in o))delete p[k];Object.assign(p,JSON.parse(JSON.stringify(o)))}
  const docs=CO.slice().sort((a,b)=>(a.at||'').localeCompare(b.at||''));
  // الخطط: الأصلية + المضافة من لوحة التحكم، مع التعديل والحذف
  let plans=DATA.plans.map(x=>({...x})).concat(XP.length&&!DATA.plans.some(x=>x.id===UPLAN.id)?[{...UPLAN}]:[]);window.PLANC={};
  for(const d of docs){
    if(d.type==='plan-add'&&d.plan&&d.plan.id!=null&&!plans.some(x=>String(x.id)===String(d.plan.id)))plans.push({...d.plan,_co:true});
    else if(d.type==='plan-edit'&&d.planId!=null){const x=plans.find(y=>String(y.id)===String(d.planId));if(x)Object.assign(x,d.fields||{})}
    else if(d.type==='plan-remove'&&d.planId!=null)plans=plans.filter(y=>String(y.id)!==String(d.planId));
  }
  plans.forEach(x=>{if(x.color!=null&&x.color!=='')window.PLANC[x.id]=+x.color});
  PL=plans;
  const gone=new Set(),gname={};for(const d of docs){if(d.type==='remove'&&d.progId!=null){gone.add(String(d.progId));gname[String(d.progId)]={name:d.name||'',at:d.at||'',by:d.by||''}}else if(d.type==='restore'&&d.progId!=null)gone.delete(String(d.progId))}
  let n=0;
  for(const d of docs){if(d.type!=='add'||!d.data)continue;n++;const id='c-'+d.id;
    const p={id,code:'PC-'+String(n).padStart(3,'0'),record_type:'برنامج',status:'لم يبدأ',weeks:[],execPct:0,late:false,links:[],unplanned:false,beneficiary:null,goal:'',indicator:'',required_evidence:'',source_status:'أُضيف من لوحة التحكم',_co:true};
    setFields(p,d.data);BASEP.push(p)}
  const allP=BASEP.concat(XP);REMOVED=[...gone].map(id=>{const x=allP.find(p=>String(p.id)===id),g=gname[id]||{};return {id,name:x?x.name:(g.name||'برنامج محذوف'),plan:x?x.plan_name:'',owner:x?ownerOf(x):'',at:g.at||'',by:g.by||'',docs:x?exFor(x.id).length:0}}).sort((a,b)=>(b.at||'').localeCompare(a.at||''));
  P=allP.filter(p=>!gone.has(String(p.id)));
  PEOPLE={};
  const DIR=(window.SP&&SP.dir)||{};
  for(const id of Object.keys(DIR)){const m=DIR[id];PEOPLE[m.name]={role:m.title||'',photo:m.photo?{id:'',url:m.photo}:null,phone:normPhone(m.phone)||'',id}}
  for(const d of docs){if(d.type==='edit'&&d.fields){const p=P.find(x=>String(x.id)===String(d.progId));if(p)setFields(p,d.fields)}}
  linkOwners(docs);
  for(const p of P){const x=PL.find(y=>String(y.id)===String(p.plan_id));if(x)p.plan_name=x.name}
}
const _merge=mergeUnplanned;
mergeUnplanned=function(docs){_merge(docs);apply()};

/* ---------- المنفذون من منسوبي النواة ---------- */
// لا نسخ للبيانات: يُحفظ معرّف المنسوب (owner_staff_id) ويُعرض اسمه الحالي من النواة.
const normN=t=>String(t||'').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0621-\u064Aa-zA-Z0-9]+/g,' ').trim();
let OLINK={},OGROUP={};
const dirOf=()=>(window.SP&&SP.dir)||{};
function ownerSid(name,sid){const DIR=dirOf();if(sid&&DIR[sid])return sid;const n=(name||'').trim();if(!n)return null;
  if(OLINK[n]&&DIR[OLINK[n]])return OLINK[n];
  const k=normN(n),c=Object.values(DIR).filter(m=>normN(m.name)===k);return c.length===1?c[0].id:null}
function linkOwners(docs){const DIR=dirOf();OLINK={};OGROUP={};
  for(const d of docs)if(d.type==='owner-link'&&d.from){delete OLINK[d.from];delete OGROUP[d.from];if(d.group)OGROUP[d.from]=true;else if(d.staff_id)OLINK[d.from]=d.staff_id}
  for(const p of P){const sid=ownerSid(p.owner_name,p.owner_staff_id);if(sid){p.owner_staff_id=sid;p.owner_name=DIR[sid].name}else delete p.owner_staff_id}
  for(const x of PL){const sid=ownerSid(x.owner,x.owner_staff_id);if(sid){x.owner_staff_id=sid;x.owner=DIR[sid].name}else delete x.owner_staff_id}}
function staffIdByName(n){n=(n||'').trim();if(!n)return null;const m=((window.SP&&SP.staff)||[]).filter(x=>x.name===n);return m.length?m[0].id:null}
// كل كتابة تحمل معرّف المنفذ إن اختير من النواة (يتحقق الحارس في القاعدة من وجوده)
function linkDoc(doc){const t=(o,k)=>{if(o&&typeof o==='object'&&k in o)o.owner_staff_id=staffIdByName(o[k])};
  t(doc.fields,'owner_name');t(doc.data,'owner_name');t(doc.fields,'owner');t(doc.plan,'owner');return doc}
window.CD_staffId=staffIdByName;

async function write(doc){
  if(!DB)throw new Error('قاعدة البيانات غير متاحة');
  if(!WHO&&USER){try{WHO=await USER.id()}catch(e){}}
  await DB.collection(CO_COL).add({...linkDoc(doc),kind:'coordinator',at:new Date().toISOString(),by:WHO||''});
}
async function saveEdit(p,fields,label){
  const f={};for(const[k,v]of Object.entries(fields))if(String(p[k]??'')!==String(v??''))f[k]=v;
  if(!canApprove()&&'approved_at' in f)delete f.approved_at; // الاعتماد بصلاحية smart_plans:approve فقط
  if(!Object.keys(f).length)return false;
  await write({type:'edit',progId:String(p.id),name:p.name,fields:f,summary:label||('عدّل '+Object.keys(f).map(k=>FL[k]||k).join('، '))});
  return true;
}

/* ---------- الرسوم ---------- */
function ring(v,label,sub,color){const r=40,c=2*Math.PI*r,pv=Math.max(0,Math.min(100,v||0));
  return `<div class="cd-ring" style="--sc:${color||'var(--brand)'}" role="img" aria-label="${esc(label)} ${Math.round(pv)}%"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--cd-track)" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${color||'var(--brand)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(pv/100*c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="21" font-weight="800" fill="var(--ink)" font-family="var(--font)">${Math.round(pv)}%</text></svg><b>${esc(label)}</b><small>${esc(sub)}</small></div>`}
function donut(cnt,total){const r=56,c=2*Math.PI*r,gap=total>1?3:0;let off=0;const segs=[];
  for(const s of ORDER){const n=cnt[s]||0;if(!n)continue;const len=n/Math.max(1,total)*c;segs.push(`<circle cx="75" cy="75" r="${r}" fill="none" stroke="${SC[s]}" stroke-width="18" stroke-dasharray="${Math.max(.5,len-gap).toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 75 75)"><title>${SL[s]}: ${n}</title></circle>`);off+=len}
  return `<svg viewBox="0 0 150 150" role="img" aria-label="توزيع البرامج حسب الحالة"><circle cx="75" cy="75" r="${r}" fill="none" stroke="var(--cd-track)" stroke-width="18"/>${segs.join('')}<text x="75" y="70" text-anchor="middle" font-size="30" font-weight="800" fill="var(--ink)" font-family="var(--font)">${total}</text><text x="75" y="94" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="var(--font)">برنامجًا</text></svg>`}
const countBy=l=>{const c={};for(const p of l){const s=ds(p);c[s]=(c[s]||0)+1}return c};
const stack=(c,total)=>`<div class="cd-stk">${ORDER.filter(s=>c[s]).map(s=>`<span style="--sc:${SC[s]};flex:${c[s]}" title="${SL[s]}: ${c[s]}"></span>`).join('')}${total?'':''}</div>`;
function initials(n){const w=String(n||'').replace(/[\/،,()]/g,' ').split(/\s+/).filter(x=>x&&!['بن','ابن','بنت','عبد'].includes(x));if(!w.length)return '؟';const f=x=>x.replace(/^ال(?=..)/,'')[0]||'';return w.length>1?f(w[0])+'\u202F'+f(w[w.length-1]):f(w[0])}
function avatar(name,size){const pp=PEOPLE[name]||{};const sz=size||40;
  if(pp.photo)return `<img class="cd-av" src="${esc(imgUrl(pp.photo))}" alt="صورة ${esc(name)}" width="${sz}" height="${sz}" style="width:${sz}px;height:${sz}px" loading="lazy">`;
  let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;const i=h%6;
  return `<span class="cd-av" style="width:${sz}px;height:${sz}px;--b:var(--c${i}b);--f:var(--c${i}f);font-size:${Math.round(sz*.36)}px" role="img" aria-label="صورة افتراضية لـ ${esc(name)}"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7" fill="var(--f)" opacity=".22"/><path d="M6 38c2-9 8-13 14-13s12 4 14 13" fill="var(--f)" opacity=".22"/></svg><b>${esc(initials(name))}</b></span>`}
const peopleNames=()=>[...new Set([...Object.values(dirOf()).map(m=>m.name),...P.map(ownerOf)])].filter(n=>n!=='غير محدد').sort((a,b)=>a.localeCompare(b,'ar'));
function ownerSelect(cur,attrs){const st=(window.SP&&SP.staff)||[];cur=cur&&cur!=='غير محدد'?cur:'';const names=new Set(st.map(m=>m.name));
  return `<select ${attrs}><option value="">— بدون منفذ —</option>${st.map(m=>`<option value="${esc(m.name)}"${m.name===cur?' selected':''}>${esc(m.name)}${m.title?' — '+esc(m.title):''}</option>`).join('')}${cur&&!names.has(cur)?`<option selected value="${esc(cur)}">${esc(cur)} — غير مرتبط بالنواة</option>`:''}</select>`}
window.CD_ownerSelect=ownerSelect;
const domainList=()=>[...new Set([...(LOOK().domain||[]),...P.map(p=>p.domain).filter(Boolean)])];
function domainSelect(cur,attrs){const l=domainList();return `<select ${attrs}><option value="">— اختر المجال —</option>${l.map(d=>`<option value="${esc(d)}"${d===cur?' selected':''}>${esc(d)}</option>`).join('')}${cur&&!l.includes(cur)?`<option selected>${esc(cur)}</option>`:''}</select>`}
const legend=keys=>`<div class="cd-legend">${keys.map(s=>`<span style="--sc:${SC[s]}"><i></i>${SL[s]}</span>`).join('')}</div>`;

function weekChart(){const ws=CAL();if(!ws.length)return '';const cw=curWeek();
  const rows=ws.map(w=>{const l=P.filter(p=>inWeek(p,w));return {w,l,c:countBy(l)}});
  const max=Math.max(1,...rows.map(r=>r.l.length));
  const terms=[...new Set(ws.map(w=>w.term))];
  return `<div class="cd-wkwrap"><div class="cd-wk" style="--n:${ws.length}" role="list" aria-label="عدد البرامج في كل أسبوع دراسي"><span class="ymax">${max} برامج</span>${rows.map((r,i)=>{
    const tip=`الأسبوع ${r.w.number} • ${dmy(r.w.start_date)} – ${dmy(r.w.end_date)}\n${r.l.length?r.l.length+' برامج: '+ORDER.filter(s=>r.c[s]).map(s=>SL[s]+' '+r.c[s]).join('، '):'لا برامج'}`;
    return `<button type="button" role="listitem" class="cd-wcol${cw&&cw.number===r.w.number?' cur':''}${D.mode==='week'&&+D.week===r.w.number?' sel':''}${i&&r.w.term!==ws[i-1].term?' tsep':''}" data-week="${r.w.number}" data-tip="${esc(tip)}" aria-label="${esc(tip.replace('\n','، '))}"><span class="cd-wbar" style="height:${(r.l.length/max*100).toFixed(1)}%">${ORDER.filter(s=>r.c[s]).map(s=>`<span style="--sc:${SC[s]};flex:${r.c[s]}"></span>`).join('')}</span><span class="cd-wn">${r.w.number}</span></button>`}).join('')}</div>
  <div class="cd-terms">${terms.map(t=>`<span>${t===1?'الفصل الأول':t===2?'الفصل الثاني':'الفصل الثالث'}</span>`).join('')}</div></div>`}

/* ---------- عرض اللوحة ---------- */
function rowsHTML(list,showPlan,ED){
  return `<div class="cd-tw"><table class="cd-t"><thead><tr><th>البرنامج</th><th>من</th><th>إلى</th><th>الوقت</th><th>المنفذ</th><th>الحالة</th><th>التوثيق والاعتماد</th><th></th></tr></thead><tbody>${list.map(p=>{
    const s=ds(p),ex=exFor(p.id).length,id=esc(String(p.id));
    const appr=p.approved_at?`<span class="cd-appr">${ic('check')} معتمد ${dmy(p.approved_at)}</span>`:(ED&&(ex||p.status==='مكتمل')?`<button class="btn soft cd-sm" data-approve="${id}">اعتماد</button>`:'');
    return `<tr data-id="${id}" style="--sc:${SC[s]}"><td class="cd-nm"><a href="#p-${id}">${esc(p.name)}</a><small>${esc(p.code)}${showPlan?' • '+esc(p.plan_name):''}${p.location?' • '+esc(p.location):''}</small></td>
    <td>${ED?`<input type="date" data-f="planned_date" value="${esc(startOf(p))}" aria-label="من تاريخ">`:esc(dmy(startOf(p))||'—')}</td>
    <td>${ED?`<input type="date" data-f="planned_end" value="${esc(endOf(p))}" aria-label="إلى تاريخ">`:esc(dmy(endOf(p))||'—')}</td>
    <td>${ED?`<input type="time" data-f="time" value="${esc(p.time||'')}" aria-label="الوقت">`:esc(t12(p.time)||'—')}</td>
    <td>${ED?ownerSelect(ownerOf(p),'class="own" data-f="owner_name" aria-label="المنفذ"'):esc(ownerOf(p))}</td>
    <td>${ED?`<select data-f="status" aria-label="الحالة">${STS.map(x=>`<option value="${x}"${x===(p.status||'لم يبدأ')?' selected':''}>${SL[x]}</option>`).join('')}</select>`:pill(s)}${s==='متأخر'?`<span class="cd-flag">⚠ انتهت فترته ${dmy(endOf(p))} دون توثيق</span>`:''}${p.status==='متعثر'?`<span class="cd-why" title="${esc(p.stall_note||'')}">${esc(p.stall_note||'لم يُكتب سبب')}</span>`:''}</td>
    <td><span class="cd-dcell">${ex?`<a class="cd-doc ok" href="#p-${id}" title="عرض سجل التوثيق والتقارير">${ic('check')} موثق${ex>1?' '+ex+' مرات':''}</a>`:'<span class="cd-doc">لم يُوثق</span>'}${ED?`<button class="btn ${ex?'':'pri '}cd-sm" data-doc="${id}">${ic('rep')} ${ex?'توثيق جديد':'توثيق'}</button>`:''}${appr}</span></td>
    <td><span class="cd-dcell"><button class="btn soft cd-sm" data-edit="${id}">التفاصيل</button>${ED?`<button class="btn cd-bad cd-sm" data-del="${id}" title="حذف البرنامج">حذف</button>`:''}</span></td></tr>`}).join('')}</tbody></table></div>`}

function manage(ED,embedded){
  const q=D.q.trim();const fl=p=>(!D.fs||ds(p)===D.fs)&&(!q||(p.name+(p.code||'')+(p.owner_name||'')+(p.location||'')).includes(q));
  let body;
  if(D.mode==='week'){const cw=curWeek();const w=wkInfo(D.week)||cw||CAL()[0];D.week=w.number;const i=CAL().findIndex(x=>x.number===w.number);
    const list=P.filter(p=>inWeek(p,w)&&fl(p)).sort((a,b)=>(startOf(a)+(a.time||'')).localeCompare(startOf(b)+(b.time||'')));
    body=`<div class="cd-wkn"><button class="btn cd-sm" data-wstep="-1" aria-label="الأسبوع السابق"${i<=0?' disabled':''}>→</button><select class="cd-sel" id="cd-wk" aria-label="اختر الأسبوع">${CAL().map(x=>`<option value="${x.number}"${x.number===w.number?' selected':''}>الأسبوع ${x.number} • ${dmy(x.start_date)} – ${dmy(x.end_date)}${cw&&x.number===cw.number?' (الحالي)':''}</option>`).join('')}</select><button class="btn cd-sm" data-wstep="1" aria-label="الأسبوع التالي"${i>=CAL().length-1?' disabled':''}>←</button>${cw&&w.number!==cw.number?'<button class="btn soft cd-sm" data-wnow>الأسبوع الحالي</button>':''}<span class="muted small">${list.length} برامج${D.fs||q?' (بعد التصفية)':''}</span></div>
    ${list.length?rowsHTML(list,true,ED):`<div class="cd-empty">لا توجد برامج${D.fs||q?' مطابقة':''} في هذا الأسبوع.${ED?' أضف برنامجًا من زر «إضافة برنامج».':''}</div>`}`}
  else{
    // حسب الخطة / حسب المجال / حسب المنفذ: اختيار مجموعة ثم جدول برامجها
    const G={plan:{key:p=>String(p.plan_id),label:k=>planOf(k).name,st:'plan',none:'في هذه الخطة'},
      domain:{key:p=>p.domain||'مجالات أخرى',label:k=>k,st:'dom',none:'في هذا المجال'},
      owner:{key:ownerOf,label:k=>k,st:'own',none:'لهذا المنفذ'}}[D.mode]||null;
    if(!G){D.mode='plan';return manage(ED)}
    const groups={};for(const p of P){const k=G.key(p);(groups[k]||=[]).push(p)}
    let keys=Object.keys(groups);
    if(D.mode==='plan')keys.sort((a,b)=>PL.findIndex(x=>String(x.id)===a)-PL.findIndex(x=>String(x.id)===b));
    else keys.sort((a,b)=>groups[b].length-groups[a].length||a.localeCompare(b,'ar'));
    if(!keys.includes(String(D[G.st])))D[G.st]=keys[0];
    const cur=String(D[G.st]),list=(groups[cur]||[]).filter(fl).sort((a,b)=>(startOf(a)||'9').localeCompare(startOf(b)||'9'));
    const small=D.mode==='owner';
    body=`<div class="cd-ptabs${small?' sm':''}" role="tablist">${keys.map(k=>{const l=groups[k],c=countBy(l),dn=c['مكتمل']||0,lt=(c['متأخر']||0)+(c['متعثر']||0);return `<button type="button" role="tab" aria-selected="${k===cur}" class="cd-ptab${k===cur?' on':''}" data-grp="${esc(k)}">${D.mode==='owner'?`<span class="cd-pn">${avatar(k,30)}<b>${esc(k)}</b></span>${PEOPLE[k]&&PEOPLE[k].role?`<small>${esc(PEOPLE[k].role)}</small>`:''}`:`<b>${esc(G.label(k))}</b>`}${stack(c,l.length)}<small>${l.length} برامج • ${Math.round(dn/Math.max(1,l.length)*100)}% مكتمل${lt?' • <span style="color:var(--bad)">'+lt+' متأخر/متعثر</span>':''}</small></button>`}).join('')}</div>
    <div class="cd-topic">${esc(G.label(cur))} <small>(${list.length}${D.fs||q?' بعد التصفية':''})</small></div>
    ${list.length?rowsHTML(list,D.mode!=='plan',ED):`<div class="cd-empty">لا توجد برامج${D.fs||q?' مطابقة للتصفية':''} ${G.none}.</div>`}`}
  const MODES=[['plan','layers','حسب الخطة'],['week','cal','حسب الأسبوع'],['domain','grid','حسب المجال'],['owner','user','حسب المنفذ']];
  return `<section class="panel" id="cd-mg">${embedded?'':`<div class="cd-mgh"><h2>إدارة البرامج</h2><div class="cd-seg" role="tablist">${MODES.map(([m,i,t])=>`<button type="button" class="${D.mode===m?'on':''}" data-mode="${m}">${ic(i)} ${t}</button>`).join('')}</div>${ED?`<button class="btn pri" type="button" id="cd-add">${ic('plus')} إضافة برنامج</button>`:''}</div>`}
  <div class="cd-tools"><input type="search" id="cd-q" placeholder="ابحث باسم البرنامج أو المنفذ أو المكان" value="${esc(D.q)}" aria-label="بحث في البرامج">${D.fs?`<button class="cd-fchip" style="--sc:${SC[D.fs]}" data-fs="">الحالة: ${SL[D.fs]} ✕</button>`:''}</div>${body}</section>`}

function normPhone(v){let d=String(v||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/\D/g,'');if(!d)return '';if(d.startsWith('00'))d=d.slice(2);
  if(/^05\d{8}$/.test(d))d='966'+d.slice(1);else if(/^5\d{8}$/.test(d))d='966'+d;return /^\d{9,15}$/.test(d)?d:null}
const showPhone=d=>!d?'':/^9665\d{8}$/.test(d)?'0'+d.slice(3):'+'+d;
const waLink=(phone,text)=>`https://wa.me/${phone||''}${text?'?text='+encodeURIComponent(text):''}`;
const wa=(p,kind)=>{const t=kind==='late'?`تذكير من منسق الخطة: برنامج «${p.name}» (${p.plan_name}) انتهت فترته في ${dmy(endOf(p))} ولم يُوثَّق تنفيذه بعد. نأمل رفع التوثيق والشواهد في بوابة الخطط الذكية، أو إفادتنا بسبب التأخر.`:`تذكير من منسق الخطة: موعد برنامج «${p.name}» ${startOf(p)?'يبدأ '+dayName(startOf(p))+' '+dmy(startOf(p)):''}${p.time?' الساعة '+t12(p.time):''}${p.location?' في '+p.location:''}. نأمل التنفيذ في موعده ورفع التوثيق والشواهد بعده.`;const ph=(PEOPLE[ownerOf(p)]||{}).phone;return `<a class="btn cd-sm cd-wa" href="${waLink(ph,t)}" target="_blank" rel="noopener" title="فتح واتساب برسالة تذكير جاهزة">${ic('bell')} تذكير</a>`};
const dayName=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{weekday:'long'})}catch(e){return ''}};
const tasksPage=()=>buildDash('tasks'),alertsPage=()=>buildDash('alerts');
function buildDash(view){
  if(!READY)return '<div class="empty">جارٍ تحميل بيانات المتابعة…</div>';
  const ED=canAdd(),today=T(),cw=curWeek(),L=P,total=L.length,cnt=countBy(L);
  const dueL=L.filter(isDue),dueDone=dueL.filter(p=>ds(p)==='مكتمل').length;
  const passed=CAL().filter(w=>w.end_date<today).length;
  const need=L.filter(needs).sort((a,b)=>endOf(a).localeCompare(endOf(b))),stl=L.filter(p=>p.status==='متعثر');
  const appr=L.filter(p=>!p.approved_at&&p.status!=='ملغي'&&exFor(p.id).length).sort((a,b)=>endOf(a).localeCompare(endOf(b)));
  const pid=p=>esc(String(p.id));
  const row=(p,kind,meta,acts)=>`<div class="cd-al" style="--sc:${SC[kind]}"><i></i><a href="#p-${pid(p)}">${esc(p.name)}</a>${meta}${acts?`<span class="acts">${acts}</span>`:''}</div>`;
  const lateRow=p=>row(p,'متأخر',`<span class="m">انتهت فترته ${dmy(endOf(p))} • منذ ${daysBetween(endOf(p),today)} يومًا • ${esc(ownerOf(p))} • ${esc(p.plan_name)}</span>`,ED?`<button class="btn pri cd-sm" data-doc="${pid(p)}">${ic('rep')} توثيق</button><button class="btn cd-sm" data-stall="${pid(p)}">تسجيل التعثر</button><button class="btn cd-sm" data-edit="${pid(p)}">تعديل الموعد</button>${wa(p,'late')}`:'');
  const stallRow=p=>row(p,'متعثر',`<span class="why">السبب: ${esc(p.stall_note||'لم يُكتب سبب')}</span><span class="m">${esc(ownerOf(p))} • ${esc(p.plan_name)}</span>`,ED?`<button class="btn cd-sm" data-stall="${pid(p)}">تعديل السبب</button><button class="btn cd-sm" data-edit="${pid(p)}">إعادة جدولة</button>`:'');
  const apprRow=p=>{const ex=exFor(p.id),last=ex[ex.length-1]||{};return row(p,'مكتمل',`<span class="m">وُثّق ${ex.length>1?ex.length+' مرات':''} • آخر تنفيذ ${dmy(last.date||'')} • ${esc(last.executor||ownerOf(p))} • ${(last.images||[]).length} صور</span>`,`<a class="btn cd-sm" href="#p-${pid(p)}">مراجعة التوثيق</a>${ED&&canApprove()?`<button class="btn pri cd-sm" data-approve="${pid(p)}">${ic('check')} اعتماد</button>`:''}`)};
  if(!['late','stall','appr'].includes(D.at))D.at='late';
  const TABS=[['late','متأخرة التوثيق',need.length,'متأخر'],['stall','متعثرة',stl.length,'متعثر'],['appr','بانتظار الاعتماد',appr.length,'مكتمل']];
  const lists={late:need,stall:stl,appr},cur=lists[D.at],shown=D.all?cur:cur.slice(0,6),rf={late:lateRow,stall:stallRow,appr:apprRow}[D.at];
  const empt={late:'لا توجد برامج متأخرة. كل البرامج التي انتهت فترتها موثقة أو مسجّلة الحالة.',stall:'لا توجد برامج مسجّلة متعثرة.',appr:'لا توجد برامج موثقة بانتظار الاعتماد.'}[D.at];
  // القادم: هذا الأسبوع والأسبوع التالي
  const wl=CAL(),ci=cw?wl.findIndex(w=>w.number===cw.number):wl.findIndex(w=>w.start_date>today);
  const upW=cw?{this:wl[ci],next:wl[ci+1]}:{this:null,next:ci>=0?wl[ci]:null};
  if(!['this','next'].includes(D.up))D.up=upW.this?'this':'next';
  const uw=upW[D.up];const upL=uw?L.filter(p=>inWeek(p,uw)).sort((a,b)=>(startOf(a)+(a.time||'')).localeCompare(startOf(b)+(b.time||''))):[];
  const upRow=p=>{const s=ds(p),st=startOf(p),en=endOf(p),multi=en&&en!==st;return `<div class="cd-up" style="--sc:${SC[s]}"><span class="d"><b>${st&&!multi?esc(dayName(st)):'خلال الأسبوع'}</b><small>${multi?dmy(st)+' – '+dmy(en):dmy(st)}${p.time?' • '+t12(p.time):''}</small></span><span class="n"><a href="#p-${pid(p)}">${esc(p.name)}</a><small><span class="cd-pn sm">${avatar(ownerOf(p),22)}${esc(ownerOf(p))}</span>${p.location?' • '+esc(p.location):''}</small></span><span class="s">${pill(s)}${ED?`<span class="acts">${wa(p,'up')}<button class="btn cd-sm" data-edit="${pid(p)}">تعديل</button></span>`:''}</span></div>`};
  const doms={};for(const p of L){const k=p.domain||'أخرى';(doms[k]||=[]).push(p)}
  const domRows=Object.entries(doms).sort((a,b)=>b[1].length-a[1].length);const dmax=Math.max(1,...domRows.map(r=>r[1].length));
  const owners={};for(const p of L){const k=ownerOf(p);(owners[k]||=[]).push(p)}
  const ownAll=Object.entries(owners).map(([n,l])=>({n,t:l.length,c:countBy(l),d:l.filter(p=>ds(p)==='مكتمل').length,b:l.filter(p=>needs(p)||p.status==='متعثر').length})).sort((a,b)=>b.b-a.b||b.t-a.t||a.n.localeCompare(b.n,'ar'));
  const log=CO.slice().sort((a,b)=>(b.at||'').localeCompare(a.at||'')).slice(0,8);
  const KI={'':'layers','مكتمل':'check','قيد التنفيذ':'clock','لم يبدأ':'cal','متأخر':'bell','متعثر':'x'};
  const KD={'':'اضغط أي بطاقة لعرض برامجها','مكتمل':'موثّقة أو معتمدة','قيد التنفيذ':'يجري تنفيذها الآن','لم يبدأ':'لم يحن موعدها بعد','متأخر':'انتهت فترتها دون توثيق','متعثر':'سُجّل سبب تعثرها'};
  const kpi=(key,label,n,sc)=>{const pc=total?Math.round(n/total*100):0;return `<button type="button" class="cd-kpi${D.fs===key?' on':''}${n&&(key==='متأخر'||key==='متعثر')?' alert':''}" style="--sc:${sc}" data-fs="${key}" aria-pressed="${D.fs===key}" title="${D.fs===key?'إلغاء التصفية':'عرض برامج: '+label}"><span class="kh"><i>${ic(KI[key])}</i><span class="l">${label}</span></span><span class="vr"><span class="v">${n}</span><span class="kg">${pc}%</span></span><span class="cd-mini"><span style="width:${total?n/total*100:0}%"></span></span><span class="kd">${KD[key]}</span></button>`};
  const sh=(id,title,sub)=>`<div class="cd-sh" id="${id}"><h2>${title}</h2>${sub?`<span>${sub}</span>`:''}</div>`;
  const plansUsed=PL.filter(pl=>P.some(p=>p.plan_id===pl.id));
  if(view==='alerts')return `<div class="cd"><p class="cx-intro">ما يحتاج إجراءً منك الآن، وما هو قادم خلال الأسبوعين.</p><div class="cd-grid cd-alertsgrid">
   <section class="panel cd-alerts" id="cd-alerts"><div class="cd-ph"><h2>${ic('bell')} يحتاج إجراء</h2><label class="muted">التنبيه <select class="cd-sel" id="cd-grace" aria-label="متى يظهر التنبيه">${[[0,'فور انتهاء الفترة'],[3,'بعد 3 أيام'],[7,'بعد أسبوع']].map(([v,t])=>`<option value="${v}"${+D.grace===v?' selected':''}>${t}</option>`).join('')}</select></label></div>
    <div class="cd-tabs" role="tablist">${TABS.map(([k,t,n,s])=>`<button type="button" role="tab" aria-selected="${D.at===k}" class="${D.at===k?'on':''}" style="--sc:${SC[s]}" data-at="${k}">${t} <b class="${n?'':'z'}">${n}</b></button>`).join('')}</div>
    ${cur.length?shown.map(rf).join('')+(cur.length>6?`<button class="btn soft cd-sm" id="cd-all" style="margin-top:8px">${D.all?'عرض أقل':'عرض الكل ('+cur.length+')'}</button>`:''):`<div class="cd-empty">${empt}</div>`}</section>
   <section class="panel"><div class="cd-ph"><h2>${ic('cal')} القادم</h2><div class="cd-tabs sm" role="tablist">${upW.this?`<button type="button" class="${D.up==='this'?'on':''}" data-up="this">هذا الأسبوع</button>`:''}${upW.next?`<button type="button" class="${D.up==='next'?'on':''}" data-up="next">الأسبوع ${upW.next.number}</button>`:''}</div></div>
    ${uw?`<p class="muted small" style="margin:0 0 6px">الأسبوع ${uw.number} • ${dmy(uw.start_date)} – ${dmy(uw.end_date)} • ${upL.length} برامج</p>${upL.length?upL.map(upRow).join(''):'<div class="cd-empty">لا توجد برامج مجدولة في هذا الأسبوع.</div>'}`:'<div class="cd-empty">لا توجد أسابيع دراسية قادمة.</div>'}</section>
  </div></div>`;
  // لوحة المهام: طوابير عمل بإجراءات مباشرة (لا مؤشرات إحصائية)
  const unassigned=L.filter(p=>ownerOf(p)==='غير محدد'),legacyN=new Set(L.filter(p=>ownerOf(p)!=='غير محدد'&&!p.owner_staff_id&&!OGROUP[ownerOf(p)]).map(ownerOf));
  const sec=(id,icon,title,n,body,more)=>`<section class="panel cp-sec" id="${id}"><div class="cd-ph"><h2>${ic(icon)} ${title}<b class="cp-n${n?'':' z'}">${n}</b></h2>${more||''}</div>${body}</section>`;
  const lim=(list,fn,empty,max)=>{max=max||5;return list.length?list.slice(0,max).map(fn).join('')+(list.length>max?`<p class="muted small cp-more">و${list.length-max} أخرى…</p>`:''):`<p class="muted cp-empty">${empty}</p>`};
  const all=k=>`<a class="btn soft cd-sm" href="#admin-alerts" data-gotab="${k}">عرض الكل</a>`;
  const unRow=p=>row(p,'لم يبدأ',`<span class="m">${esc(p.plan_name)} • ${startOf(p)?dmy(startOf(p)):'بلا موعد'}</span>`,`<button class="btn pri cd-sm" data-edit="${pid(p)}">${ic('users')} إسناد منفذ</button>`);
  return `<div class="cd cp-board"><div class="cp-grid">
   ${sec('t-appr','check','بانتظار الاعتماد',appr.length,lim(appr,apprRow,'لا توجد برامج موثقة بانتظار الاعتماد.'),appr.length>5?all('appr'):'')}
   ${sec('t-late','bell','متأخرة التوثيق',need.length,lim(need,lateRow,'لا توجد برامج متأخرة. كل ما انتهت فترته موثق أو مسجّلة حالته.'),need.length>5?all('late'):'')}
   ${sec('t-stall','x','متعثرة',stl.length,lim(stl,stallRow,'لا توجد برامج مسجّلة متعثرة.'),stl.length>5?all('stall'):'')}
   ${sec('t-week','cal',uw?(D.up==='next'?'الأسبوع القادم':'هذا الأسبوع'):'القادم',upL.length,uw?`<p class="muted small" style="margin:0 0 6px">الأسبوع ${uw.number} • ${dmy(uw.start_date)} – ${dmy(uw.end_date)}</p>${upL.length?upL.slice(0,6).map(upRow).join('')+(upL.length>6?`<p class="muted small cp-more">و${upL.length-6} أخرى…</p>`:''):'<p class="muted cp-empty">لا برامج مجدولة في هذا الأسبوع.</p>'}`:'<p class="muted cp-empty">لا أسابيع قادمة في التقويم.</p>','<a class="btn soft cd-sm" href="#week">الرزنامة</a>')}
   ${sec('t-own','users','المنفذون',unassigned.length+legacyN.size,(legacyN.size?`<div class="cd-al" style="--sc:var(--warn)"><i></i><span class="m">${legacyN.size} اسمًا مكتوبًا يدويًا تحتاج ربطًا بمنسوبي النواة</span><span class="acts"><a class="btn pri cd-sm" href="#admin-people">${ic('users')} ربط الأسماء</a></span></div>`:'')+lim(unassigned,unRow,legacyN.size?'':'كل البرامج لها منفذ مرتبط بالنواة.'))}
  </div></div>`;
}

/* ---------- النوافذ ---------- */
function openModal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="big" role="dialog" aria-modal="true">${html}</div>`;document.body.append(m);const close=()=>{m.remove();route(true)};m.addEventListener('click',e=>{if(e.target===m)close()});m.addEventListener('keydown',e=>{if(e.key==='Escape')close()});m.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);setTimeout(()=>{const f=m.querySelector('textarea,input,select');f&&f.focus()},30);return {m,close}}
function stallDialog(id){const p=P.find(x=>String(x.id)===String(id));if(!p)return;
  const {m,close}=openModal(`<div class="cd-mh"><h3>تسجيل تعثر البرنامج</h3><button class="btn cd-sm" data-x aria-label="إغلاق">✕</button></div><p class="muted small" style="margin:0">${esc(p.name)} • ${esc(p.owner_name||'')}${endOf(p)?' • انتهت فترته '+dmy(endOf(p)):''}</p>
  <div class="cd-rs">${REASONS.map(r=>`<button type="button" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
  <div class="cd-form"><div class="f full req"><label for="cd-sn">وصف سبب التعثر أو ملاحظة</label><textarea id="cd-sn" placeholder="مثال: تعارض موعد البرنامج مع الاختبارات، ويُقترح نقله إلى الأسبوع القادم">${esc(p.stall_note||'')}</textarea></div></div><div class="cd-err" id="cd-se"></div>
  <div class="cd-ma"><span></span><span><button class="btn" data-x>إلغاء</button><button class="btn pri" id="cd-sok">حفظ الحالة «متعثر»</button></span></div>`);
  m.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const t=m.querySelector('#cd-sn');t.value=t.value.trim()?t.value.trim()+'، '+b.dataset.r:b.dataset.r;t.focus()});
  m.querySelector('#cd-sok').onclick=async e=>{const v=m.querySelector('#cd-sn').value.trim();if(!v){m.querySelector('#cd-se').textContent='اكتب سبب التعثر قبل الحفظ.';return}
    e.target.disabled=true;try{await saveEdit(p,{status:'متعثر',stall_note:v},'سُجّل متعثرًا: '+v.slice(0,60));close();toast('سُجّل البرنامج متعثرًا')}catch(err){e.target.disabled=false;m.querySelector('#cd-se').textContent=err.message||'تعذّر الحفظ'}}}
function editor(id,preset){const isNew=id==null;const p0=isNew?null:P.find(x=>String(x.id)===String(id));if(!isNew&&!p0)return;
  const p=isNew?{name:'',plan_id:+D.plan||(PL[0]||{}).id,domain:'',planned_date:'',planned_end:'',time:'',location:'',owner_name:'',beneficiary:'',goal:'',indicator:'',required_evidence:'',status:'لم يبدأ',stall_note:'',...preset}:{...p0,planned_date:startOf(p0),planned_end:endOf(p0)};
  const topics=[...new Set(P.map(x=>x.domain).filter(Boolean).concat(LOOK().domain||[]))];const ex=isNew?[]:exFor(p0.id);
  const plans=PL.slice();
  const {m,close}=openModal(`<div class="cd-mh"><h3>${isNew?'إضافة برنامج إلى الخطة':'تعديل البرنامج'}</h3><button class="btn cd-sm" data-x aria-label="إغلاق">✕</button></div>
  ${isNew?'':`<div class="cd-info" style="margin-bottom:12px"><span>${esc(p.code)} • ${pill(ds(p0))}</span><span>${ex.length?`موثق ${ex.length} مرة • آخر تنفيذ ${dmy(ex[ex.length-1].date||'')}`:'لم يُوثَّق تنفيذ بعد'}${p0.approved_at?' • معتمد '+dmy(p0.approved_at):''}</span><span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn soft cd-sm" id="cf-doc">${ic('rep')} توثيق ورفع الشواهد</button><a class="btn cd-sm" href="#p-${esc(String(p.id))}" data-x>فتح صفحة البرنامج</a></span></div>`}
  <div class="cd-form">
   <div class="f full req"><label for="cf-name">اسم البرنامج</label><input id="cf-name" value="${esc(p.name)}"></div>
   <div class="f"><label for="cf-plan">الخطة</label><select id="cf-plan">${plans.map(pl=>`<option value="${pl.id}"${String(pl.id)===String(p.plan_id)?' selected':''}>${esc(pl.name)}</option>`).join('')}</select></div>
   <div class="f"><label for="cf-dom">المجال</label>${domainSelect(p.domain||'','id="cf-dom"')}</div>
   <div class="f req"><label for="cf-s">من تاريخ</label><input id="cf-s" type="date" value="${esc(p.planned_date||'')}"></div>
   <div class="f"><label for="cf-e">إلى تاريخ</label><input id="cf-e" type="date" value="${esc(p.planned_end||'')}"></div>
   <div class="f"><label for="cf-t">الوقت</label><input id="cf-t" type="time" value="${esc(p.time||'')}"></div>
   <div class="f"><label for="cf-loc">المكان</label><input id="cf-loc" value="${esc(p.location||'')}"></div>
   <div class="f"><label for="cf-own">المنفذ</label>${ownerSelect((p.owner_name||'').trim(),'id="cf-own"')}</div>
   <div class="f"><label for="cf-ben">الفئة المستفيدة</label><input id="cf-ben" list="cf-bens" value="${esc(p.beneficiary||'')}"><datalist id="cf-bens">${(LOOK().beneficiary||[]).map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div>
   <div class="f full"><label for="cf-goal">الهدف</label><textarea id="cf-goal">${esc(p.goal||'')}</textarea></div>
   <div class="f full"><label for="cf-ind">المؤشر</label><input id="cf-ind" value="${esc(p.indicator||'')}"></div>
   <div class="f full"><label for="cf-ev">الشواهد المطلوبة (افصل بينها بـ ؛)</label><textarea id="cf-ev">${esc(p.required_evidence||'')}</textarea></div>
   <div class="f"><label for="cf-st">الحالة</label><select id="cf-st">${STS.map(x=>`<option value="${x}"${x===(p.status||'لم يبدأ')?' selected':''}>${SL[x]}</option>`).join('')}</select></div>
   <div class="f"><label for="cf-ap" style="visibility:hidden">اعتماد</label><label style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--ink);padding:8px 0"><input type="checkbox" id="cf-ap" style="width:auto"${p.approved_at?' checked':''}> اعتماد حالة البرنامج</label></div>
   <div class="f full req" id="cf-nw"${p.status==='متعثر'?'':' hidden'}><label for="cf-note">سبب التعثر</label><div class="cd-rs" style="margin:0">${REASONS.map(r=>`<button type="button" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div><textarea id="cf-note" placeholder="اكتب وصف التعثر أو ملاحظة">${esc(p.stall_note||'')}</textarea></div>
  </div><div class="cd-err" id="cf-err"></div>
  <div class="cd-ma"><span>${!isNew?'<button class="btn cd-bad" id="cf-del">حذف البرنامج</button>':''}</span><span><button class="btn" data-x>إلغاء</button><button class="btn pri" id="cf-save">${isNew?'إضافة البرنامج':'حفظ التعديلات'}</button></span></div>`);
  const $=s=>m.querySelector(s);
  const dbtn=$('#cf-doc');if(dbtn)dbtn.onclick=()=>{m.remove();execForm(p0)};
  $('#cf-st').onchange=()=>{$('#cf-nw').hidden=$('#cf-st').value!=='متعثر'};
  $('#cf-s').onchange=()=>{if(!$('#cf-e').value||$('#cf-e').value<$('#cf-s').value)$('#cf-e').value=$('#cf-s').value};
  m.querySelectorAll('#cf-nw [data-r]').forEach(b=>b.onclick=()=>{const t=$('#cf-note');t.value=t.value.trim()?t.value.trim()+'، '+b.dataset.r:b.dataset.r});
  const del=$('#cf-del');if(del)del.onclick=async()=>{if(!del.dataset.sure){del.dataset.sure=1;del.textContent='اضغط مجددًا لتأكيد الحذف';return}del.disabled=true;try{await write({type:'remove',progId:String(p0.id),name:p0.name});close();toast('حُذف البرنامج، ويمكنك استعادته من «المحذوفات»')}catch(e){$('#cf-err').textContent=e.message}};
  $('#cf-save').onclick=async e=>{
    const f={name:$('#cf-name').value.trim(),plan_id:+$('#cf-plan').value,domain:$('#cf-dom').value.trim(),planned_date:$('#cf-s').value,planned_end:$('#cf-e').value||$('#cf-s').value,time:$('#cf-t').value,location:$('#cf-loc').value.trim(),owner_name:$('#cf-own').value.trim(),beneficiary:$('#cf-ben').value.trim(),goal:$('#cf-goal').value.trim(),indicator:$('#cf-ind').value.trim(),required_evidence:$('#cf-ev').value.trim(),status:$('#cf-st').value,stall_note:$('#cf-st').value==='متعثر'?$('#cf-note').value.trim():''};
    f.approved_at=$('#cf-ap').checked?(p.approved_at||T()):'';
    const err=!f.name?'اكتب اسم البرنامج.':!f.planned_date?'حدد تاريخ البداية.':f.planned_end<f.planned_date?'تاريخ النهاية قبل تاريخ البداية.':f.status==='متعثر'&&!f.stall_note?'اكتب سبب التعثر.':'';
    if(err){$('#cf-err').textContent=err;return}
    e.target.disabled=true;e.target.textContent='جارٍ الحفظ…';
    try{if(isNew){await write({type:'add',name:f.name,data:f});close();toast('أُضيف البرنامج إلى الخطة')}
      else{const cmp={...f};const ch=await saveEdit(p0,{...cmp,planned_date:f.planned_date,planned_end:f.planned_end},null);close();toast(ch?'حُفظت التعديلات':'لا توجد تغييرات')}}
    catch(er){e.target.disabled=false;e.target.textContent=isNew?'إضافة البرنامج':'حفظ التعديلات';$('#cf-err').textContent=er.message||'تعذّر الحفظ'}}}

function personDialog(name){toPlans('owner',{own:name})}

/* ---------- إضافة خطة جديدة وتعديلها ---------- */
const PCOLORS=[[0,'فيروزي'],[3,'أصفر'],[2,'بنفسجي'],[1,'أزرق'],[4,'أخضر'],[5,'وردي']];
function planDialog(id){const isNew=id==null,pl=isNew?{name:'',desc:'',owner:'',year:'1448هـ',color:''}:{...(PL.find(x=>String(x.id)===String(id))||{})};
  const used=new Set(PL.map(x=>PC(x.id)));const defc=isNew?(PCOLORS.find(c=>!used.has(c[0]))||PCOLORS[0])[0]:PC(pl.id);
  const n=isNew?0:P.filter(p=>String(p.plan_id)===String(pl.id)).length;
  const {m,close}=openModal(`<div class="cd-mh"><h3>${isNew?'إضافة خطة جديدة':'تعديل الخطة'}</h3><button class="btn cd-sm" data-x aria-label="إغلاق">✕</button></div>
  <div class="cd-form">
   <div class="f full req"><label for="pl-name">اسم الخطة</label><input id="pl-name" value="${esc(pl.name||'')}" placeholder="مثال: خطة النشاط الطلابي 1448هـ"></div>
   <div class="f"><label for="pl-own">المسؤول عن الخطة</label>${ownerSelect((pl.owner||'').trim(),'id="pl-own"')}</div>
   <div class="f"><label for="pl-year">العام / الفترة</label><input id="pl-year" value="${esc(pl.year||'1448هـ')}"></div>
   <div class="f full"><label for="pl-desc">وصف الخطة وهدفها</label><textarea id="pl-desc" placeholder="الهدف العام من الخطة ومجالها">${esc(pl.desc||'')}</textarea></div>
   <div class="f full"><label for="pl-pdf">ملف الخطة (PDF)</label><div class="pl-pdf">${pl.pdf&&pl.pdf.url?`<span class="pl-pdf-cur"><a href="${esc(pl.pdf.url)}" target="_blank" rel="noopener">${esc(pl.pdf.name||'ملف الخطة.pdf')}</a><label class="pl-pdf-rm"><input type="checkbox" id="pl-pdf-rm"> إزالة الملف</label></span>`:''}<input id="pl-pdf" type="file" accept="application/pdf,.pdf"><small class="muted">${pl.pdf&&pl.pdf.url?'اختر ملفًا جديدًا لاستبدال الحالي. ':''}يُحفظ الملف ويظهر في صفحة الخطة للاطلاع والتنزيل (حتى 25 ميجابايت).</small></div></div>
   <div class="f full"><label>لون الخطة</label><div class="pl-cols" role="radiogroup" aria-label="لون الخطة">${PCOLORS.map(([c,t])=>`<label class="pl-col" style="--b:var(--c${c}b);--f:var(--c${c}f)" title="${t}"><input type="radio" name="pl-color" value="${c}"${c===defc?' checked':''}><span></span>${t}</label>`).join('')}</div></div>
  </div><div class="cd-err" id="pl-err"></div>
  <div class="cd-ma"><span>${!isNew?(n?`<small class="muted">لحذف الخطة انقل برامجها (${n}) أو احذفها أولًا.</small>`:'<button class="btn cd-bad" id="pl-del">حذف الخطة</button>'):''}</span><span><button class="btn" data-x>إلغاء</button><button class="btn pri" id="pl-save">${isNew?'إضافة الخطة':'حفظ'}</button></span></div>`);
  const $=s=>m.querySelector(s);
  const del=$('#pl-del');if(del)del.onclick=async()=>{if(!del.dataset.sure){del.dataset.sure=1;del.textContent='اضغط مجددًا لتأكيد الحذف';return}del.disabled=true;try{await write({type:'plan-remove',planId:pl.id,name:pl.name});D.mplan='all';saveUI();close();toast('حُذفت الخطة')}catch(e){$('#pl-err').textContent=e.message}};
  $('#pl-save').onclick=async e=>{const f={name:$('#pl-name').value.trim().replace(/\s+/g,' '),owner:$('#pl-own').value.trim(),year:$('#pl-year').value.trim(),desc:$('#pl-desc').value.trim(),color:+((m.querySelector('[name=pl-color]:checked')||{}).value||0)};
    if(!f.name){$('#pl-err').textContent='اكتب اسم الخطة.';return}
    if(PL.some(x=>x.name===f.name&&String(x.id)!==String(pl.id))){$('#pl-err').textContent='توجد خطة بهذا الاسم.';return}
    const file=$('#pl-pdf').files[0];
    if(file&&!(file.type==='application/pdf'||/\.pdf$/i.test(file.name))){$('#pl-err').textContent='الملف يجب أن يكون بصيغة PDF.';return}
    if(file&&file.size>25*1024*1024){$('#pl-err').textContent='حجم الملف أكبر من 25 ميجابايت.';return}
    e.target.disabled=true;
    try{if(file){if(!ASSETS)throw new Error('سجّل الدخول لرفع الملف');e.target.textContent='جارٍ رفع الملف…';const up=await ASSETS.upload(file);f.pdf={id:up.id,url:up.url,name:file.name,size:file.size,at:new Date().toISOString()}}
      else if($('#pl-pdf-rm')&&$('#pl-pdf-rm').checked)f.pdf=null;if(isNew){const nid=Math.max(1000,...PL.map(x=>+x.id||0))+1;await write({type:'plan-add',name:f.name,plan:{id:nid,...f}});D.mplan=String(nid);D.pmode='plan';saveUI();close();toast('أُضيفت الخطة. أضف برامجها من السطر الأخير في الجدول');if(location.hash!=='#admin-plans')location.hash='#admin-plans'}
      else{await write({type:'plan-edit',planId:pl.id,name:f.name,fields:f});close();toast('حُفظت الخطة')}}
    catch(er){e.target.disabled=false;e.target.textContent=isNew?'إضافة الخطة':'حفظ';$('#pl-err').textContent=er.message||'تعذّر الحفظ'}}}
// متاحة لصفحات الخطط التعريفية
window.CD_planDialog=planDialog;window.CD_avatar=(n,s)=>avatar(n,s);window.CD_role=n=>(PEOPLE[n]&&PEOPLE[n].role)||'';

/* ---------- صفحة إدارة الخطة (تُفتح من أيقونة أعلى الموقع) ---------- */
const pageHead=()=>''; // الوصف صار في رأس الصفحة الموحّد
const benList=()=>[...new Set([...(LOOK().beneficiary||[]),...(LOOK().sub_beneficiary||[])])];
function plansPage(){
  if(!READY)return '<div class="empty">جارٍ تحميل الخطط…</div>';
  if(!['plan','week','domain','owner'].includes(D.pmode))D.pmode='plan';
  const PSEG=`<div class="cd-seg cd-pseg" role="tablist" aria-label="طريقة العرض">${[['plan','layers','حسب الخطة'],['week','cal','حسب الأسبوع'],['domain','grid','حسب المجال'],['owner','user','حسب المنفذ']].map(([m,i,t])=>`<button type="button" role="tab" aria-selected="${D.pmode===m}" class="${D.pmode===m?'on':''}" data-pmode="${m}">${ic(i)} ${t}</button>`).join('')}</div>`;
  if(D.pmode!=='plan'){D.mode=D.pmode;return `<div class="cd"><p class="cx-intro">عدّل برامج الخطط ووثّقها واعتمدها، واختر طريقة العرض المناسبة.</p>${PSEG}${manage(canAdd(),true)}</div>`}
  const ED=canAdd(),plans=PL.slice();if(!plans.length)return '<div class="cd-empty">لا توجد خطط.</div>';
  const ALL=D.mplan==='all';
  const pl=ALL?{id:'all',name:'كل الخطط'}:(plans.find(x=>String(x.id)===String(D.mplan))||plans[0]),all=ALL?P.slice():P.filter(p=>String(p.plan_id)===String(pl.id));
  const q=(D.pq||'').trim(),list=all.filter(p=>(!D.fs||ds(p)===D.fs)&&(!q||(p.name+ownerOf(p)+(p.beneficiary||'')+(p.code||'')).includes(q))).sort((a,b)=>(startOf(a)||'9').localeCompare(startOf(b)||'9')||a.name.localeCompare(b.name,'ar'));
  const row=(p,i)=>{const id=esc(String(p.id));return `<tr data-id="${id}"><td class="cd-num">${i+1}</td>
    <td>${ED?`<input class="nm" data-f="name" value="${esc(p.name)}" aria-label="اسم البرنامج">`:esc(p.name)}${ALL?`<small class="cd-code">${esc(p.plan_name)}</small>`:''}</td>
    <td>${ED?ownerSelect(ownerOf(p),'data-f="owner_name" aria-label="المنفذ"'):esc(ownerOf(p))}</td>
    <td>${ED?`<input type="date" data-f="planned_date" value="${esc(startOf(p))}" aria-label="تاريخ البداية">`:esc(dmy(startOf(p))||'—')}</td>
    <td>${ED?`<input type="date" data-f="planned_end" value="${esc(endOf(p))}" aria-label="تاريخ النهاية">`:esc(dmy(endOf(p))||'—')}</td>
    <td>${ED?`<input class="bn" data-f="beneficiary" list="cd-bens" value="${esc(p.beneficiary||'')}" aria-label="الفئة المستهدفة">`:esc(p.beneficiary||'—')}</td>
    ${ED?`<td><button class="btn cd-bad cd-sm" data-del="${id}" title="حذف البرنامج">حذف</button></td>`:''}</tr>`};
  return `<div class="cd">${pageHead('إدارة الخطة','بيانات برامج الخطة','عدّل برامج الخطط ووثّقها واعتمدها، واختر طريقة العرض المناسبة.')}${PSEG}
  <section class="panel"><div class="cd-mgh"><label class="cd-plpick"><span>الخطة</span><select id="cd-mplan" aria-label="اختر الخطة"><option value="all"${ALL?' selected':''}>كل الخطط (${P.length})</option>${plans.map(x=>`<option value="${x.id}"${x===pl?' selected':''}>${esc(x.name)} (${P.filter(p=>String(p.plan_id)===String(x.id)).length})</option>`).join('')}</select></label>${ED?`<button class="btn soft cd-sm" type="button" data-pl-new>${ic('plus')} خطة جديدة</button>${ALL?'':`<button class="btn cd-sm" type="button" data-pl-edit="${esc(String(pl.id))}">${ic('edit')} تعديل الخطة</button>`}`:''}<input type="search" class="cd-srch" id="cd-pq" placeholder="ابحث في برامج الخطة" value="${esc(D.pq||'')}" aria-label="بحث في برامج الخطة">${D.fs?`<button class="cd-fchip" style="--sc:${SC[D.fs]}" data-fs="">الحالة: ${SL[D.fs]} ✕</button>`:''}<span class="muted small">${list.length} برنامجًا</span></div>
   ${!ALL&&(pl.desc||pl.owner)?`<div class="pl-info" style="${C(PC(pl.id))}">${ic('plan')}<span>${pl.desc?esc(pl.desc):''}${pl.owner?`<small>المسؤول: ${esc(pl.owner)}${pl.year?' • '+esc(pl.year):''}</small>`:''}</span></div>`:''}
   <datalist id="cd-bens">${benList().map(b=>`<option value="${esc(b)}">`).join('')}</datalist>
   <div class="cd-tw"><table class="cd-t cd-plt"><thead><tr><th>#</th><th>اسم البرنامج</th><th>المنفذ</th><th>تاريخ البداية</th><th>تاريخ النهاية</th><th>الفئة المستهدفة</th>${ED?'<th></th>':''}</tr></thead><tbody>
   ${list.map(row).join('')||`<tr><td colspan="7"><div class="cd-empty">${q?'لا توجد برامج مطابقة للبحث.':'لا توجد برامج في هذه الخطة بعد.'}</div></td></tr>`}
   ${ED&&!ALL?`<tr class="cd-newrow"><td class="cd-num">${ic('plus')}</td><td><input id="np-name" class="nm" placeholder="اسم برنامج جديد" aria-label="اسم البرنامج الجديد"></td><td>${ownerSelect('','id="np-own" aria-label="منفذ البرنامج الجديد"')}</td><td><input type="date" id="np-s" aria-label="تاريخ البداية"></td><td><input type="date" id="np-e" aria-label="تاريخ النهاية"></td><td><input id="np-ben" class="bn" list="cd-bens" placeholder="الفئة المستهدفة" aria-label="الفئة المستهدفة"></td><td><button class="btn pri cd-sm" type="button" id="np-add">إضافة</button></td></tr>`:''}
   </tbody></table></div><div class="cd-err" id="np-err"></div>
   <p class="muted small" style="margin:6px 0 0">${ED?'يُحفظ تعديل أي خانة فور تغييرها، ويظهر في كل صفحات الموقع ولوحة التحكم. البرنامج المحذوف ينتقل إلى صفحة «المحذوفات» في شريط لوحة التحكم ويمكن استعادته منها.':'سجّل الدخول من «دخول المحررين» لتعديل الخطة وإضافة البرامج.'}</p></section>
  ${ED&&REMOVED.length?`<a class="panel cd-trlink" href="#admin-trash">${ic('x')} <span>المحذوفات</span><b>${REMOVED.length}</b><small>اضغط لعرضها واستعادتها</small></a>`:''}</div>`}

/* ---------- صفحة المحذوفات ---------- */
function trashPage(){
  if(!READY)return '<div class="empty">جارٍ التحميل…</div>';
  return `<div class="cd"><p class="cx-intro">البرامج المحذوفة لا تظهر في صفحات الموقع. «استعادة» تعيد البرنامج كما كان، ببياناته وتوثيقه وصوره.</p>
  <section class="panel">${REMOVED.length?`<div class="cd-tw"><table class="cd-t cd-trt"><thead><tr><th>البرنامج</th><th>الخطة</th><th>المنفذ</th><th>التوثيق</th><th>تاريخ الحذف</th><th></th></tr></thead><tbody>${REMOVED.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.plan||'—')}</td><td>${esc(r.owner||'—')}</td><td>${r.docs?`<span class="cd-doc ok">${ic('check')} موثق</span>`:'<span class="cd-doc">—</span>'}</td><td>${r.at?esc((d=>`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`)(new Date(r.at))):'—'}${r.by&&r.by.includes('@')?`<small class="cd-by">${esc(r.by)}</small>`:''}</td><td><button class="btn pri cd-sm" data-restore="${esc(r.id)}" data-rname="${esc(r.name)}">استعادة</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="cd-empty">${ic('check')}<br>لا توجد برامج محذوفة. عند حذف برنامج من جداول لوحة التحكم يظهر هنا ويمكن استعادته.</div>`}</section></div>`}

/* ---------- صفحة المنفذين — منسوبو النواة المسندة إليهم برامج ---------- */
const sugg=n=>{const t=new Set(normN(n).split(' ').filter(w=>w.length>1&&!['بن','ابن','عبد'].includes(w)));let best=null,bs=0;
  for(const m of ((window.SP&&SP.staff)||[])){let k=0;for(const w of normN(m.name).split(' '))if(t.has(w))k++;if(k>bs){bs=k;best=m}}
  return bs>=2||(bs>=1&&t.size===1)?best:null};
function peoplePage(){
  if(!READY)return '<div class="empty">جارٍ تحميل المنفذين…</div>';
  const ED=canAdd(),DIR=dirOf(),q=(D.uq||'').trim(),cnt={},legacy={};let none=0;
  for(const p of P){const n=ownerOf(p);if(n==='غير محدد'){none++;continue}if(p.owner_staff_id&&DIR[p.owner_staff_id])cnt[p.owner_staff_id]=(cnt[p.owner_staff_id]||0)+1;else if(!OGROUP[n])legacy[n]=(legacy[n]||0)+1}
  const rows=Object.keys(cnt).map(id=>DIR[id]).filter(m=>!q||(m.name+(m.title||'')).includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  const lg=Object.entries(legacy).sort((a,b)=>b[1]-a[1]),st=(window.SP&&SP.staff)||[];
  const pn=t=>t===1?'برنامج واحد':t===2?'برنامجان':t+(t<=10?' برامج':' برنامجًا');
  const lgRows=lg.map(([n,t],i)=>{const sg=sugg(n);return `<tr><td><b>${esc(n)}</b><div class="muted small">اسم مكتوب يدويًا قبل الربط بالنواة</div></td><td><button class="btn soft cd-sm" data-own="${esc(n)}">${pn(t)}</button></td>
    <td>${ED?`<select class="cd-olsel" data-ol="${esc(n)}" aria-label="منسوب النواة الموافق لـ ${esc(n)}"><option value="">— اختر منسوب النواة —</option>${st.map(m=>`<option value="${esc(m.id)}"${sg&&sg.id===m.id?' selected':''}>${esc(m.name)}${m.title?' — '+esc(m.title):''}</option>`).join('')}</select>`:'<span class="muted small">غير مرتبط</span>'}</td>
    <td>${ED?`<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri cd-sm" data-olink="${esc(n)}">${ic('check')} ربط</button><button class="btn cd-sm" data-ogroup="${esc(n)}" title="اسم فريق أو جهة أو مجموعة وليس شخصًا">جهة أو مجموعة</button></span>`:''}</td></tr>`}).join('');
  return `<div class="cd">
  <section class="panel"><div class="cd-mgh"><input type="search" class="cd-srch" id="cd-uq" placeholder="ابحث بالاسم أو المسمى" value="${esc(D.uq||'')}" aria-label="بحث في المنفذين"><span class="muted small">${rows.length} منفذًا من منسوبي النواة${none?' • '+none+' برنامجًا بلا منفذ':''}</span></div>
   <div class="cd-tw"><table class="cd-t cd-ut"><thead><tr><th>الصورة</th><th>الاسم</th><th>المسمى الوظيفي</th><th>التواصل</th><th>البرامج</th></tr></thead><tbody>
   ${rows.map(m=>{const pp=PEOPLE[m.name]||{};return `<tr><td>${avatar(m.name,44)}</td><td><b>${esc(m.name)}</b></td><td>${esc(m.title||'—')}</td>
    <td>${pp.phone?`<a class="cd-wab" href="${waLink(pp.phone,'')}" target="_blank" rel="noopener" title="مراسلة ${esc(m.name)} على واتساب" aria-label="واتساب ${esc(m.name)}">${WAICON}</a>`:'<span class="muted small">—</span>'}</td>
    <td><button class="btn soft cd-sm" data-own="${esc(m.name)}">${pn(cnt[m.id])}</button></td></tr>`}).join('')||'<tr><td colspan="5"><div class="cd-empty">لا يوجد منفذون مرتبطون بالنواة بعد. أسند برنامجًا إلى أحد المنسوبين من «إدارة الخطة».</div></td></tr>'}
   </tbody></table></div>
   <p class="muted small" style="margin:6px 0 0">الاسم والمسمى والصورة تُدار من النواة الرقمية وتتحدث هنا تلقائيًا؛ يُسنَد المنفذ من قائمة المنسوبين عند إضافة البرنامج أو تعديله.</p></section>
  ${lg.length?`<section class="panel" id="cd-legacy"><div class="cd-mgh"><h2 style="margin:0;font-size:1.05rem">أسماء تحتاج ربطًا بالنواة</h2><span class="muted small">${lg.length} اسمًا</span></div>
   <p class="muted small" style="margin:0 0 8px">أسماء المنفذين المكتوبة يدويًا في الخطة. اربط كل اسم بمنسوبه في النواة (الاقتراح التلقائي من تشابه الاسم) فينتقل الربط إلى كل برامجه.</p>
   <div class="cd-tw"><table class="cd-t"><thead><tr><th>الاسم الحالي</th><th>البرامج</th><th>منسوب النواة</th><th></th></tr></thead><tbody>${lgRows}</tbody></table></div><div class="cd-err" id="ol-err"></div></section>`:''}
  </div>`}
async function upPhoto(f){if(!ASSETS)throw new Error('رفع الصور يتطلب تسجيل الدخول');if(!/^image\//.test(f.type))throw new Error('اختر ملف صورة.');const r=await ASSETS.upload(await shrink(f).catch(()=>f));return {id:r.id,url:r.url}}

/* ---------- الربط ---------- */
let tip=null;
function bindTips(v){v.querySelectorAll('[data-tip]').forEach(el=>{
  el.addEventListener('pointerenter',()=>{tip=tip||Object.assign(document.createElement('div'),{id:'cd-tip'});tip.textContent=el.dataset.tip;document.body.append(tip)});
  el.addEventListener('pointermove',e=>{if(!tip)return;const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX-w/2,y=e.clientY-h-14;x=Math.max(8,Math.min(innerWidth-w-8,x));if(y<8)y=e.clientY+18;tip.style.left=x+'px';tip.style.top=y+'px'});
  el.addEventListener('pointerleave',()=>{tip&&tip.remove()});el.addEventListener('focus',()=>{const r=el.getBoundingClientRect();tip=tip||Object.assign(document.createElement('div'),{id:'cd-tip'});tip.textContent=el.dataset.tip;document.body.append(tip);tip.style.left=Math.max(8,r.left)+'px';tip.style.top=Math.max(8,r.top-tip.offsetHeight-8)+'px'});el.addEventListener('blur',()=>{tip&&tip.remove()})})}
const toPlans=(mode,patch)=>{Object.assign(D,patch||{});D.pmode=mode;if(mode!=='plan')D.mode=mode;saveUI();tip&&tip.remove();if(location.hash!=='#admin-plans')location.hash='#admin-plans';else route(true);setTimeout(()=>scrollTo({top:0,behavior:'smooth'}),60)};
const toMg=()=>{const g=document.getElementById('cd-mg');g&&g.scrollIntoView({behavior:'smooth',block:'start'})};
function bind(v){
  bindTips(v);

  v.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>{const k=b.dataset.fs;if(location.hash==='#admin'&&!b.classList.contains('cd-fchip')){D.fs=k;toPlans('plan',{mplan:'all',pq:''});return}D.fs=D.fs===k?'':k;route(true)});
  v.querySelectorAll('[data-pl-new]').forEach(b=>b.onclick=()=>planDialog(null));
  v.querySelectorAll('[data-pl-edit]').forEach(b=>b.onclick=()=>planDialog(b.dataset.plEdit));
  v.querySelectorAll('[data-pmode]').forEach(b=>b.onclick=()=>toPlans(b.dataset.pmode));
  v.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{D.mode=b.dataset.mode;if(D.mode!=='plan')D.pmode=D.mode;saveUI();route(true)});
  v.querySelectorAll('[data-plan]').forEach(b=>b.onclick=e=>{e.preventDefault();toPlans('plan',{mplan:b.dataset.plan,plan:b.dataset.plan,pq:''})});
  v.querySelectorAll('[data-grp]').forEach(b=>b.onclick=()=>{const st={plan:'plan',domain:'dom',owner:'own'}[D.mode];D[st]=b.dataset.grp;saveUI();route(true)});
  const go=(el,fn)=>{el.onclick=fn;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}}};
  v.querySelectorAll('[data-gotab]').forEach(a=>a.addEventListener('click',()=>{D.at=a.dataset.gotab;D.all=false;saveUI()}));
  v.querySelectorAll('[data-dom]').forEach(el=>go(el,()=>toPlans('domain',{dom:el.dataset.dom})));
  v.querySelectorAll('[data-own]').forEach(el=>go(el,()=>toPlans('owner',{own:el.dataset.own})));
  const mp=v.querySelector('#cd-mplan');if(mp)mp.onchange=()=>{D.mplan=mp.value;D.pq='';saveUI();route(true)};
  v.querySelectorAll('[data-olink]').forEach(b=>b.onclick=async()=>{const n=b.dataset.olink,sel=[...v.querySelectorAll('[data-ol]')].find(x=>x.dataset.ol===n),er=v.querySelector('#ol-err');
    if(!sel||!sel.value){if(er)er.textContent='اختر منسوب النواة أولًا.';return}
    b.disabled=true;try{await write({type:'owner-link',from:n,staff_id:sel.value,name:n});toast('رُبط الاسم بمنسوب النواة')}catch(e){b.disabled=false;if(er)er.textContent=e.message||'تعذّر الربط'}});
  v.querySelectorAll('[data-ogroup]').forEach(b=>b.onclick=async()=>{const n=b.dataset.ogroup,er=v.querySelector('#ol-err');
    b.disabled=true;try{await write({type:'owner-link',from:n,group:true,name:n});toast('اعتُمد الاسم جهة أو مجموعة')}catch(e){b.disabled=false;if(er)er.textContent=e.message||'تعذّر الحفظ'}});
  const sq=(id,k)=>{const el=v.querySelector(id);if(!el)return;let t;el.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{D[k]=el.value;route(true);const n=document.querySelector(id);if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},250)}};
  sq('#cd-pq','pq');sq('#cd-uq','uq');
  const ns=v.querySelector('#np-s');if(ns)ns.onchange=()=>{const e=v.querySelector('#np-e');if(!e.value||e.value<ns.value)e.value=ns.value};
  const na=v.querySelector('#np-add');if(na)na.onclick=async()=>{const g=id=>v.querySelector(id).value.trim(),er=v.querySelector('#np-err');
    const f={name:g('#np-name'),owner_name:g('#np-own'),beneficiary:g('#np-ben'),planned_date:g('#np-s'),planned_end:g('#np-e')||g('#np-s'),plan_id:+(document.getElementById('cd-mplan')||{}).value||+D.mplan,status:'لم يبدأ'};
    const m=!f.name?'اكتب اسم البرنامج.':!f.planned_date?'حدد تاريخ البداية.':f.planned_end<f.planned_date?'تاريخ النهاية قبل البداية.':'';
    if(m){er.textContent=m;return}na.disabled=true;
    try{await write({type:'add',name:f.name,data:f});toast('أُضيف البرنامج إلى الخطة');setTimeout(()=>{const n=document.getElementById('np-name');n&&n.focus()},300)}catch(e){na.disabled=false;er.textContent=e.message||'تعذّر الإضافة'}};
  v.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!b.dataset.sure){b.dataset.sure=1;b.textContent='تأكيد الحذف؟';setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent='حذف'}},4000);return}
    const p=P.find(x=>String(x.id)===b.dataset.del);if(!p)return;b.disabled=true;try{await write({type:'remove',progId:String(p.id),name:p.name});toast('حُذف البرنامج، ويمكنك استعادته من «المحذوفات»')}catch(e){b.disabled=false;toast(e.message)}});
  v.querySelectorAll('.cd-trash').forEach(d=>d.ontoggle=()=>{D.trash=d.open});
  v.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await write({type:'restore',progId:b.dataset.restore,name:b.dataset.rname});toast('استُعيد البرنامج')}catch(e){b.disabled=false;toast(e.message||'تعذّرت الاستعادة')}});
  v.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>personDialog(b.dataset.person));
  v.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>{const p=P.find(x=>String(x.id)===b.dataset.doc);if(p){tip&&tip.remove();execForm(p)}});
  v.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>toPlans('week',{week:+b.dataset.week}));
  v.querySelectorAll('[data-wstep]').forEach(b=>b.onclick=()=>{const a=CAL(),i=a.findIndex(w=>w.number===+D.week)+ +b.dataset.wstep;if(a[i]){D.week=a[i].number;saveUI();route(true)}});
  const wn=v.querySelector('[data-wnow]');if(wn)wn.onclick=()=>{const c=curWeek();if(c){D.week=c.number;saveUI();route(true)}};
  const wk=v.querySelector('#cd-wk');if(wk)wk.onchange=()=>{D.week=+wk.value;saveUI();route(true)};
  const gr=v.querySelector('#cd-grace');if(gr)gr.onchange=()=>{D.grace=+gr.value;saveUI();route(true);updBell()};
  v.querySelectorAll('[data-at]').forEach(b=>b.onclick=()=>{D.at=b.dataset.at;D.all=false;route(true)});
  v.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{D.up=b.dataset.up;route(true)});
  v.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{const t=document.getElementById(b.dataset.jump);t&&t.scrollIntoView({behavior:'smooth',block:'start'})});
  const al=v.querySelector('#cd-all');if(al)al.onclick=()=>{D.all=!D.all;route(true)};
  const q=v.querySelector('#cd-q');if(q){let t;q.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{D.q=q.value;route(true);const n=document.getElementById('cd-q');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},250)}}
  const add=v.querySelector('#cd-add');if(add)add.onclick=()=>{if(D.mode==='week'){const w=wkInfo(D.week)||curWeek();editor(null,w?{planned_date:w.start_date,planned_end:w.end_date}:{})}else editor(null,D.mode==='domain'?{domain:D.dom==='مجالات أخرى'?'':D.dom}:D.mode==='owner'?{owner_name:D.own==='غير محدد'?'':D.own}:{plan_id:+D.plan||(PL[0]||{}).id})};
  v.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editor(b.dataset.edit));
  v.querySelectorAll('[data-stall]').forEach(b=>b.onclick=()=>stallDialog(b.dataset.stall));
  v.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{const p=P.find(x=>String(x.id)===b.dataset.approve);if(!p)return;b.disabled=true;try{await saveEdit(p,{status:'مكتمل',stall_note:'',approved_at:T()},'اعتُمد البرنامج مكتملًا');toast('اعتُمد البرنامج')}catch(e){b.disabled=false;toast(e.message||'تعذّر الاعتماد')}});
  v.querySelectorAll('tr[data-id] [data-f]').forEach(el=>el.onchange=async()=>{const p=P.find(x=>String(x.id)===el.closest('tr').dataset.id);if(!p)return;const f=el.dataset.f,val=el.value.trim();
    if(f==='status'&&val==='متعثر'){el.value=p.status||'لم يبدأ';stallDialog(p.id);return}
    if(f==='name'&&!val){el.value=p.name;toast('اسم البرنامج لا يكون فارغًا');return}
    const ch={[f]:val};
    if(f==='planned_date'){if(!val){el.value=startOf(p);return}ch.planned_end=endOf(p)&&endOf(p)>=val?endOf(p):val}
    if(f==='planned_end'){ch.planned_date=startOf(p)||val;if(val&&val<ch.planned_date){el.value=endOf(p);toast('تاريخ النهاية قبل البداية');return}}
    if(f==='status'){ch.stall_note='';if(val==='مكتمل')ch.approved_at=p.approved_at||T()}
    el.disabled=true;try{await saveEdit(p,ch,null);toast('حُفظ التعديل')}catch(e){el.disabled=false;toast(e.message||'تعذّر الحفظ')}});
}

/* ---------- رابط «لوحة التحكم» في قائمة الموقع ---------- */
const isExec=()=>!!(window.SP&&SP.access&&SP.access.executor&&SP.access.staff_id);
function updBell(){
  const al=document.querySelector('#nav a[data-n="admin"]');
  if(al){const adm=READY&&canAdd(),ex=isExec();al.hidden=!(adm||ex);al.textContent='لوحة التحكم';al.setAttribute('href',adm||!ex?'#admin':'#me')}
  const cp=document.getElementById('cp');if(cp)cp.hidden=true;
  const old=document.getElementById('cd-tools');if(old)old.remove()}

/* ---------- ترويسة لوحة التحكم الموحدة (هوية النواة): للمنسق والمنفذ معًا ---------- */
Object.assign(IC,{desk:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',refresh:'<path d="M20 11a8 8 0 1 0-2.3 6.3"/><path d="M20 4v7h-7"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'});
const ADM=['admin','admin-alerts','admin-plans','admin-people','admin-trash'],EXP=['me','me-docs'];
const TITLES={me:'مكتبي الإلكتروني','me-docs':'توثيق برامجي','admin-alerts':'التنبيهات',admin:'مهام المتابعة','admin-plans':'إدارة الخطة','admin-people':'المنفذون','admin-trash':'المحذوفات'};
const PINFO={
  me:'برامجك المسندة إليك: ما يحتاج توثيقًا الآن، وما يجري، وما هو قادم.',
  'me-docs':'وثّق تنفيذ برامجك واطّلع على تقارير التنفيذ السابقة.',
  admin:'ما يحتاج إجراءً منك الآن: اعتماد التوثيق، والمتأخر، والمتعثر، وبرامج هذا الأسبوع.',
  'admin-alerts':'البرامج التي تحتاج تدخلك: المتأخرة في التوثيق، والمتعثرة وأسباب تعثرها، والقادمة قريبًا.',
  'admin-plans':'تحرير برامج كل خطة وتوثيقها واعتمادها، وإضافة الخطط وإرفاق ملفاتها.',
  'admin-people':'منفذو البرامج من منسوبي النواة، وربط الأسماء المكتوبة يدويًا بمنسوبيها.',
  'admin-trash':'ما حُذف من البرامج والخطط، مع إمكانية استعادته.'};
const hhmm=d=>{try{return d.toLocaleTimeString('ar-SA-u-ca-gregory-nu-latn',{hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};
const roleName=()=>{const a=(window.SP&&SP.access)||{};return a.admin?'مدير النواة الرقمية':a.coordinator?'منسق الخطط الذكية':canAdd()?'محرر الخطط الذكية':'منفذ البرامج'};

/* التنبيهات: تُحسب من البيانات الحالية (لا جدول خاص بها)، وتُعلَّم مقروءةً في المتصفح */
const NSK='sp-notif-seen';
const getSeen=()=>new Set(ls.get(NSK,[]));
const setSeen=s=>ls.set(NSK,[...s].slice(-500));
let NOPEN=false;
function notifs(){
  const out=[],t=T(),mid=isExec()?SP.access.staff_id:null,skip=new Set();
  if(mid){const soon=addDays(t,7);
    for(const p of P){if(p.owner_staff_id!==mid||p.status==='ملغي'||done(p))continue;const s=startOf(p),e=endOf(p)||s;if(!s)continue;
      if(e<=t){skip.add(p.id);out.push({id:'x:due:'+p.id+':'+e,tone:'bad',o:0,d:e,t:p.name,s:'بانتظار توثيقك • انتهت فترته '+dmy(e),href:'#me-docs'})}
      else if(s<=t)out.push({id:'x:now:'+p.id+':'+s,tone:'info',o:2,d:s,t:p.name,s:'برنامجك جارٍ الآن حتى '+dmy(e),href:'#me'})
      else if(s<=soon)out.push({id:'x:soon:'+p.id+':'+s,tone:'info',o:3,d:s,t:p.name,s:'برنامجك القادم • يبدأ '+dmy(s),href:'#me'})}}
  if(READY&&canAdd()){
    for(const p of P){
      if(p.status==='ملغي')continue;
      if(!p.approved_at&&exFor(p.id).length)out.push({id:'c:appr:'+p.id+':'+exFor(p.id).length,tone:'ok',o:1,d:endOf(p),t:p.name,s:'موثّق بانتظار الاعتماد • '+ownerOf(p),href:'#p-'+p.id});
      else if(p.status==='متعثر')out.push({id:'c:stall:'+p.id,tone:'warn',o:1,d:endOf(p),t:p.name,s:'متعثر • '+(p.stall_note||'لم يُكتب سبب'),href:'#p-'+p.id});
      else if(needs(p)&&!skip.has(p.id))out.push({id:'c:late:'+p.id+':'+endOf(p),tone:'bad',o:0,d:endOf(p),t:p.name,s:'متأخر التوثيق منذ '+daysBetween(endOf(p),t)+' يومًا • '+ownerOf(p),href:'#p-'+p.id})}}
  return out.sort((a,b)=>a.o-b.o||String(a.d).localeCompare(String(b.d)))}
function popHTML(N){const seen=getSeen(),adm=READY&&canAdd();
  const rows=N.slice(0,12).map(n=>`<a class="ni${seen.has(n.id)?'':' new'}" href="${n.href}" data-nid="${esc(n.id)}"><i class="dot ${n.tone}"></i><span class="nt"><b>${esc(n.t)}</b><small>${esc(n.s)}</small></span></a>`).join('');
  return `<div class="nh"><b>التنبيهات</b>${N.some(n=>!seen.has(n.id))?'<button type="button" class="nmark" id="cp-nread">تعليم الكل كمقروء</button>':''}</div><div class="nl">${rows||'<div class="nempty">لا تنبيهات الآن.</div>'}</div>${adm?`<a class="nall" href="#admin-alerts">عرض كل التنبيهات${N.length>12?' ('+N.length+')':''}</a>`:N.length>12?'<a class="nall" href="#me-docs">عرض كل برامجي</a>':''}`}
function barHTML(h){
  const N=notifs(),seen=getSeen(),un=N.filter(n=>!seen.has(n.id)).length,adm=READY&&canAdd(),ex=isExec(),cur=h==='admin-alerts'?'admin':h;
  const it=(href,icon,label,badge)=>`<a href="#${href}" class="${cur===href?'on':''}"${cur===href?' aria-current="page"':''}>${ic(icon)}<span>${label}</span>${badge?`<b>${badge}</b>`:''}</a>`;
  const nm=(window.SP&&SP.access&&SP.access.name)||WHO||'';
  return `<div class="cp-top"><div class="wrap cp-topin">
    <a class="cp-sys" href="#${adm&&!EXP.includes(h)?'admin':ex?'me':'admin'}"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M30 4c2 14 8 20 24 24-16 4-22 10-24 26-2-16-8-22-24-26 16-4 22-10 24-24z" fill="#0f8a94"/><path d="M50 4c.8 5 3 7.2 8 8-5 .8-7.2 3-8 8-.8-5-3-7.2-8-8 5-.8 7.2-3 8-8z" fill="#f0b34a"/></svg><span><b>الخطط الذكية</b><small>متوسطة لبيد بن ربيعة</small></span></a>
    <span class="cp-idl"><a class="cp-site" href="#home">الموقع الإلكتروني</a><i class="cp-vsep" aria-hidden="true"></i><a class="coreid" href="https://i3zalmadeni.github.io/digital-core" title="النواة الرقمية"><img src="assets/core-logo.svg" alt="" width="36" height="36"><span><b>النواة الرقمية</b><small>الهوية الموحدة</small></span></a><span class="moe"><b>وزارة التعليم</b><small>Ministry of Education</small></span></span></div></div>
  <div class="cp-strip" aria-hidden="true"></div>
  <div class="cp-sub"><div class="wrap cp-subin"><nav class="cp-nav" aria-label="صفحات لوحة التحكم">${ex?it('me','desk','مكتبي الإلكتروني')+it('me-docs','rep','توثيق برامجي'):''}${adm?it('admin','check','المهام')+it('admin-plans','plan','إدارة الخطة')+it('admin-people','users','المنفذون')+it('admin-trash','trash','المحذوفات',REMOVED.length||''):''}</nav>
    <span class="cp-user"><span class="cp-nwrap" id="cp-nwrap"><button type="button" class="cp-bell" id="cp-bell" aria-haspopup="true" aria-expanded="${NOPEN}" aria-label="${un?'التنبيهات، '+un+' جديد':'التنبيهات'}">${ic('bell')}${un?`<b class="nb">${un>9?'9+':un}</b>`:''}</button><div class="cp-npop" id="cp-npop"${NOPEN?'':' hidden'}>${NOPEN?popHTML(N):''}</div></span><span class="cp-who" title="${esc(nm)}">${esc(nm)}</span><button type="button" class="cp-out" id="cp-out">خروج</button></span></div></div>
  <div class="cp-page"><div class="wrap cp-pagein"><div class="cp-pt"><small>${roleName()}</small><h1>${TITLES[h]||''}</h1></div><p class="cp-pd">${PINFO[h]||''}</p>
    <div class="cp-pm"><span class="cp-up">آخر تحديث ${hhmm(LASTUP)}</span><button type="button" class="btn cd-sm" id="cp-refresh">${ic('refresh')} تحديث</button></div></div>
    ${ADM.includes(h)?`<div class="wrap cp-acts" role="group" aria-label="إضافة سريعة"><button type="button" class="cx-pri" data-cx-add="plan">${ic('plus')}<span>برنامج في الخطة</span></button><button type="button" data-cx-add="unplanned">${ic('plus')}<span>برنامج غير مدرج</span></button><button type="button" data-cx-add="newplan">${ic('plus')}<span>خطة جديدة</span></button></div>`:''}</div>`}
const shell=(h,inner)=>inner;
let BARH=null;
function showBar(h){if(h!==BARH){NOPEN=false;BARH=h}let bar=document.getElementById('cx-bar');const on=!!(h&&READY&&(ADM.includes(h)?canAdd():EXP.includes(h)&&isExec()));
  document.body.classList.toggle('cp-on',on);
  if(!on){NOPEN=false;if(bar)bar.hidden=true;return}
  if(!bar){bar=document.createElement('div');bar.id='cx-bar';document.body.prepend(bar)}
  bar.hidden=false;bar.innerHTML=barHTML(h);bindBar(bar,h);
  const on2=bar.querySelector('.cp-nav a.on');if(on2&&on2.scrollIntoView&&innerWidth<760)on2.scrollIntoView({block:'nearest',inline:'center'})}
function closePop(){NOPEN=false;const p=document.getElementById('cp-npop'),b=document.getElementById('cp-bell');if(p)p.hidden=true;if(b)b.setAttribute('aria-expanded','false')}
function bindPop(r,h){const p=r.querySelector('#cp-npop');if(!p)return;
  const rd=p.querySelector('#cp-nread');if(rd)rd.onclick=e=>{e.stopPropagation();const s=getSeen();notifs().forEach(n=>s.add(n.id));setSeen(s);showBar(h)};
  p.querySelectorAll('[data-nid]').forEach(a=>a.onclick=()=>{const s=getSeen();s.add(a.dataset.nid);setSeen(s);NOPEN=false});
  const al=p.querySelector('.nall');if(al)al.onclick=()=>{NOPEN=false}}
function bindBar(r,h){
  r.querySelectorAll('[data-cx-add]').forEach(b=>b.onclick=()=>{if(b.dataset.cxAdd==='newplan'){planDialog(null);return}if(b.dataset.cxAdd==='unplanned'){if(typeof unplannedForm==='function')unplannedForm();else toast('غير متاح')}else editor(null,{plan_id:+(D.mplan||D.plan)||(PL[0]||{}).id})});
  const out=r.querySelector('#cp-out');if(out)out.onclick=()=>{if(window.SP&&SP.signOut)SP.signOut();else location.reload()};
  const rf=r.querySelector('#cp-refresh');if(rf)rf.onclick=()=>{rf.disabled=true;try{if(DB&&DB.refresh)DB.refresh()}catch(e){}LASTUP=new Date();setTimeout(()=>{route(true);toast('حُدّثت البيانات')},350)};
  const bl=r.querySelector('#cp-bell');if(bl)bl.onclick=e=>{e.stopPropagation();NOPEN=!NOPEN;const p=r.querySelector('#cp-npop');p.hidden=!NOPEN;bl.setAttribute('aria-expanded',String(NOPEN));if(NOPEN){p.innerHTML=popHTML(notifs());bindPop(r,h)}};
  bindPop(r,h)}
document.addEventListener('click',e=>{if(NOPEN&&!(e.target.closest&&e.target.closest('#cp-nwrap')))closePop()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&NOPEN){closePop();const b=document.getElementById('cp-bell');if(b)b.focus()}});

/* ---------- صور المنفذين في صفحات الموقع الأخرى ---------- */
function decorate(v){if(!v)return;const names=new Set(peopleNames());
  v.querySelectorAll('.owner-card[data-owner]').forEach(el=>{const n=(el.dataset.owner||'').trim();if(!n||/^[—\-–]+$/.test(n)){el.remove();return}const pp=PEOPLE[n]||{},cnt=P.filter(p=>ownerOf(p)===n).length;
    el.innerHTML=`${avatar(n,56)}<span><small>منفذ البرنامج</small><b>${esc(n)}</b>${pp.role?`<em>${esc(pp.role)}</em>`:''}</span><span class="oc-n">${cnt===1?'برنامج واحد':cnt===2?'برنامجان':cnt+' برامج'}</span>`;el.removeAttribute('data-owner');
    const head=el.closest('.head');if(head)head.querySelectorAll('.meta.big span').forEach(sp=>{if(sp.textContent.trim()===n)sp.remove()})});
  if(!names.size)return;
  v.querySelectorAll('span').forEach(sp=>{if(sp.closest('.cd')||sp.classList.contains('cd-who'))return;const svg=sp.firstElementChild;
    if(!svg||sp.children.length!==1||svg.tagName.toLowerCase()!=='svg'||!svg.classList.contains('ico'))return;const t=sp.textContent.trim();if(!names.has(t))return;
    const big=!!sp.closest('.big'),inCard=!!sp.closest('.card,.tl-card,.nw');svg.outerHTML=avatar(t,big?30:inCard?36:24);sp.classList.add('cd-who');const r=PEOPLE[t]&&PEOPLE[t].role;if(r&&big)sp.insertAdjacentHTML('beforeend',`<small class="cd-whor">${esc(r)}</small>`)});
  v.querySelectorAll('td.small,dd,.br>span,.fact b').forEach(el=>{if(el.closest('.cd')||el.children.length)return;const t=el.textContent.trim();if(!names.has(t))return;const dd=el.tagName==='DD',r=PEOPLE[t]&&PEOPLE[t].role;
    el.innerHTML=`<span class="cd-who">${avatar(t,dd?32:el.matches('td.small')?32:22)}<span>${esc(t)}${dd&&r?`<small class="cd-whor">${esc(r)}</small>`:''}</span></span>`})}
window.CD_showBar=h=>showBar(h);window.CD_decorate=v=>decorate(v);
const _rl=renderList;renderList=function(){_rl.apply(this,arguments);decorate(document.getElementById('view'))};

/* ---------- الربط بالموجّه الأصلي دون تغييره ---------- */
const _route=route;
route=function(keep){
  if(DB&&!SUB){SUB=true;DB.collection(CO_COL).onSnapshot(s=>{CO=s.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.kind==='coordinator');apply();updBell();if(!document.querySelector('.modal'))route(true)},()=>{})}
  if(EX.some(e=>e&&e.kind==='coordinator'))EX=EX.filter(e=>!e||e.kind!=='coordinator');
  updBell();
  const h=(location.hash||'#home').slice(1);
  if(!ADM.includes(h)){showBar(null);const r=_route(keep);updBell();try{decorate(document.getElementById('view'))}catch(e){console.error(e)}return r}
  updBell();
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.n==='admin'));
  const sy=scrollY,v=document.getElementById('view');tip&&tip.remove();
  showBar(h);
  if(!READY){v.innerHTML='<div class="empty">جارٍ التحميل…</div>';return}
  if(!canAdd()){const sg=!!(window.SP&&SP.signedIn);
    v.innerHTML=`<div class="cd-lockpage">${ic('user')}<h2>${sg?'لا تملك صلاحية لوحة التحكم':'لوحة التحكم لمنسوبي النواة المصرّح لهم'}</h2><p class="muted">${sg?'حسابك في النواة الرقمية لا يحمل صلاحية الخطط الذكية. يمنحها مدير النواة من إدارة المستخدمين والصلاحيات.':'سجّل الدخول بحساب النواة الرقمية لعرض لوحة التحكم وإدارة الخطة والمنفذين.'}</p><span style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${sg?'':'<button class="btn pri" type="button" id="cd-login">دخول</button>'}<a class="btn soft" href="#home">الرئيسية</a></span></div>`;const lb=document.getElementById('cd-login');if(lb)lb.onclick=()=>{const x=document.getElementById('lg-in');if(x)x.click();else if(window.SP&&SP.login)SP.login()};return}
  v.innerHTML=shell(h,h==='admin-plans'?plansPage():h==='admin-people'?peoplePage():h==='admin-trash'?trashPage():h==='admin-alerts'?alertsPage():tasksPage());bind(v);
  if(keep===true)window.scrollTo(0,sy);else window.scrollTo(0,0);
};
route(true);
})();

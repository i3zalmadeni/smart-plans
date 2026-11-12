/*
 * الخطط الذكية — طبقة البيانات وتسجيل الدخول
 * ---------------------------------------------------------------
 * - مع إعداد Supabase في assets/config.js (قاعدة النواة الرقمية): البيانات مشتركة بين الجميع،
 *   والاستعراض متاح للكل، والإضافة والتعديل والاعتماد والحذف بصلاحيات smart_plans:* من النواة.
 * - بدون إعداد: وضع تجريبي يحفظ في هذا المتصفح فقط (للتجربة قبل الربط).
 * - داخل Claude: لا يفعل هذا الملف شيئًا.
 */
(function () {
  if (window.claude && window.claude.use) return;

  var CFG = window.SMART_PLANS_CONFIG || {};
  var CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase && window.supabase.createClient);
  var BUCKET = CFG.bucket || 'sp-evidence';
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function blobToDataUrl(b) {
    return new Promise(function (res, rej) { var f = new FileReader(); f.onload = function () { res(f.result); }; f.onerror = rej; f.readAsDataURL(b); });
  }
  var downloads = {
    save: function (o) {
      var u = URL.createObjectURL(o.data), a = document.createElement('a');
      a.href = u; a.download = o.filename || 'file'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      return Promise.resolve();
    }
  };

  /* ---------- مستمعو التغييرات (مشترك بين الوضعين) ---------- */
  var listeners = {};
  function makeSnap(rows) {
    return { docs: rows.map(function (r) { return { id: r.id, data: function () { return r.data; } }; }) };
  }

  /* =============== الوضع السحابي: قاعدة النواة الرقمية =============== */
  if (CLOUD) {
    // مفتاح تخزين الجلسة الافتراضي نفسه الذي تستعمله بقية أنظمة النواة على الأصل نفسه:
    // من دخل في أي نظام يُعرَف هنا دون دخول جديد، والعكس.
    var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    var TABLE = 'sp_records';
    var LOGIN_DOMAIN = CFG.loginDomain || 'id.invalid';
    var toAuthEmail = function (v) { v = String(v || '').trim().toLowerCase(); return v.indexOf('@') >= 0 ? v : v + '@' + LOGIN_DOMAIN; };
    var photoUrl = function (p) { return p ? CFG.supabaseUrl + '/storage/v1/object/public/public-photos/' + String(p).split('/').map(encodeURIComponent).join('/') : null; };

    /* ---------- الهوية والصلاحيات ودليل المنفذين (من النواة) ---------- */
    var SP = window.SP = {
      sb: sb, signedIn: false, access: null, dir: {}, staff: [],
      can: function (level) { return !!(SP.access && SP.access[level]); },
      login: null, signOut: null, ready: null
    };
    SP.ready = (async function () {
      var s = null;
      try { s = (await sb.auth.getSession()).data.session; } catch (e) { s = null; }
      SP.signedIn = !!s;
      if (s) {
        try { var r = await sb.rpc('sp_my_access'); SP.access = (r && r.data) || {}; } catch (e) { SP.access = {}; }
      }
      // أسماء المنفذين المرتبطين فقط (عام): الاسم والمسمى والصورة المنشورة
      try {
        var pub = await sb.from('sp_executors_public').select('id,full_name,job_title_ar,photo_path');
        (pub.data || []).forEach(function (x) { SP.dir[x.id] = { id: x.id, name: x.full_name, title: x.job_title_ar || '', photo: photoUrl(x.photo_path), phone: '', active: true }; });
      } catch (e) { /* العرض العام يعمل دون الدليل */ }
      if (s) {
        try {
          var jt = await sb.from('job_titles').select('code,name_ar'), jm = {};
          (jt.data || []).forEach(function (j) { jm[j.code] = j.name_ar; });
          var st = await sb.from('staff_members').select('id,full_name,job_title,is_active,publish_public,public_photo_path').order('full_name');
          (st.data || []).forEach(function (x) {
            var o = { id: x.id, name: x.full_name, title: jm[x.job_title] || x.job_title || '', photo: x.publish_public ? photoUrl(x.public_photo_path) : null, phone: '', active: !!x.is_active };
            SP.dir[x.id] = o; if (x.is_active) SP.staff.push(o);
          });
        } catch (e) { /* يبقى الدليل العام */ }
        // أرقام الجوال: تُقرأ بقدر ما تسمح به صلاحيات النواة (staff_private) ولا تُخزَّن في هذا النظام
        if (SP.can('edit')) {
          try {
            var ph = await sb.from('staff_private').select('staff_id,phone');
            (ph.data || []).forEach(function (x) { if (SP.dir[x.staff_id]) SP.dir[x.staff_id].phone = x.phone || ''; });
          } catch (e) { /* لا أرقام */ }
        }
      }
    })();

    /* ---------- مستمعو التغييرات ---------- */
    var emit = function (col) {
      sb.from(TABLE).select('id,data').eq('col', col).order('created_at', { ascending: true }).then(function (r) {
        if (r.error) { (listeners[col] || []).forEach(function (l) { l.err && l.err(r.error); }); return; }
        var snap = makeSnap(r.data || []);
        (listeners[col] || []).forEach(function (l) { try { l.cb(snap); } catch (e) { console.error(e); } });
      });
    };
    try {
      sb.channel('sp-records-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, function () { Object.keys(listeners).forEach(emit); })
        .subscribe();
    } catch (e) { /* التحديث الفوري اختياري */ }

    var fail = function (r) { if (r.error) throw new Error(r.error.message || 'تعذّر الاتصال بقاعدة البيانات'); return r; };
    var collection = function (col) {
      return {
        onSnapshot: function (cb, err) {
          (listeners[col] = listeners[col] || []).push({ cb: cb, err: err }); emit(col);
          return function () { listeners[col] = (listeners[col] || []).filter(function (l) { return l.cb !== cb; }); };
        },
        add: function (data) {
          return sb.from(TABLE).insert({ col: col, data: data }).select('id').single().then(fail)
            .then(function (r) { emit(col); return { id: r.data.id }; });
        },
        doc: function (id) {
          return {
            delete: function () {
              // احذف صور السجل من التخزين ثم السجل نفسه
              return sb.from(TABLE).select('data').eq('id', id).maybeSingle().then(function (r) {
                var d0 = (r.data && r.data.data) || {}; var paths = (d0.images || []).concat(d0.attachments || []).map(function (a) { return a.id; }).filter(Boolean);
                return paths.length ? sb.storage.from(BUCKET).remove(paths).catch(function () {}) : null;
              }).then(function () {
                return sb.from(TABLE).delete().eq('id', id).select('id').then(fail);
              }).then(function (r) {
                if (!r.data || !r.data.length) throw new Error('لا تملك صلاحية الحذف في الخطط الذكية.');
                emit(col);
              });
            }
          };
        }
      };
    };

    var services = {
      db: { collection: collection, refresh: function () { Object.keys(listeners).forEach(emit); } },
      assets: {
        upload: function (blob) {
          var m = /\.([A-Za-z0-9]{1,6})$/.exec((blob && blob.name) || '');
          var ext = m ? '.' + m[1].toLowerCase() : (blob && blob.type === 'image/png' ? '.png' : (!blob || !blob.type || /^image\//.test(blob.type)) ? '.jpg' : '.bin');
          var path = new Date().toISOString().slice(0, 7) + '/' + uid() + ext;
          return sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || (ext === '.jpg' ? 'image/jpeg' : 'application/octet-stream'), upsert: false }).then(fail)
            .then(function () { return { id: path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl }; });
        }
      },
      downloads: downloads
    };

    window.claude = {
      cloud: true,
      use: function (name) {
        if (name === 'downloads') return Promise.resolve(services.downloads);
        // الدليل والجلسة يُحمَّلان قبل أول لقطة بيانات حتى تُعرض أسماء المنفذين من النواة من البداية
        return SP.ready.then(function () {
          if (name === 'db') return services.db;
          // الإضافة والحذف والتعديل لا تُتاح إلا لمن يملك صلاحية «الخطط الذكية» في النواة
          if (name === 'assets' || name === 'user') {
            if (!SP.can('add') && !(SP.access && SP.access.executor)) throw new Error('no-access');
            return name === 'assets' ? services.assets : { id: function () { return Promise.resolve((SP.access && SP.access.name) || 'محرر'); } };
          }
          throw new Error('unavailable');
        });
      }
    };

    /* ---------- الدخول الموحد (النواة الرقمية): معرّف دخول وكلمة مرور ---------- */
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var goHome = function () { location.replace(location.pathname + location.search); };
    SP.signOut = function () { return sb.auth.signOut().then(goHome, goHome); };
    SP.login = function () {
      if (document.getElementById('lg-modal')) return;
      var m = document.createElement('div'); m.className = 'modal'; m.id = 'lg-modal';
      m.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="lg-t" style="width:100%;max-width:400px">' +
        '<img src="assets/core-logo.svg" alt="النواة الرقمية" width="72" height="72" style="display:block;margin:0 auto 8px">' +
        '<h3 id="lg-t" style="text-align:center;margin:0 0 4px">النواة الرقمية</h3>' +
        '<p class="muted small" style="text-align:center;margin:0 0 14px">دخول موحد لأنظمة المدرسة. الاستعراض في الخطط الذكية متاح للجميع دون دخول.</p>' +
        '<form class="frm" id="lg-f" style="grid-template-columns:1fr">' +
        '<div><label for="lg-e">معرّف الدخول</label><input id="lg-e" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required dir="ltr" placeholder="أرقام أو حروف إنجليزية"></div>' +
        '<div><label for="lg-p">كلمة المرور</label><input id="lg-p" type="password" autocomplete="current-password" required dir="ltr"></div>' +
        '</form><div id="lg-m" role="alert"></div><div style="display:flex;gap:8px;margin-top:14px"><button class="btn pri" type="submit" form="lg-f" id="lg-b">دخول</button><button class="btn" type="button" data-x>إلغاء</button></div></div>';
      document.body.append(m);
      var close = function () { m.remove(); };
      m.querySelector('[data-x]').onclick = close;
      m.onclick = function (e) { if (e.target === m) close(); };
      m.querySelector('#lg-e').focus();
      m.querySelector('#lg-f').onsubmit = function (e) {
        e.preventDefault();
        var b = m.querySelector('#lg-b'), msg = m.querySelector('#lg-m');
        b.disabled = true; b.textContent = 'جارٍ الدخول…'; msg.innerHTML = '';
        sb.auth.signInWithPassword({ email: toAuthEmail(m.querySelector('#lg-e').value), password: m.querySelector('#lg-p').value })
          .then(function (r) {
            if (r.error) throw r.error;
            location.reload();
          }).catch(function (err) {
            b.disabled = false; b.textContent = 'دخول';
            var t = /banned/.test((err && err.code) || '') ? 'هذا الحساب موقوف. راجع مدير النواة.'
              : (err && (err.code === 'invalid_credentials' || err.status === 400)) ? 'بيانات الدخول غير صحيحة.' : 'تعذّر الاتصال بالخادم، حاول مرة أخرى.';
            msg.innerHTML = '<div class="msg err">' + esc(t) + '</div>';
          });
      };
    };
    var mountAuth = function () {
      var top = document.querySelector('header .top'); if (!top) return;
      var box = document.createElement('div'); box.className = 'auth-box'; box.id = 'auth-box';
      box.style.cssText = 'display:flex;align-items:center;gap:8px';
      top.appendChild(box);
      SP.ready.then(function () {
        if (SP.signedIn) {
          // «لوحة التحكم» تظهر في قائمة الموقع نفسها؛ هنا زر الخروج فقط
          box.innerHTML = '<button class="btn" type="button" id="lg-out">خروج</button>';
          box.querySelector('#lg-out').onclick = function () { SP.signOut(); };
        } else {
          box.innerHTML = '<button class="btn soft" type="button" id="lg-in">دخول</button>';
          box.querySelector('#lg-in').onclick = SP.login;
        }
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAuth); else mountAuth();
    return;
  }

  /* إعداد موجود لكن مكتبة الاتصال لم تُحمَّل: عرض فقط مع تنبيه، دون تحويل صامت للحفظ المحلي */
  if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
    window.claude = { use: function () { return Promise.reject(new Error('offline')); } };
    var warn = function () {
      var host = document.querySelector('.credit .cr'); if (!host) return;
      var n = document.createElement('small'); n.className = 'muted small'; n.style.flexBasis = '100%';
      n.textContent = 'تعذّر الاتصال بقاعدة البيانات الآن؛ تحقق من الإنترنت ثم أعد تحميل الصفحة.';
      host.appendChild(n);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', warn); else warn();
    return;
  }

  /* =============== الوضع التجريبي: تخزين محلي =============== */
  var DB_NAME = 'smart-plans-1448', STORE = 'docs', dbp = null;
  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('المتصفح لا يدعم التخزين المحلي'));
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'key' }).createIndex('col', 'col'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, mode), out = fn(t.objectStore(STORE));
        t.oncomplete = function () { res(out && 'result' in out ? out.result : out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('تعذّر الحفظ (قد تكون مساحة المتصفح ممتلئة)')); };
      });
    });
  }
  function all(col) { return tx('readonly', function (s) { return s.index('col').getAll(col); }).then(function (r) { return r || []; }); }
  function emitLocal(col) {
    all(col).then(function (rows) {
      var snap = makeSnap(rows);
      (listeners[col] || []).forEach(function (l) { try { l.cb(snap); } catch (e) { console.error(e); } });
    }, function (e) { (listeners[col] || []).forEach(function (l) { l.err && l.err(e); }); });
  }
  var local = {
    db: {
      collection: function (col) {
        return {
          onSnapshot: function (cb, err) { (listeners[col] = listeners[col] || []).push({ cb: cb, err: err }); emitLocal(col); return function () {}; },
          add: function (data) {
            var id = uid();
            return tx('readwrite', function (s) { s.put({ key: col + '/' + id, col: col, id: id, data: data }); }).then(function () { emitLocal(col); return { id: id }; });
          },
          doc: function (id) {
            return { delete: function () { return tx('readwrite', function (s) { s.delete(col + '/' + id); }).then(function () { emitLocal(col); }); } };
          }
        };
      }
    },
    assets: { upload: function (blob) { return blobToDataUrl(blob).then(function (u) { return { id: uid(), url: u }; }); } },
    downloads: downloads,
    user: { id: function () { return Promise.resolve('local'); } }
  };
  window.claude = {
    local: true,
    use: function (name) {
      if (name === 'db') return openDb().then(function () { return local.db; });
      return local[name] ? Promise.resolve(local[name]) : Promise.reject(new Error('unavailable'));
    }
  };
  function mountNotice() {
    var host = document.querySelector('.credit .cr'); if (!host) return;
    var n = document.createElement('small'); n.className = 'muted small'; n.style.flexBasis = '100%';
    n.textContent = 'وضع تجريبي: لم يُربط الموقع بقاعدة البيانات بعد، فالسجلات تُحفظ في هذا المتصفح فقط.';
    host.appendChild(n);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountNotice); else mountNotice();
})();

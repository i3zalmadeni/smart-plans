/*
 * الخطط الذكية — طبقة البيانات وتسجيل الدخول
 * ---------------------------------------------------------------
 * - مع إعداد Supabase في assets/config.js: البيانات مشتركة بين الجميع،
 *   والاستعراض متاح للكل، والإضافة والحذف لمن سجّل الدخول فقط.
 * - بدون إعداد: وضع تجريبي يحفظ في هذا المتصفح فقط (للتجربة قبل الربط).
 * - داخل Claude: لا يفعل هذا الملف شيئًا.
 */
(function () {
  if (window.claude && window.claude.use) return;

  var CFG = window.SMART_PLANS_CONFIG || {};
  var CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase && window.supabase.createClient);
  var BUCKET = CFG.bucket || 'evidence';
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

  /* =============== الوضع السحابي: Supabase =============== */
  if (CLOUD) {
    var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    var sessionP = sb.auth.getSession().then(function (r) { return (r && r.data && r.data.session) || null; }).catch(function () { return null; });

    var emit = function (col) {
      sb.from('records').select('id,data').eq('col', col).order('created_at', { ascending: true }).then(function (r) {
        if (r.error) { (listeners[col] || []).forEach(function (l) { l.err && l.err(r.error); }); return; }
        var snap = makeSnap(r.data || []);
        (listeners[col] || []).forEach(function (l) { try { l.cb(snap); } catch (e) { console.error(e); } });
      });
    };
    try {
      sb.channel('records-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, function () { Object.keys(listeners).forEach(emit); })
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
          return sb.from('records').insert({ col: col, data: data }).select('id').single().then(fail)
            .then(function (r) { emit(col); return { id: r.data.id }; });
        },
        doc: function (id) {
          return {
            delete: function () {
              // احذف صور السجل من التخزين ثم السجل نفسه
              return sb.from('records').select('data').eq('id', id).maybeSingle().then(function (r) {
                var d0 = (r.data && r.data.data) || {}; var paths = (d0.images || []).concat(d0.attachments || []).map(function (a) { return a.id; }).filter(Boolean);
                return paths.length ? sb.storage.from(BUCKET).remove(paths).catch(function () {}) : null;
              }).then(function () {
                return sb.from('records').delete().eq('id', id).select('id').then(fail);
              }).then(function (r) {
                if (!r.data || !r.data.length) throw new Error('لا تملك صلاحية الحذف. سجّل الدخول ثم أعد المحاولة.');
                emit(col);
              });
            }
          };
        }
      };
    };

    var services = {
      db: { collection: collection },
      assets: {
        upload: function (blob) {
          var m = /\.([A-Za-z0-9]{1,6})$/.exec((blob && blob.name) || '');
          var ext = m ? '.' + m[1].toLowerCase() : (blob && blob.type === 'image/png' ? '.png' : (!blob || !blob.type || /^image\//.test(blob.type)) ? '.jpg' : '.bin');
          var path = new Date().toISOString().slice(0, 7) + '/' + uid() + ext;
          return sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || (ext === '.jpg' ? 'image/jpeg' : 'application/octet-stream'), upsert: false }).then(fail)
            .then(function () { return { id: path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl }; });
        }
      },
      downloads: downloads,
      user: null
    };

    window.claude = {
      cloud: true,
      use: function (name) {
        if (name === 'db' || name === 'downloads') return Promise.resolve(services[name]);
        // الإضافة والحذف مرتبطة بخدمة الرفع؛ لا تُتاح إلا بعد تسجيل الدخول
        if (name === 'assets' || name === 'user') return sessionP.then(function (s) {
          if (!s) throw new Error('signed-out');
          return name === 'assets' ? services.assets : { id: function () { return Promise.resolve(s.user.email || s.user.id); } };
        });
        return Promise.reject(new Error('unavailable'));
      }
    };

    /* ---------- واجهة الدخول والخروج ---------- */
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var loginForm = function () {
      var m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="lg-t" style="width:100%;max-width:400px">' +
        '<h3 id="lg-t" style="margin-bottom:6px">دخول المحررين</h3><p class="muted small" style="margin:0 0 14px">الدخول لإضافة التنفيذات والبرامج وحذفها. الاستعراض متاح للجميع دون دخول.</p>' +
        '<form class="frm" id="lg-f" style="grid-template-columns:1fr">' +
        '<div><label for="lg-e">البريد الإلكتروني</label><input id="lg-e" type="email" autocomplete="username" required dir="ltr"></div>' +
        '<div><label for="lg-p">كلمة المرور</label><input id="lg-p" type="password" autocomplete="current-password" required dir="ltr"></div>' +
        '</form><div id="lg-m"></div><div style="display:flex;gap:8px;margin-top:14px"><button class="btn pri" type="submit" form="lg-f" id="lg-b">دخول</button><button class="btn" type="button" data-x>إلغاء</button></div></div>';
      document.body.append(m);
      var close = function () { m.remove(); };
      m.querySelector('[data-x]').onclick = close;
      m.onclick = function (e) { if (e.target === m) close(); };
      m.querySelector('#lg-e').focus();
      m.querySelector('#lg-f').onsubmit = function (e) {
        e.preventDefault();
        var b = m.querySelector('#lg-b'), msg = m.querySelector('#lg-m');
        b.disabled = true; b.textContent = 'جارٍ الدخول…'; msg.innerHTML = '';
        sb.auth.signInWithPassword({ email: m.querySelector('#lg-e').value.trim(), password: m.querySelector('#lg-p').value })
          .then(function (r) {
            if (r.error) throw r.error;
            location.reload();
          }).catch(function (err) {
            b.disabled = false; b.textContent = 'دخول';
            var t = /invalid/i.test(err && err.message || '') ? 'البريد أو كلمة المرور غير صحيحة.' : (err && err.message || 'تعذّر الدخول');
            msg.innerHTML = '<div class="msg err">' + esc(t) + '</div>';
          });
      };
    };
    var mountAuth = function () {
      var top = document.querySelector('header .top'); if (!top) return;
      var box = document.createElement('div'); box.className = 'auth-box';
      box.style.cssText = 'display:flex;align-items:center;gap:8px';
      top.appendChild(box);
      sessionP.then(function (s) {
        if (s) {
          box.innerHTML = '<span class="muted small" title="' + esc(s.user.email || '') + '">محرر</span><button class="btn" type="button" id="lg-out">خروج</button>';
          box.querySelector('#lg-out').onclick = function () { sb.auth.signOut().finally(function () { location.reload(); }); };
        } else {
          box.innerHTML = '<button class="btn soft" type="button" id="lg-in">دخول المحررين</button>';
          box.querySelector('#lg-in').onclick = loginForm;
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

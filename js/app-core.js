// =============================================
// M13 STUDIO — app.js v10 FINAL
// Architecture propre, sécurisée, complète
// =============================================

// ── 1. CONFIG & ÉTAT GLOBAL ──────────────────
var SUPA_URL = 'https://nlgzunlagcdgsbkzeiin.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZ3p1bmxhZ2NkZ3Nia3plaWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDQyNzksImV4cCI6MjA4MzE4MDI3OX0.4sSfmztjJJkfHaIOBOK6Pv-27QWSpM2B-lxg0b3XC7U';
var supa = null;
var currentUser = null;
var currentRole = null; // 'realisateur' | 'moderateur' | 'acteur' | 'parent'

// Rôles avec droits admin complets
function isAdmin() { return currentRole === 'realisateur' || currentRole === 'moderateur'; }
// Acteur assigné comme prof à au moins un cours
var monsCours = []; // sera rempli au login pour les acteurs

// ── 2. SESSION ───────────────────────────────
function loadSession() {
  try {
    var s = localStorage.getItem('m13_session');
    if (!s) return false;
    var p = JSON.parse(s);
    currentUser = p.user; currentRole = p.role;
    return true;
  } catch(e) { localStorage.removeItem('m13_session'); return false; }
}
function saveSession(user) {
  currentUser = user; currentRole = user.role;
  localStorage.setItem('m13_session', JSON.stringify({user: user, role: user.role}));
}
function clearSession() {
  currentUser = null; currentRole = null; monsCours = [];
  localStorage.removeItem('m13_session');
}

// ── 3. UTILITAIRES UI ────────────────────────
function showToast(msg, type) {
  type = type || 'info';
  document.querySelectorAll('.m13toast').forEach(function(t) { t.remove(); });
  var colors = {success:'#2E7D32',danger:'#C62828',warning:'#E65100',info:'#1565C0'};
  var t = document.createElement('div');
  t.className = 'm13toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:8px;color:white;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.25);background:'+(colors[type]||colors.info)+';max-width:340px';
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(function() { t.remove(); }, 300); }, 3500);
}

// Notification importante (bannière en haut, persiste jusqu'au clic)
function showAlert(msg, type, icon) {
  icon = icon || '⚠️';
  var colors = {danger:'#C62828',warning:'#E65100',info:'#1565C0',success:'#2E7D32'};
  var bg = colors[type] || colors.info;
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:54px;left:220px;right:0;z-index:1500;background:'+bg+';color:white;padding:12px 20px;display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer';
  el.innerHTML = '<span style="font-size:18px">'+icon+'</span> '+msg+' <span style="margin-left:auto;opacity:.7;font-size:18px">✕</span>';
  el.onclick = function() { el.remove(); };
  document.body.appendChild(el);
  setTimeout(function() { if(el.parentNode) el.remove(); }, 8000);
}

function showLoginError(msg) { var el=document.getElementById('login-error'); if(el){el.textContent=msg;el.classList.remove('hidden');} }
function clearLoginError() { var el=document.getElementById('login-error'); if(el)el.classList.add('hidden'); }
function resetLoginBtn() { var b=document.getElementById('btn-login'); if(b){b.disabled=false;b.textContent='Se connecter';} }
function fmt(d) { if(!d)return'-'; return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function fmtDT(d) { if(!d)return'-'; return new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function initials(nom,prenom) { return ((prenom?prenom[0]:'')+(nom?nom[0]:'')).toUpperCase(); }
function noteColor(val,sur) { sur=sur||20; var p=val/sur; return p>=0.7?'note-good':p>=0.5?'note-medium':'note-bad'; }
function labelRole(r) { return {acteur:'Acteur',moderateur:'Modérateur',realisateur:'Réalisateur',parent:'Parent'}[r]||r; }
function today() { return new Date().toISOString().split('T')[0]; }
function g(id) { var el=document.getElementById(id); return el?el.value.trim():''; }
function mf(label,id,val,ph) { return '<div class="form-group"><label class="form-label">'+label+'</label><input class="form-control" id="'+id+'" value="'+(val||'')+'" placeholder="'+(ph||'')+'"></div>'; }
function sc(ico,bg,val,label) { return '<div class="stat-card"><div class="stat-icon" style="background:'+bg+'">'+ico+'</div><div class="stat-info"><div class="stat-value">'+val+'</div><div class="stat-label">'+label+'</div></div></div>'; }

// ── 4. MOTIFS ABSENCE (19 motifs officiels) ──
var MOTIFS = [
  {v:'MALADIE AVEC CERTIFICAT',        c:'#E91E8C', cat:'Santé'},
  {v:'MALADIE SANS CERTIFICAT',        c:'#1565C0', cat:'Santé'},
  {v:'INFIRMERIE',                      c:'#00BCD4', cat:'Santé'},
  {v:'RDV MÉDICAL EXTÉRIEUR',          c:'#FFC107', cat:'Santé'},
  {v:'VISITE MÉDICALE',                c:'#8BC34A', cat:'Santé'},
  {v:'CONVOCATION ADMINISTRATIVE',     c:'#F44336', cat:'Administratif'},
  {v:'EXCLUSION TEMPORAIRE',           c:'#9C27B0', cat:'Administratif'},
  {v:'STAGE EN ENTREPRISE',            c:'#E53935', cat:'Administratif'},
  {v:'SORTIE SCOLAIRE OU PÉDAGOGIQUE', c:'#00E676', cat:'Administratif'},
  {v:'REUNION DÉLÉGUÉS',               c:'#F48FB1', cat:'Administratif'},
  {v:'REUNION FSE',                    c:'#1E88E5', cat:'Administratif'},
  {v:'REUNION (AUTRE)',                c:'#81D4FA', cat:'Administratif'},
  {v:'RAISON FAMILIALE',               c:'#1B5E20', cat:'Social'},
  {v:'RDV ASSISTANTE SOCIALE',         c:'#827717', cat:'Social'},
  {v:'RDV PSYCHOLOGUE E.N.',           c:'#4E342E', cat:'Social'},
  {v:'PROBLÈME DE TRANSPORT',          c:'#0D47A1', cat:'Social'},
  {v:'MOTIF NON ENCORE CONNU',         c:'#EEEEEE', cat:'Autre'},
  {v:'DIVERS',                         c:'#006064', cat:'Autre'},
  {v:'SANS EXCUSES',                   c:'#FFEE58', cat:'Autre'},
];
var LIGHT_COLORS = ['#EEEEEE','#FFEE58','#FFC107','#00E676','#81D4FA','#8BC34A','#F48FB1'];
function motifInfo(label) { return MOTIFS.find(function(m){return m.v===label;})||{c:'#90A4AE',v:label||'—'}; }
function motifBadge(label) {
  if(!label) return '<span style="font-size:11px;color:#90A4AE">—</span>';
  var m=motifInfo(label); var tc=LIGHT_COLORS.indexOf(m.c)>=0?'#263238':'white';
  return '<span style="background:'+m.c+';color:'+tc+';padding:2px 7px;border-radius:10px;font-size:10.5px;font-weight:700;white-space:nowrap;border:1px solid rgba(0,0,0,.1)">'+m.v+'</span>';
}
function motifSelect(sel) {
  var cats={};MOTIFS.forEach(function(m){if(!cats[m.cat])cats[m.cat]=[];cats[m.cat].push(m);});
  var h='<select class="form-control" id="f-motif-code"><option value="">-- Motif --</option>';
  Object.entries(cats).forEach(function(kv){
    h+='<optgroup label="'+kv[0]+'">';
    kv[1].forEach(function(m){h+='<option value="'+m.v+'"'+(sel===m.v?' selected':'')+'>'+m.v+'</option>';});
    h+='</optgroup>';
  });
  return h+'</select>';
}

// ── 5. BASE DE DONNÉES ───────────────────────
var db = {
  profiles: function(f) {
    f=f||{}; var q=supa.from('profiles').select('*,classes(nom)');
    if(f.role) q=q.eq('role',f.role);
    if(f.actif!==undefined) q=q.eq('actif',f.actif);
    return q.order('nom');
  },
  profileByIdent: function(ident) { return supa.from('profiles').select('*').ilike('identifiant',ident).maybeSingle(); },
  classes: function() { return supa.from('classes').select('*').eq('actif',true).order('nom'); },
  matieres: function() { return supa.from('matieres').select('*').eq('actif',true).order('nom'); },
  edt: function(cid) {
    return supa.from('emploi_du_temps').select('*,matieres(nom,couleur),profiles(nom,prenom)')
      .eq('classe_id',cid).eq('actif',true).order('jour').order('heure_debut');
  },
  mesCoursEDT: function(profId) {
    return supa.from('emploi_du_temps').select('*,matieres(nom,couleur),classes(nom,id)')
      .eq('professeur_id',profId).eq('actif',true).order('jour').order('heure_debut');
  },
  absences: function(f) {
    f=f||{}; var q=supa.from('absences')
      .select('*,profiles!absences_eleve_id_fkey(nom,prenom,classes(nom))');
    if(f.eleve_id) q=q.eq('eleve_id',f.eleve_id);
    if(f.date) q=q.eq('date',f.date);
    if(f.classe_id) q=q.eq('classe_id',f.classe_id);
    return q.order('date',{ascending:false});
  },
  notes: function(f) {
    f=f||{}; var q=supa.from('notes')
      .select('*,profiles!notes_eleve_id_fkey(nom,prenom),matieres(nom,couleur)');
    if(f.eleve_id) q=q.eq('eleve_id',f.eleve_id);
    if(f.periode) q=q.eq('periode',f.periode);
    return q.order('date',{ascending:false});
  },
  sanctions: function(f) {
    f=f||{}; var q=supa.from('sanctions')
      .select('*,profiles!sanctions_eleve_id_fkey(nom,prenom,classes(nom))');
    if(f.eleve_id) q=q.eq('eleve_id',f.eleve_id);
    if(f.prononcee_par) q=q.eq('prononcee_par',f.prononcee_par);
    if(f.statut) q=q.eq('statut',f.statut);
    return q.order('date',{ascending:false});
  },
  notifs: function(uid) {
    return supa.from('notifications').select('*').eq('destinataire_id',uid).eq('lue',false).order('creee_le',{ascending:false});
  }
};

// ── 6. SYSTÈME DE NOTIFICATIONS ──────────────
async function creerNotif(destinataireId, type, titre, message, lienPage) {
  try {
    await supa.from('notifications').insert({
      destinataire_id: destinataireId, type: type,
      titre: titre, message: message, lien_page: lienPage||null
    });
  } catch(e) { console.warn('Notif failed:', e); }
}

async function loadNotificationsBar() {
  if(!currentUser) return;
  var r = await db.notifs(currentUser.id);
  var notifs = r.data||[];
  var badge = document.getElementById('notif-badge');
  var list  = document.getElementById('notif-dropdown-items');
  if(!badge||!list) return;
  if(notifs.length > 0) {
    badge.textContent = notifs.length;
    badge.style.display = 'flex';
    list.innerHTML = notifs.slice(0,5).map(function(n){
      var icons = {sanction:'⚠️',absence:'📋',note:'📝',message:'✉️',validation:'✅',parent:'👨‍👩‍👦',info:'ℹ️'};
      var typeColor = {sanction:'#C62828',absence:'#E65100',note:'#1565C0',message:'#2E7D32',validation:'#6A1B9A',parent:'#0D47A1',info:'#1565C0'};
      var ico = icons[n.type]||'🔔';
      var tc  = typeColor[n.type]||'#1565C0';
      return '<div onclick="marquerNotifLue(\''+n.id+'\',\''+( n.lien_page||'')+'\');" style="padding:10px 14px;border-bottom:1px solid #f0f4f8;cursor:pointer;display:flex;gap:8px;align-items:flex-start" onmouseover="this.style.background=\'#F5F9FF\'" onmouseout="this.style.background=\'white\'">' +
        '<span style="font-size:18px">'+ico+'</span>' +
        '<div><div style="font-size:12.5px;font-weight:700;color:'+tc+'">'+n.titre+'</div>'+
        '<div style="font-size:11.5px;color:#546E7A;margin-top:1px">'+n.message+'</div>'+
        '<div style="font-size:10.5px;color:#90A4AE;margin-top:2px">'+fmtDT(n.creee_le)+'</div></div>'+
      '</div>';
    }).join('') + (notifs.length>5?'<div style="padding:8px;text-align:center;font-size:12px;color:#1565C0;cursor:pointer" onclick="navigate(\'notifications\')">Voir toutes ('+notifs.length+')</div>':'');
  } else {
    badge.style.display = 'none';
    list.innerHTML = '<div style="padding:16px;text-align:center;color:#90A4AE;font-size:13px">Aucune nouvelle notification</div>';
  }
}

async function marquerNotifLue(id, page) {
  await supa.from('notifications').update({lue:true}).eq('id',id);
  document.getElementById('notif-dropdown').style.display='none';
  if(page) navigate(page);
  else loadNotificationsBar();
}

function toggleNotifDropdown() {
  var d = document.getElementById('notif-dropdown');
  d.style.display = d.style.display==='block'?'none':'block';
  if(d.style.display==='block') loadNotificationsBar();
}

// ── 7. CONNEXION / LOGOUT ────────────────────
async function login() {
  var ident = g('login-ident'), pwd = document.getElementById('login-pwd').value;
  var role  = g('selected-role');
  if(!role)  { showLoginError('Sélectionnez votre rôle.'); return; }
  if(!ident) { showLoginError('Saisissez votre identifiant.'); return; }
  if(!pwd)   { showLoginError('Saisissez votre mot de passe.'); return; }
  var btn = document.getElementById('btn-login');
  btn.disabled=true; btn.textContent='⏳ Connexion…';
  clearLoginError();
  try {
    var res = await db.profileByIdent(ident);
    if(res.error||!res.data) { showLoginError('Identifiant introuvable.'); showToast('Identifiant introuvable','danger'); resetLoginBtn(); return; }
    var u = res.data;
    if(u.mot_de_passe_hash!==pwd) { showLoginError('Mot de passe incorrect.'); showToast('Mot de passe incorrect','danger'); document.getElementById('login-pwd').value=''; resetLoginBtn(); return; }
    if(!u.actif) { showLoginError('Compte désactivé.'); showToast('Compte désactivé','danger'); resetLoginBtn(); return; }
    if(u.role!==role) { showLoginError('Ce compte est "'+labelRole(u.role)+'", pas "'+labelRole(role)+'".'); resetLoginBtn(); return; }
    supa.from('profiles').update({derniere_connexion:new Date().toISOString()}).eq('id',u.id).then(function(){});
    saveSession(u);
    // Charger les cours si acteur
    if(u.role==='acteur') {
      var rc = await db.mesCoursEDT(u.id);
      monsCours = rc.data||[];
    }
    showToast('Bienvenue, '+u.prenom+' '+u.nom+' !','success');
    initApp();
  } catch(err) {
    showLoginError('Erreur de connexion au serveur.'); showToast('Erreur réseau','danger');
    console.error('[M13]',err); resetLoginBtn();
  }
}

function logout() {
  clearSession();
  ['login-ident','login-pwd'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('selected-role').value='';
  document.querySelectorAll('.role-btn').forEach(function(b){b.classList.remove('selected');});
  clearLoginError(); resetLoginBtn();
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  showToast('Déconnecté.','info');
}

// ── 8. INITIALISATION APP ────────────────────
function initApp() {
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('user-name').textContent=currentUser.prenom+' '+currentUser.nom;
  document.getElementById('user-initials').textContent=initials(currentUser.nom,currentUser.prenom);
  var roleLabels = {realisateur:'🎬 Réalisateur',moderateur:'🎭 Modérateur',acteur:'🎓 Acteur',parent:'👨‍👩‍👦 Parent'};
  document.getElementById('user-role-badge').textContent = roleLabels[currentRole]||currentRole;
  buildSidebar();
  loadNotificationsBar();
  // Rafraîchir les notifs toutes les 60 secondes
  setInterval(loadNotificationsBar, 60000);
  if(currentRole==='acteur') navigate('mondashboard');
  else if(currentRole==='parent') navigate('parentDashboard');
  else navigate('dashboard');
}

// ── 9. NAVIGATION ────────────────────────────
var pageLoaders = {};
function registerPage(name, fn) { pageLoaders[name] = fn; }

function navigate(page) {
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.sidebar-item').forEach(function(i){i.classList.remove('active');});
  var p = document.getElementById('page-'+page);
  if(!p) { p=document.createElement('div'); p.className='page'; p.id='page-'+page; document.querySelector('.main-content').appendChild(p); }
  p.classList.add('active');
  var nav = document.querySelector('.sidebar-item[data-page="'+page+'"]');
  if(nav) nav.classList.add('active');
  if(pageLoaders[page]) pageLoaders[page]();
  // Cacher le dropdown notifs si ouvert
  var dd = document.getElementById('notif-dropdown');
  if(dd) dd.style.display='none';
}

// ── 10. SIDEBAR ──────────────────────────────
function buildSidebar() {
  var h = '';
  if(isAdmin()) {
    h += sidebar_section('Accueil',[['dashboard','📊','Tableau de bord']]);
    h += sidebar_section('Vie Scolaire',[
      ['absences','📋','Absences / Retards'],
      ['sanctions','⚠️','Retenues & Sanctions'],
      ['bulletins','📄','Bulletins'],
    ]);
    h += sidebar_section('Scolarité',[
      ['edt','📅','Emploi du temps'],
      ['notes','📝','Notes'],
      ['cahier','📖','Cahier de textes'],
    ]);
    h += sidebar_section('Annuaire',[
      ['eleves','🎓','Acteurs (Élèves)'],
      ['profs','🎭','Modérateurs'],
      ['classes','🏫','Classes'],
    ]);
    h += sidebar_section('Communauté',[
      ['publications','📢','Publications'],
      ['agenda','📅','Agenda'],
      ['ressources','📂','Ressources'],
    ]);
    h += sidebar_section('Communication',[
      ['messages','✉️','Messagerie'],
    ]);
    if(currentRole==='realisateur') {
      h += sidebar_section('Administration',[
        ['comptes','👥','Gestion comptes'],
        ['matieres','📚','Matières'],
        ['admin_stats','📊','Statistiques'],
        ['admin_logs','🔍','Journal activité'],
        ['admin_parametres','⚙️','Paramètres'],
      ]);
    }
  } else if(currentRole==='acteur') {
    h += sidebar_section('Accueil',[['mondashboard','🏠','Mon espace']]);
    h += sidebar_section('Ma scolarité',[
      ['monnotes','📝','Mes notes'],
      ['mesAbsences','📋','Mes absences'],
      ['mesSanctions','⚠️','Mes retenues'],
      ['edt','📅','Emploi du temps'],
      ['cahier','📖','Cahier de textes'],
    ]);
    h += sidebar_section('Communauté',[
      ['publications','📢','Publications'],
      ['agenda','📅','Agenda'],
      ['ressources','📂','Ressources'],
      ['notesperso','📒','Mes notes perso'],
    ]);
    h += sidebar_section('Communication',[['messages','✉️','Messagerie']]);
    if(monsCours.length>0) {
      h += sidebar_section('Mes cours (prof)',[
        ['mesCours','🏫','Classes & Élèves'],
        ['mesRetenues','⚠️','Mes retenues saisies'],
      ]);
    }
  } else if(currentRole==='parent') {
    h += sidebar_section('Mon espace',[
      ['parentDashboard','🏠','Tableau de bord'],
      ['parentAbsences','📋','Absences de mon enfant'],
      ['parentNotes','📝','Notes'],
      ['parentSanctions','⚠️','Retenues'],
      ['parentJustifier','✅','Justifier une absence'],
      ['messages','✉️','Messagerie'],
    ]);
  }
  document.getElementById('sidebar-nav').innerHTML = h;
}

function sidebar_section(title, items) {
  var h='<div class="sidebar-section"><div class="sidebar-section-title">'+title+'</div>';
  items.forEach(function(item){
    h+='<a class="sidebar-item" data-page="'+item[0]+'" onclick="navigate(\''+item[0]+'\')" style="cursor:pointer"><span class="icon">'+item[1]+'</span> '+item[2]+'</a>';
  });
  return h+'</div>';
}

// ── 11. MODAL ────────────────────────────────
function openModal()  { document.getElementById('generic-modal').classList.add('open'); }
function closeModal() { document.getElementById('generic-modal').classList.remove('open'); }
function setModal(title, body, footer) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer;
  openModal();
}

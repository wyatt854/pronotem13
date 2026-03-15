// =============================================
// M13 STUDIO — app.js COMPLET v4
// =============================================

// ── CONFIG ────────────────────────────────────
var SUPA_URL = 'https://nlgzunlagcdgsbkzeiin.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZ3p1bmxhZ2NkZ3Nia3plaWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDQyNzksImV4cCI6MjA4MzE4MDI3OX0.4sSfmztjJJkfHaIOBOK6Pv-27QWSpM2B-lxg0b3XC7U';
var supa = null; // client Supabase — initialisé dans init()

// ── ÉTAT GLOBAL ──────────────────────────────
var currentUser = null;
var currentRole = null;

// ── SESSION ──────────────────────────────────
function loadSession() {
  try {
    var s = localStorage.getItem('m13_session');
    if (!s) return false;
    var p = JSON.parse(s);
    currentUser = p.user;
    currentRole = p.role;
    return true;
  } catch(e) { localStorage.removeItem('m13_session'); return false; }
}
function saveSession(user) {
  currentUser = user; currentRole = user.role;
  localStorage.setItem('m13_session', JSON.stringify({user:user,role:user.role}));
}
function clearSession() {
  currentUser = null; currentRole = null;
  localStorage.removeItem('m13_session');
}

// ── UTILITAIRES UI ───────────────────────────
function showToast(msg, type) {
  type = type || 'info';
  document.querySelectorAll('.m13toast').forEach(function(t){t.remove();});
  var colors = {success:'#2E7D32',danger:'#C62828',warning:'#E65100',info:'#1565C0'};
  var t = document.createElement('div');
  t.className = 'm13toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:8px;color:white;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.25);background:'+(colors[type]||colors.info)+';max-width:320px';
  document.body.appendChild(t);
  setTimeout(function(){t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(function(){t.remove();},300);},3200);
}
function showLoginError(msg) {
  var el = document.getElementById('login-error');
  if (el){el.textContent=msg;el.classList.remove('hidden');}
}
function clearLoginError() {
  var el = document.getElementById('login-error');
  if (el) el.classList.add('hidden');
}
function resetLoginBtn() {
  var b = document.getElementById('btn-login');
  if (b){b.disabled=false;b.textContent='Se connecter';}
}
function fmt(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtDT(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function initials(nom,prenom) {
  return ((prenom?prenom[0]:'')+(nom?nom[0]:'')).toUpperCase();
}
function noteColor(val,sur) {
  sur=sur||20; var p=val/sur;
  return p>=0.7?'note-good':p>=0.5?'note-medium':'note-bad';
}
function labelRole(r) {
  return {acteur:'Acteur',moderateur:'Modérateur',realisateur:'Réalisateur'}[r]||r;
}
function today() { return new Date().toISOString().split('T')[0]; }

// ── BASE DE DONNÉES ──────────────────────────
var db = {
  profiles: function(filters) {
    filters=filters||{};
    var q=supa.from('profiles').select('*,classes(nom)');
    if(filters.role) q=q.eq('role',filters.role);
    if(filters.actif!==undefined) q=q.eq('actif',filters.actif);
    return q.order('nom');
  },
  profileById: function(ident) {
    return supa.from('profiles').select('*').ilike('identifiant',ident).maybeSingle();
  },
  createProfile: function(d) { return supa.from('profiles').insert(d).select().single(); },
  updateProfile: function(id,d) { return supa.from('profiles').update(d).eq('id',id); },
  softDelete: function(id) { return supa.from('profiles').update({actif:false}).eq('id',id); },
  classes: function() { return supa.from('classes').select('*').eq('actif',true).order('nom'); },
  matieres: function() { return supa.from('matieres').select('*').eq('actif',true).order('nom'); },
  edt: function(cid) {
    return supa.from('emploi_du_temps')
      .select('*,matieres(nom,couleur),profiles(nom,prenom)')
      .eq('classe_id',cid).eq('actif',true).order('jour').order('heure_debut');
  },
  absences: function(f) {
    f=f||{};
    var q=supa.from('absences').select('*,profiles!absences_eleve_id_fkey(nom,prenom,classes(nom))');
    if(f.eleve_id) q=q.eq('eleve_id',f.eleve_id);
    if(f.date) q=q.eq('date',f.date);
    return q.order('date',{ascending:false});
  },
  notes: function(f) {
    f=f||{};
    var q=supa.from('notes').select('*,profiles!notes_eleve_id_fkey(nom,prenom),matieres(nom,couleur)');
    if(f.eleve_id) q=q.eq('eleve_id',f.eleve_id);
    if(f.periode) q=q.eq('periode',f.periode);
    return q.order('date',{ascending:false});
  },
  cahier: function(f) {
    f=f||{};
    var q=supa.from('cahier_textes').select('*,matieres(nom,couleur),classes(nom),profiles(nom,prenom)');
    if(f.classe_id) q=q.eq('classe_id',f.classe_id);
    return q.order('date',{ascending:false});
  },
  messages: function(uid) {
    return supa.from('messages')
      .select('*,profiles!messages_expediteur_id_fkey(nom,prenom)')
      .eq('destinataire_id',uid).is('parent_id',null)
      .order('date_envoi',{ascending:false});
  },
  sanctions: function(f) {
    f=f||{};
    var q=supa.from('sanctions').select('*,profiles!sanctions_eleve_id_fkey(nom,prenom,classes(nom))');
    if(f.eleve_id) q=q.eq('eleve_id',f.eleve_id);
    return q.order('date',{ascending:false});
  }
};

// ── CONNEXION ────────────────────────────────
async function login() {
  var ident = document.getElementById('login-ident').value.trim();
  var pwd   = document.getElementById('login-pwd').value;
  var role  = document.getElementById('selected-role').value;

  if (!role)  { showLoginError('Sélectionnez votre rôle.'); return; }
  if (!ident) { showLoginError('Saisissez votre identifiant.'); return; }
  if (!pwd)   { showLoginError('Saisissez votre mot de passe.'); return; }

  var btn = document.getElementById('btn-login');
  btn.disabled=true; btn.textContent='⏳ Connexion…';
  clearLoginError();

  try {
    var res = await db.profileById(ident);
    if (res.error || !res.data) {
      showLoginError('Identifiant introuvable.'); showToast('Identifiant introuvable','danger');
      resetLoginBtn(); return;
    }
    var u = res.data;
    if (u.mot_de_passe_hash !== pwd) {
      showLoginError('Mot de passe incorrect.'); showToast('Mot de passe incorrect','danger');
      document.getElementById('login-pwd').value=''; resetLoginBtn(); return;
    }
    if (!u.actif) {
      showLoginError('Compte désactivé.'); showToast('Compte désactivé','danger');
      resetLoginBtn(); return;
    }
    if (u.role !== role) {
      showLoginError('Ce compte est "'+labelRole(u.role)+'", pas "'+labelRole(role)+'".'); showToast('Rôle incorrect','danger');
      resetLoginBtn(); return;
    }
    supa.from('profiles').update({derniere_connexion:new Date().toISOString()}).eq('id',u.id).then(function(){});
    saveSession(u);
    showToast('Bienvenue, '+u.prenom+' '+u.nom+' !','success');
    initApp();
  } catch(err) {
    showLoginError('Erreur de connexion au serveur.'); showToast('Erreur serveur','danger');
    console.error('[M13]',err); resetLoginBtn();
  }
}

function logout() {
  clearSession();
  document.getElementById('login-ident').value='';
  document.getElementById('login-pwd').value='';
  document.getElementById('selected-role').value='';
  document.querySelectorAll('.role-btn').forEach(function(b){b.classList.remove('selected');});
  clearLoginError(); resetLoginBtn();
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  showToast('Déconnecté.','info');
}

// ── INIT APP ──────────────────────────────────
function initApp() {
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('user-name').textContent=currentUser.prenom+' '+currentUser.nom;
  document.getElementById('user-initials').textContent=initials(currentUser.nom,currentUser.prenom);
  document.getElementById('user-role-badge').textContent=
    currentRole==='realisateur'?'🎬 Réalisateur':currentRole==='moderateur'?'🎭 Modérateur':'🎓 Acteur';
  buildSidebar();
  refreshNotif();
  navigate(currentRole==='acteur'?'mondashboard':'dashboard');
}

async function refreshNotif() {
  if (!currentUser) return;
  try {
    var r = await supa.from('messages').select('id',{count:'exact',head:true}).eq('destinataire_id',currentUser.id).eq('lu',false);
    var b = document.getElementById('notif-msg');
    if (!b) return;
    if (r.count>0){b.textContent=r.count;b.style.display='flex';}else{b.style.display='none';}
  } catch(e){}
}

// ── NAVIGATION ───────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.sidebar-item').forEach(function(i){i.classList.remove('active');});
  var p=document.getElementById('page-'+page);
  if(p) p.classList.add('active');
  var n=document.querySelector('.sidebar-item[data-page="'+page+'"]');
  if(n) n.classList.add('active');
  var map={
    dashboard:loadDashboard,eleves:loadEleves,profs:loadProfs,classes:loadClasses,
    edt:loadEDT,absences:loadAbsences,notes:loadNotes,cahier:loadCahier,
    messages:loadMessages,sanctions:loadSanctions,bulletins:loadBulletins,
    comptes:loadComptes,matieres:loadMatieres,
    monnotes:loadMesNotes,monAbsences:loadMesAbsences,mondashboard:loadMonDashboard
  };
  if(map[page]) map[page]();
}

// ── SIDEBAR ───────────────────────────────────
function buildSidebar() {
  var h='';
  var isAdmin = currentRole==='realisateur'||currentRole==='moderateur';
  if(isAdmin){
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Accueil</div>';
    h+='<a class="sidebar-item" data-page="dashboard" onclick="navigate(\'dashboard\')"><span class="icon">📊</span> Tableau de bord</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Vie Scolaire</div>';
    h+='<a class="sidebar-item" data-page="absences" onclick="navigate(\'absences\')"><span class="icon">📋</span> Absences / Retards</a>';
    h+='<a class="sidebar-item" data-page="sanctions" onclick="navigate(\'sanctions\')"><span class="icon">⚠️</span> Retenues & Sanctions</a>';
    h+='<a class="sidebar-item" data-page="bulletins" onclick="navigate(\'bulletins\')"><span class="icon">📄</span> Bulletins</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Scolarité</div>';
    h+='<a class="sidebar-item" data-page="edt" onclick="navigate(\'edt\')"><span class="icon">📅</span> Emploi du temps</a>';
    h+='<a class="sidebar-item" data-page="notes" onclick="navigate(\'notes\')"><span class="icon">📝</span> Notes</a>';
    h+='<a class="sidebar-item" data-page="cahier" onclick="navigate(\'cahier\')"><span class="icon">📖</span> Cahier de textes</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Annuaire</div>';
    h+='<a class="sidebar-item" data-page="eleves" onclick="navigate(\'eleves\')"><span class="icon">🎓</span> Acteurs</a>';
    h+='<a class="sidebar-item" data-page="profs" onclick="navigate(\'profs\')"><span class="icon">🎭</span> Modérateurs</a>';
    h+='<a class="sidebar-item" data-page="classes" onclick="navigate(\'classes\')"><span class="icon">🏫</span> Classes</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Communication</div>';
    h+='<a class="sidebar-item" data-page="messages" onclick="navigate(\'messages\')"><span class="icon">✉️</span> Messagerie</a></div>';
    if(currentRole==='realisateur'){
      h+='<div class="sidebar-section"><div class="sidebar-section-title">Administration</div>';
      h+='<a class="sidebar-item" data-page="comptes" onclick="navigate(\'comptes\')"><span class="icon">👥</span> Gestion comptes</a>';
      h+='<a class="sidebar-item" data-page="matieres" onclick="navigate(\'matieres\')"><span class="icon">📚</span> Matières</a></div>';
    }
  } else {
    // Acteur (élève)
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Accueil</div>';
    h+='<a class="sidebar-item" data-page="mondashboard" onclick="navigate(\'mondashboard\')"><span class="icon">🏠</span> Mon espace</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Ma scolarité</div>';
    h+='<a class="sidebar-item" data-page="monnotes" onclick="navigate(\'monnotes\')"><span class="icon">📝</span> Mes notes</a>';
    h+='<a class="sidebar-item" data-page="monAbsences" onclick="navigate(\'monAbsences\')"><span class="icon">📋</span> Mes absences</a>';
    h+='<a class="sidebar-item" data-page="edt" onclick="navigate(\'edt\')"><span class="icon">📅</span> Emploi du temps</a>';
    h+='<a class="sidebar-item" data-page="cahier" onclick="navigate(\'cahier\')"><span class="icon">📖</span> Cahier de textes</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Communication</div>';
    h+='<a class="sidebar-item" data-page="messages" onclick="navigate(\'messages\')"><span class="icon">✉️</span> Messagerie</a></div>';
    // Section "Mes cours" si acteur est prof sur un créneau
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Mes cours</div>';
    h+='<a class="sidebar-item" data-page="mesCours" onclick="navigate(\'mesCours\')"><span class="icon">🏫</span> Classes & Élèves</a>';
    h+='<a class="sidebar-item" data-page="appel" onclick="navigate(\'appel\')"><span class="icon">📋</span> Appel & Absences</a>';
    h+='<a class="sidebar-item" data-page="mesRetenues" onclick="navigate(\'mesRetenues\')"><span class="icon">⚠️</span> Retenues</a></div>';
  }
  document.getElementById('sidebar-nav').innerHTML=h;
}

// ── MODALE ────────────────────────────────────
function openModal()  { document.getElementById('generic-modal').classList.add('open'); }
function closeModal() { document.getElementById('generic-modal').classList.remove('open'); }

// ── DASHBOARD ─────────────────────────────────
async function loadDashboard() {
  var el=document.getElementById('page-dashboard');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Tableau de bord</span></div><div id="sg" class="dashboard-grid"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px"><div id="ca"></div><div id="cn"></div></div>';
  var t=today();
  var r=await Promise.all([
    supa.from('profiles').select('id').eq('role','acteur').eq('actif',true),
    supa.from('profiles').select('id').eq('role','moderateur').eq('actif',true),
    supa.from('classes').select('id').eq('actif',true),
    supa.from('absences').select('id').eq('date',t)
  ]);
  document.getElementById('sg').innerHTML=
    sc('🎓','#E3F2FD',(r[0].data||[]).length,'Acteurs')+
    sc('🎭','#E8F5E9',(r[1].data||[]).length,'Modérateurs')+
    sc('🏫','#FFF3E0',(r[2].data||[]).length,'Classes')+
    sc('📋','#FFEBEE',(r[3].data||[]).length,"Absences aujourd'hui");
  var ra=await db.absences();
  document.getElementById('ca').innerHTML='<div class="card"><div class="card-header"><div class="card-title">📋 Dernières absences</div></div><div class="table-container"><table><thead><tr><th>Élève</th><th>Date</th><th>Type</th><th>Justif.</th></tr></thead><tbody>'+(ra.data||[]).slice(0,8).map(function(a){return '<tr><td>'+(a.profiles?a.profiles.prenom+' '+a.profiles.nom:'')+'</td><td>'+fmt(a.date)+'</td><td><span class="badge '+(a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet')+'">'+a.type+'</span></td><td>'+(a.justifiee?'✅':'❌')+'</td></tr>';}).join('')+'</tbody></table></div></div>';
  var rn=await db.notes();
  document.getElementById('cn').innerHTML='<div class="card"><div class="card-header"><div class="card-title">📝 Dernières notes</div></div><div class="table-container"><table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th><th>Date</th></tr></thead><tbody>'+(rn.data||[]).slice(0,8).map(function(n){return '<tr><td>'+(n.profiles?n.profiles.prenom+' '+n.profiles.nom:'')+'</td><td>'+(n.matieres?n.matieres.nom:'-')+'</td><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+fmt(n.date)+'</td></tr>';}).join('')+'</tbody></table></div></div>';
}
function sc(ico,bg,val,label){return '<div class="stat-card"><div class="stat-icon" style="background:'+bg+'">'+ico+'</div><div class="stat-info"><div class="stat-value">'+val+'</div><div class="stat-label">'+label+'</div></div></div>';}

// ── ÉLÈVES ────────────────────────────────────
async function loadEleves() {
  var el=document.getElementById('page-eleves');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Acteurs</span></div><div class="card"><div class="card-header"><div class="card-title">🎓 Acteurs</div><div style="display:flex;gap:8px"><input class="form-control" id="se" placeholder="Rechercher…" style="width:200px" oninput="filterEleves()">'+(currentRole==='realisateur'?'<button class="btn btn-primary btn-sm" onclick="modalEleve()">+ Ajouter</button>':'')+'</div></div><div class="table-container" id="te"></div></div>';
  renderEleves('');
}
async function renderEleves(s) {
  var r=await db.profiles({role:'acteur'});
  var d=(r.data||[]).filter(function(e){return !s||(e.prenom+' '+e.nom+' '+e.identifiant).toLowerCase().includes(s.toLowerCase());});
  document.getElementById('te').innerHTML='<table><thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe</th><th>Statut</th>'+(currentRole==='realisateur'?'<th>Actions</th>':'')+'</tr></thead><tbody>'+d.map(function(e){return '<tr><td><strong>'+e.nom+'</strong></td><td>'+e.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+e.identifiant+'</code></td><td>'+(e.classes?e.classes.nom:'-')+'</td><td><span class="badge '+(e.actif?'badge-vert':'badge-rouge')+'">'+(e.actif?'Actif':'Inactif')+'</span></td>'+(currentRole==='realisateur'?'<td><button class="btn btn-secondary btn-sm" onclick="modalEleve(\''+e.id+'\')">✏️</button> <button class="btn btn-danger btn-sm" onclick="deactivate(\''+e.id+'\')">🗑️</button></td>':'')+'</tr>';}).join('')+'</tbody></table>';
}
function filterEleves(){renderEleves(document.getElementById('se').value);}
async function modalEleve(id) {
  id=id||null;
  var rc=await db.classes();
  var u=null; if(id){var ru=await supa.from('profiles').select('*').eq('id',id).maybeSingle();u=ru.data;}
  document.getElementById('modal-title').textContent=id?'Modifier acteur':'Ajouter un acteur';
  document.getElementById('modal-body').innerHTML=
    mf('Nom *','f-nom',u?u.nom:'')+mf('Prénom *','f-prenom',u?u.prenom:'')+
    mf('Identifiant *','f-ident',u?u.identifiant:'')+
    '<div class="form-group"><label class="form-label">Mot de passe '+(id?'(vide=inchangé)':'*')+'</label><input class="form-control" id="f-pwd" type="password"></div>'+
    '<div class="form-group"><label class="form-label">Classe</label><select class="form-control" id="f-classe"><option value="">-- Aucune --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'"'+(u&&u.classe_id===c.id?' selected':'')+'>'+c.nom+'</option>';}).join('')+'</select></div>'+
    mf('Email','f-email',u?u.email||'':'','email@exemple.com')+
    '';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveEleve(\''+(id||'')+'\')">Enregistrer</button>';
  openModal();
}
async function saveEleve(id) {
  var nom=g('f-nom'),prenom=g('f-prenom'),ident=g('f-ident'),pwd=g('f-pwd');
  if(!nom||!prenom||!ident){showToast('Champs obligatoires manquants','warning');return;}
  var d={nom:nom,prenom:prenom,identifiant:ident,classe_id:g('f-classe')||null,email:g('f-email'),role:'acteur'};
  if(pwd) d.mot_de_passe_hash=pwd;
  if(id){var r=await db.updateProfile(id,d);if(r.error){showToast('Erreur: '+r.error.message,'danger');return;}}
  else{if(!pwd){showToast('Mot de passe requis','warning');return;}d.actif=true;var r2=await db.createProfile(d);if(r2.error){showToast('Erreur: '+r2.error.message,'danger');return;}}
  closeModal();showToast('Acteur enregistré !','success');loadEleves();
}
async function deactivate(id) {
  if(!confirm('Désactiver ce compte ?')) return;
  await supa.from('profiles').update({actif:false}).eq('id',id);
  showToast('Compte désactivé','success');
  if(document.getElementById('page-eleves').classList.contains('active')) loadEleves();
  else if(document.getElementById('page-comptes').classList.contains('active')) loadComptes();
  else if(document.getElementById('page-profs').classList.contains('active')) loadProfs();
}

// ── MODÉRATEURS ───────────────────────────────
async function loadProfs() {
  var el=document.getElementById('page-profs');
  var r=await db.profiles({role:'moderateur'});
  var rows=(r.data||[]).map(function(p){return '<tr><td><strong>'+p.nom+'</strong></td><td>'+p.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+p.identifiant+'</code></td><td><span class="badge '+(p.actif?'badge-vert':'badge-rouge')+'">'+(p.actif?'Actif':'Inactif')+'</span></td>'+(currentRole==='realisateur'?'<td><button class="btn btn-danger btn-sm" onclick="deactivate(\''+p.id+'\')">🗑️</button></td>':'')+'</tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Modérateurs</span></div><div class="card"><div class="card-header"><div class="card-title">🎭 Modérateurs</div>'+(currentRole==='realisateur'?'<button class="btn btn-primary btn-sm" onclick="modalProf()">+ Ajouter</button>':'')+'</div><div class="table-container"><table><thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Statut</th>'+(currentRole==='realisateur'?'<th>Actions</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
async function modalProf() {
  document.getElementById('modal-title').textContent='Ajouter un modérateur';
  document.getElementById('modal-body').innerHTML=mf('Nom *','f-nom','')+mf('Prénom *','f-prenom','')+mf('Identifiant *','f-ident','')+
    '<div class="form-group"><label class="form-label">Mot de passe *</label><input class="form-control" id="f-pwd" type="password"></div>'+mf('Email','f-email','');
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveProf()">Créer</button>';
  openModal();
}
async function saveProf() {
  var nom=g('f-nom'),prenom=g('f-prenom'),ident=g('f-ident'),pwd=g('f-pwd');
  if(!nom||!prenom||!ident||!pwd){showToast('Champs obligatoires','warning');return;}
  var r=await supa.from('profiles').insert({nom,prenom,identifiant:ident,mot_de_passe_hash:pwd,role:'moderateur',actif:true});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Modérateur créé !','success');loadProfs();
}

// ── CLASSES ───────────────────────────────────
async function loadClasses() {
  var el=document.getElementById('page-classes');
  var r=await db.classes();
  var rows=(r.data||[]).map(function(c){return '<tr><td><strong>'+c.nom+'</strong></td><td>'+(c.niveau||'-')+'</td><td>'+c.annee_scolaire+'</td></tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Classes</span></div><div class="card"><div class="card-header"><div class="card-title">🏫 Classes</div>'+(currentRole!=='acteur'?'<button class="btn btn-primary btn-sm" onclick="modalClasse()">+ Créer</button>':'')+'</div><div class="table-container"><table><thead><tr><th>Nom</th><th>Niveau</th><th>Année</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
async function modalClasse() {
  document.getElementById('modal-title').textContent='Créer une classe';
  document.getElementById('modal-body').innerHTML=mf('Nom *','f-nom','','Ex: 3ème A')+mf('Niveau','f-niveau','','Ex: 3ème')+mf('Année scolaire','f-annee','2024-2025');
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveClasse()">Créer</button>';
  openModal();
}
async function saveClasse() {
  var nom=g('f-nom');if(!nom){showToast('Nom requis','warning');return;}
  var r=await supa.from('classes').insert({nom,niveau:g('f-niveau'),annee_scolaire:g('f-annee')});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Classe créée !','success');loadClasses();
}

// ── EMPLOI DU TEMPS ───────────────────────────
async function loadEDT() {
  var el=document.getElementById('page-edt');
  var rc=await db.classes();
  var opts=(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Emploi du temps</span></div><div class="card"><div class="card-header"><div class="card-title">📅 Emploi du temps</div><div style="display:flex;gap:8px;align-items:center"><select class="form-control" id="edt-classe" onchange="renderEDT()" style="width:170px"><option value="">-- Choisir classe --</option>'+opts+'</select>'+(currentRole!=='acteur'?'<button class="btn btn-primary btn-sm" onclick="modalCreneau()">+ Ajouter</button>':'')+'</div></div><div class="card-body" id="edt-c"><div class="alert alert-info">Sélectionnez une classe.</div></div></div>';
}
async function renderEDT() {
  var cid=document.getElementById('edt-classe').value; if(!cid) return;
  var r=await db.edt(cid);
  var jours=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
  var h=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  var s='<div style="overflow-x:auto"><div class="edt-grid" style="min-width:700px"><div class="edt-header">Horaire</div>'+jours.map(function(j){return '<div class="edt-header">'+j+'</div>';}).join('');
  for(var i=0;i<h.length-1;i++){
    s+='<div class="edt-time">'+h[i]+'<br><span style="color:#B0BEC5;font-size:10px">'+h[i+1]+'</span></div>';
    jours.forEach(function(j){
      var c=(r.data||[]).find(function(x){return x.jour===j&&x.heure_debut<=h[i]&&x.heure_fin>h[i];});
      if(c){s+='<div class="edt-cell"><div class="edt-cours" style="background:'+c.matieres.couleur+'22;border-left:3px solid '+c.matieres.couleur+';color:'+c.matieres.couleur+'"><div>'+c.matieres.nom+'</div><div style="font-size:10px;opacity:.8">'+(c.profiles?c.profiles.prenom+' '+c.profiles.nom:'')+'</div><div style="font-size:10px">'+(c.salle||'')+'</div></div></div>';}
      else{s+='<div class="edt-cell"></div>';}
    });
  }
  s+='</div></div>';
  document.getElementById('edt-c').innerHTML=s;
}
async function modalCreneau() {
  var rc=await db.classes(),rm=await db.matieres();
  var rp=await supa.from('profiles').select('*').in('role',['moderateur','acteur']).eq('actif',true);
  document.getElementById('modal-title').textContent='Ajouter un créneau';
  document.getElementById('modal-body').innerHTML=
    '<div class="form-group"><label class="form-label">Classe *</label><select class="form-control" id="f-classe">'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Enseignant</label><select class="form-control" id="f-prof"><option value="">-- Aucun --</option>'+(rp.data||[]).map(function(p){return '<option value="'+p.id+'">'+p.prenom+' '+p.nom+'</option>';}).join('')+'</select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
    '<div class="form-group"><label class="form-label">Jour *</label><select class="form-control" id="f-jour">'+['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map(function(j){return '<option>'+j+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Salle</label><input class="form-control" id="f-salle"></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
    '<div class="form-group"><label class="form-label">Début</label><input class="form-control" id="f-hdebut" type="time" value="08:00"></div>'+
    '<div class="form-group"><label class="form-label">Fin</label><input class="form-control" id="f-hfin" type="time" value="09:00"></div></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveCreneau()">Ajouter</button>';
  openModal();
}
async function saveCreneau() {
  var r=await supa.from('emploi_du_temps').insert({classe_id:g('f-classe'),matiere_id:g('f-matiere'),professeur_id:g('f-prof')||null,jour:g('f-jour'),heure_debut:g('f-hdebut'),heure_fin:g('f-hfin'),salle:g('f-salle')});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Créneau ajouté !','success');renderEDT();
}

// ── ABSENCES ──────────────────────────────────
async function loadAbsences() {
  var el=document.getElementById('page-absences');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Absences / Retards</span></div><div class="card"><div class="card-header"><div class="card-title">📋 Absences & Retards</div><div style="display:flex;gap:8px"><input class="form-control" id="abs-date" type="date" value="'+today()+'" onchange="renderAbs()" style="width:160px"><button class="btn btn-primary btn-sm" onclick="modalAbsence()">+ Saisir</button></div></div><div id="abs-t"></div></div>';
  renderAbs();
}
async function renderAbs() {
  var d=document.getElementById('abs-date')?document.getElementById('abs-date').value:null;
  var r=await db.absences(d?{date:d}:{});
  var rows=(r.data||[]).map(function(a){return '<tr><td><strong>'+(a.profiles?a.profiles.prenom+' '+a.profiles.nom:'')+'</strong></td><td>'+(a.profiles&&a.profiles.classes?a.profiles.classes.nom:'-')+'</td><td>'+fmt(a.date)+'</td><td><span class="badge '+(a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet')+'">'+a.type+'</span></td><td>'+(a.motif||'-')+'</td><td><button class="btn btn-sm '+(a.justifiee?'btn-success':'btn-secondary')+'" onclick="toggleJustif(\''+a.id+'\','+(!a.justifiee)+')">'+( a.justifiee?'✅ Oui':'❌ Non')+'</button></td><td><button class="btn btn-danger btn-sm" onclick="delAbsence(\''+a.id+'\')">🗑️</button></td></tr>';}).join('');
  document.getElementById('abs-t').innerHTML='<div class="table-container"><table><thead><tr><th>Élève</th><th>Classe</th><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
async function modalAbsence() {
  var re=await db.profiles({role:'acteur',actif:true});
  document.getElementById('modal-title').textContent='Saisir une absence / retard';
  document.getElementById('modal-body').innerHTML=
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="absence">Absence</option><option value="retard">Retard</option><option value="exclusion">Exclusion</option></select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-hd" type="time"></div><div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-hf" type="time"></div></div>'+
    '<div class="form-group"><label class="form-label">Motif</label><textarea class="form-control" id="f-motif" rows="2"></textarea></div>'+
    '<div class="form-group" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="f-justif"><label for="f-justif" class="form-label" style="margin:0">Justifiée</label></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveAbsence()">Enregistrer</button>';
  openModal();
}
async function saveAbsence() {
  var eid=g('f-eleve'),d=g('f-date');
  if(!eid||!d){showToast('Champs obligatoires','warning');return;}
  var r=await supa.from('absences').insert({eleve_id:eid,date:d,type:g('f-type'),heure_debut:g('f-hd')||null,heure_fin:g('f-hf')||null,motif:g('f-motif'),justifiee:document.getElementById('f-justif').checked,saisie_par:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Absence enregistrée !','success');renderAbs();
}
async function toggleJustif(id,val){await supa.from('absences').update({justifiee:val}).eq('id',id);renderAbs();}
async function delAbsence(id){if(!confirm('Supprimer ?'))return;await supa.from('absences').delete().eq('id',id);showToast('Supprimé','success');renderAbs();}

// ── NOTES ─────────────────────────────────────
var _per='T1';
async function loadNotes() {
  var el=document.getElementById('page-notes');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Notes</span></div><div class="card"><div class="card-header"><div class="card-title">📝 Notes</div><button class="btn btn-primary btn-sm" onclick="modalNote()">+ Ajouter</button></div><div class="card-body"><div class="tabs"><div class="tab active" onclick="swPer(\'T1\',this)">Trimestre 1</div><div class="tab" onclick="swPer(\'T2\',this)">Trimestre 2</div><div class="tab" onclick="swPer(\'T3\',this)">Trimestre 3</div></div><div id="notes-t"></div></div></div>';
  renderNotes('T1');
}
async function renderNotes(p) {
  _per=p||_per;
  var r=await db.notes({periode:_per});
  var rows=(r.data||[]).map(function(n){return '<tr><td>'+(n.profiles?n.profiles.prenom+' '+n.profiles.nom:'')+'</td><td><span class="badge" style="background:'+n.matieres.couleur+'22;color:'+n.matieres.couleur+'">'+n.matieres.nom+'</span></td><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+(n.intitule||'-')+'</td><td>'+fmt(n.date)+'</td><td><button class="btn btn-danger btn-sm" onclick="delNote(\''+n.id+'\')">🗑️</button></td></tr>';}).join('');
  document.getElementById('notes-t').innerHTML='<div class="table-container"><table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th><th>Intitulé</th><th>Date</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function swPer(p,el){document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});el.classList.add('active');renderNotes(p);}
async function modalNote() {
  var re=await db.profiles({role:'acteur',actif:true}),rm=await db.matieres();
  document.getElementById('modal-title').textContent='Ajouter une note';
  document.getElementById('modal-body').innerHTML=
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'+
    '<div class="form-group"><label class="form-label">Note *</label><input class="form-control" id="f-note" type="number" min="0" max="20" step="0.5" value="10"></div>'+
    '<div class="form-group"><label class="form-label">Sur</label><input class="form-control" id="f-sur" type="number" value="20"></div>'+
    '<div class="form-group"><label class="form-label">Coeff.</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div></div>'+
    mf('Intitulé','f-intitule','','Ex: Contrôle chapitre 3')+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
    '<div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label class="form-label">Période</label><select class="form-control" id="f-periode"><option value="T1">Trimestre 1</option><option value="T2">Trimestre 2</option><option value="T3">Trimestre 3</option></select></div></div>'+
    '<div class="form-group"><label class="form-label">Commentaire</label><textarea class="form-control" id="f-comment" rows="2"></textarea></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveNote()">Enregistrer</button>';
  openModal();
}
async function saveNote() {
  var eid=g('f-eleve'),mid=g('f-matiere'),val=parseFloat(g('f-note'));
  if(!eid||!mid||isNaN(val)){showToast('Champs obligatoires','warning');return;}
  var r=await supa.from('notes').insert({eleve_id:eid,matiere_id:mid,valeur:val,sur:parseFloat(g('f-sur'))||20,coefficient:parseFloat(g('f-coeff'))||1,intitule:g('f-intitule'),date:g('f-date'),periode:g('f-periode'),commentaire:g('f-comment'),professeur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Note enregistrée !','success');renderNotes();
}
async function delNote(id){if(!confirm('Supprimer ?'))return;await supa.from('notes').delete().eq('id',id);showToast('Note supprimée','success');renderNotes();}

// ── CAHIER DE TEXTES ──────────────────────────
async function loadCahier() {
  var el=document.getElementById('page-cahier');
  var rc=await db.classes();
  var peutEcrire=currentRole!=='acteur';
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Cahier de textes</span></div><div class="card"><div class="card-header"><div class="card-title">📖 Cahier de textes</div><div style="display:flex;gap:8px"><select class="form-control" id="cah-cl" onchange="renderCahier()" style="width:170px"><option value="">-- Toutes classes --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select>'+(peutEcrire?'<button class="btn btn-primary btn-sm" onclick="modalCahier()">+ Ajouter</button>':'')+'</div></div><div id="cah-l" class="card-body"></div></div>';
  renderCahier();
}
async function renderCahier() {
  var cid=document.getElementById('cah-cl')?document.getElementById('cah-cl').value:'';
  var r=await db.cahier(cid?{classe_id:cid}:{});
  if(!(r.data||[]).length){document.getElementById('cah-l').innerHTML='<div class="alert alert-info">Aucune entrée.</div>';return;}
  document.getElementById('cah-l').innerHTML=(r.data||[]).map(function(e){return '<div style="border:1px solid var(--gris-border);border-radius:6px;padding:14px;margin-bottom:12px;border-left:4px solid '+(e.matieres?e.matieres.couleur:'#1565C0')+'"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:700;color:'+(e.matieres?e.matieres.couleur:'#1565C0')+'">'+(e.matieres?e.matieres.nom:'?')+'</span><span class="text-muted text-sm">'+fmt(e.date)+' | '+(e.classes?e.classes.nom:'-')+' | '+(e.profiles?e.profiles.prenom+' '+e.profiles.nom:'')+'</span></div>'+(e.contenu_cours?'<div style="margin-bottom:8px"><strong style="font-size:12px;color:#546E7A">📚 Cours :</strong><div style="margin-top:4px">'+e.contenu_cours+'</div></div>':'')+(e.devoirs?'<div><strong style="font-size:12px;color:#546E7A">📝 Devoirs :</strong><div style="margin-top:4px">'+e.devoirs+'</div>'+(e.date_remise?'<div class="text-sm text-muted">📅 À rendre le '+fmt(e.date_remise)+'</div>':'')+'</div>':'')+'</div>';}).join('');
}
async function modalCahier() {
  var rc=await db.classes(),rm=await db.matieres();
  document.getElementById('modal-title').textContent='Ajouter au cahier de textes';
  document.getElementById('modal-body').innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Classe *</label><select class="form-control" id="f-classe">'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div><div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div></div>'+
    '<div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label class="form-label">Contenu du cours</label><textarea class="form-control" id="f-contenu" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Devoirs</label><textarea class="form-control" id="f-devoirs" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Date de remise</label><input class="form-control" id="f-remise" type="date"></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveCahier()">Enregistrer</button>';
  openModal();
}
async function saveCahier() {
  var r=await supa.from('cahier_textes').insert({classe_id:g('f-classe'),matiere_id:g('f-matiere'),date:g('f-date'),contenu_cours:g('f-contenu'),devoirs:g('f-devoirs'),date_remise:g('f-remise')||null,professeur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Entrée ajoutée !','success');renderCahier();
}

// ── MESSAGERIE ────────────────────────────────
async function loadMessages() {
  var el=document.getElementById('page-messages');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Messagerie</span></div><div style="display:grid;grid-template-columns:300px 1fr;gap:16px"><div class="card" style="max-height:580px;display:flex;flex-direction:column"><div class="card-header" style="flex-shrink:0"><div class="card-title">✉️ Reçus</div><button class="btn btn-primary btn-sm" onclick="modalMsg()">+ Nouveau</button></div><div id="msg-l" style="overflow-y:auto;flex:1"></div></div><div class="card" id="msg-d" style="max-height:580px;display:flex;flex-direction:column"><div class="card-body" style="flex:1;display:flex;align-items:center;justify-content:center;color:#90A4AE">Sélectionnez un message</div></div></div>';
  renderMsgs();
}
async function renderMsgs() {
  var r=await db.messages(currentUser.id);
  var el=document.getElementById('msg-l');
  if(!(r.data||[]).length){el.innerHTML='<div style="padding:16px;text-align:center;color:#90A4AE;font-size:13px">Aucun message</div>';return;}
  el.innerHTML=(r.data||[]).map(function(m){return '<div onclick="openMsg(\''+m.id+'\')" style="padding:12px 14px;border-bottom:1px solid var(--gris-border);cursor:pointer;background:'+(m.lu?'white':'#F0F7FF')+'" onmouseover="this.style.background=\'#EEF5FF\'" onmouseout="this.style.background=\''+(m.lu?'white':'#F0F7FF')+'\'"><div style="display:flex;justify-content:space-between;font-size:12px"><strong>'+(m.profiles?m.profiles.prenom+' '+m.profiles.nom:'')+'</strong><span class="text-muted">'+fmtDT(m.date_envoi)+'</span></div><div style="font-size:13px;font-weight:'+(m.lu?400:700)+';margin-top:2px">'+(m.sujet||'(Sans sujet)')+'</div><div style="font-size:11.5px;color:#90A4AE;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'+(m.contenu||'').substring(0,60)+'…</div></div>';}).join('');
}
async function openMsg(id) {
  var r=await supa.from('messages').select('*,profiles!messages_expediteur_id_fkey(nom,prenom)').eq('id',id).maybeSingle();
  await supa.from('messages').update({lu:true}).eq('id',id); refreshNotif();
  var m=r.data;
  document.getElementById('msg-d').innerHTML='<div class="card-header" style="flex-shrink:0"><div><div class="card-title">'+(m.sujet||'(Sans sujet)')+'</div><div class="text-sm text-muted">De : '+(m.profiles?m.profiles.prenom+' '+m.profiles.nom:'')+' | '+fmtDT(m.date_envoi)+'</div></div><button class="btn btn-secondary btn-sm" onclick="modalMsg(\''+m.expediteur_id+'\')">↩ Répondre</button></div><div class="card-body" style="overflow-y:auto;flex:1;white-space:pre-wrap;line-height:1.6">'+(m.contenu||'')+'</div>';
  renderMsgs();
}
async function modalMsg(destId) {
  destId=destId||null;
  var ru=await supa.from('profiles').select('id,nom,prenom,role').eq('actif',true);
  document.getElementById('modal-title').textContent='Nouveau message';
  document.getElementById('modal-body').innerHTML=
    '<div class="form-group"><label class="form-label">Destinataire *</label><select class="form-control" id="f-dest"><option value="">-- Choisir --</option>'+(ru.data||[]).filter(function(u){return u.id!==currentUser.id;}).map(function(u){return '<option value="'+u.id+'"'+(u.id===destId?' selected':'')+'>'+u.prenom+' '+u.nom+' ('+labelRole(u.role)+')</option>';}).join('')+'</select></div>'+
    mf('Sujet','f-sujet','','Objet du message')+
    '<div class="form-group"><label class="form-label">Message *</label><textarea class="form-control" id="f-contenu" rows="6"></textarea></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="sendMsg()">Envoyer ✉️</button>';
  openModal();
}
async function sendMsg() {
  var dest=g('f-dest'),contenu=g('f-contenu');
  if(!dest||!contenu){showToast('Destinataire et message requis','warning');return;}
  var r=await supa.from('messages').insert({destinataire_id:dest,sujet:g('f-sujet'),contenu:contenu,expediteur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Message envoyé !','success');loadMessages();
}

// ── SANCTIONS ─────────────────────────────────
async function loadSanctions() {
  var el=document.getElementById('page-sanctions');
  el.innerHTML=
    '<div class="breadcrumb">M13 Studio <span>Retenues & Sanctions</span></div>'+
    '<div class="card">'+
      '<div class="card-header">'+
        '<div class="card-title">⚠️ Retenues & Sanctions</div>'+
        '<div style="display:flex;gap:8px">'+
          '<button class="btn btn-primary btn-sm" onclick="modalSanction(\'Retenue\')">🕐 Retenue</button>'+
          '<button class="btn btn-secondary btn-sm" onclick="modalSanction(\'Avertissement\')">⚡ Avert.</button>'+
          '<button class="btn btn-sm" style="background:#9C27B0;color:white;border:none" onclick="modalSanction(\'Exclusion temporaire\')">🚫 Exclusion</button>'+
        '</div>'+
      '</div>'+
      '<div id="san-t"></div>'+
    '</div>';
  renderSanctions();
}

async function renderSanctions() {
  var r=await db.sanctions();
  if(!(r.data||[]).length){
    document.getElementById('san-t').innerHTML='<div style="padding:20px;text-align:center;color:#90A4AE">Aucune sanction enregistrée.</div>';
    return;
  }
  var typeColors={'Retenue':'#E65100','Avertissement':'#F9A825','Exclusion temporaire':'#9C27B0','Convocation parents':'#C62828','Travail supplémentaire':'#1565C0'};
  var rows=(r.data||[]).map(function(s){
    var tc=typeColors[s.type]||'#546E7A';
    return '<tr>'+
      '<td><strong>'+(s.profiles?s.profiles.prenom+' '+s.profiles.nom:'')+'</strong></td>'+
      '<td>'+(s.profiles&&s.profiles.classes?s.profiles.classes.nom:'-')+'</td>'+
      '<td><span class="badge" style="background:'+tc+';color:white">'+s.type+'</span></td>'+
      '<td style="font-size:12.5px;max-width:250px">'+(s.motif||'-')+'</td>'+
      '<td>'+fmt(s.date)+'</td>'+
      (s.type==='Retenue'?'<td>'+(s.date_execution?fmt(s.date_execution):'<span class="badge badge-orange">À planifier</span>')+'</td>':'<td>-</td>')+
      '<td><span class="badge '+(s.executee?'badge-vert':'badge-rouge')+'">'+(s.executee?'Fait':'En attente')+'</span></td>'+
      '<td>'+
        '<button class="btn btn-secondary btn-sm" onclick="toggleSanction(\''+s.id+'\','+(!s.executee)+')" title="'+(s.executee?'Marquer non fait':'Marquer fait')+'">'+(s.executee?'↩':'✅')+'</button>'+
        ' <button class="btn btn-danger btn-sm" onclick="delSanction(\''+s.id+'\')" title="Supprimer">🗑️</button>'+
      '</td>'+
    '</tr>';
  }).join('');
  document.getElementById('san-t').innerHTML=
    '<div class="table-container"><table><thead><tr>'+
      '<th>Élève</th><th>Classe</th><th>Type</th><th>Motif / Raison</th><th>Date</th><th>Date retenue</th><th>Statut</th><th>Actions</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

async function modalSanction(typeDefaut) {
  var re=await db.profiles({role:'acteur',actif:true});
  typeDefaut = typeDefaut || 'Retenue';
  var isRetenue = typeDefaut === 'Retenue';
  document.getElementById('modal-title').textContent = '⚠️ Saisir : '+typeDefaut;
  document.getElementById('modal-body').innerHTML=
    '<div class="form-group"><label class="form-label">Élève *</label>'+
      '<select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+
      (re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+
    '</select></div>'+
    '<div class="form-group"><label class="form-label">Type *</label>'+
      '<select class="form-control" id="f-type">'+
        ['Retenue','Avertissement','Exclusion temporaire','Convocation parents','Travail supplémentaire']
          .map(function(t){return '<option'+(t===typeDefaut?' selected':'')+'>'+t+'</option>';}).join('')+
      '</select></div>'+
    '<div class="form-group"><label class="form-label">Motif / Raison détaillée *</label>'+
      '<textarea class="form-control" id="f-motif" rows="4" placeholder="Décrivez précisément le comportement ou la raison de cette sanction…"></textarea>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-group"><label class="form-label">Date de la faute</label>'+
        '<input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
      (isRetenue?'<div class="form-group"><label class="form-label">Date de la retenue</label>'+
        '<input class="form-control" id="f-date-exec" type="date"></div>':'<div></div>')+
    '</div>'+
    (isRetenue?
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-h-debut" type="time" value="17:00"></div>'+
        '<div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-h-fin" type="time" value="18:00"></div>'+
      '</div>'+
      '<div class="form-group"><label class="form-label">Salle / Lieu</label><input class="form-control" id="f-lieu" placeholder="Ex: Salle 204"></div>'
    :'');
  document.getElementById('modal-footer').innerHTML=
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>'+
    '<button class="btn btn-primary" onclick="saveSanction()">Enregistrer</button>';
  openModal();
}

async function saveSanction() {
  var eid=g('f-eleve'),motif=document.getElementById('f-motif').value.trim();
  if(!eid){showToast('Sélectionnez un élève','warning');return;}
  if(!motif){showToast('Le motif est obligatoire','warning');return;}
  var payload = {
    eleve_id:eid,
    type:g('f-type'),
    motif:motif,
    date:g('f-date')||today(),
    prononcee_par:currentUser.id
  };
  var dateExec = document.getElementById('f-date-exec') ? g('f-date-exec') : null;
  if(dateExec) payload.date_execution = dateExec;
  var hDebut = document.getElementById('f-h-debut') ? g('f-h-debut') : null;
  var hFin   = document.getElementById('f-h-fin')   ? g('f-h-fin')   : null;
  var lieu   = document.getElementById('f-lieu')    ? g('f-lieu')    : null;
  if(hDebut) payload.heure_debut_retenue = hDebut;
  if(hFin)   payload.heure_fin_retenue   = hFin;
  if(lieu)   payload.lieu_retenue        = lieu;
  
  var r=await supa.from('sanctions').insert(payload);
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast(payload.type+' enregistrée !','success');renderSanctions();
}

async function toggleSanction(id,val){
  await supa.from('sanctions').update({executee:val}).eq('id',id);
  renderSanctions();
}
async function delSanction(id){
  if(!confirm('Supprimer cette sanction ?'))return;
  await supa.from('sanctions').delete().eq('id',id);
  showToast('Supprimée','success');renderSanctions();
}

// ── BULLETINS ─────────────────────────────────
async function loadBulletins() {
  var el=document.getElementById('page-bulletins');
  var re=await db.profiles({role:'acteur',actif:true});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Bulletins</span></div><div class="card"><div class="card-header"><div class="card-title">📄 Bulletins</div><div style="display:flex;gap:8px"><select class="form-control" id="bul-e" style="width:200px"><option value="">-- Choisir un élève --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select><select class="form-control" id="bul-p" style="width:130px"><option value="T1">Trimestre 1</option><option value="T2">Trimestre 2</option><option value="T3">Trimestre 3</option></select><button class="btn btn-primary btn-sm" onclick="genBulletin()">Générer</button></div></div><div id="bul-c" class="card-body"><div class="alert alert-info">Sélectionnez un élève et une période.</div></div></div>';
}
async function genBulletin() {
  var eid=document.getElementById('bul-e').value,per=document.getElementById('bul-p').value;
  if(!eid){showToast('Choisissez un élève','warning');return;}
  var res=await Promise.all([supa.from('profiles').select('*,classes(nom)').eq('id',eid).maybeSingle(),db.notes({eleve_id:eid,periode:per}),db.absences({eleve_id:eid})]);
  var eleve=res[0].data,notes=res[1].data||[],abs=res[2].data||[];
  var pm={};
  notes.forEach(function(n){var m=n.matieres.nom;if(!pm[m])pm[m]={notes:[],couleur:n.matieres.couleur};pm[m].notes.push(n);});
  var rows=Object.entries(pm).map(function(kv){var mat=kv[0],ns=kv[1].notes,col=kv[1].couleur;var tc=ns.reduce(function(s,n){return s+n.coefficient;},0);var moy=tc>0?ns.reduce(function(s,n){return s+(n.valeur/n.sur*20*n.coefficient);},0)/tc:0;return {mat,moy,nb:ns.length,col};});
  var mg=rows.length?rows.reduce(function(s,r){return s+r.moy;},0)/rows.length:null;
  var na=abs.filter(function(a){return a.type==='absence';}).length,nr=abs.filter(function(a){return a.type==='retard';}).length;
  var lp={T1:'1er Trimestre',T2:'2ème Trimestre',T3:'3ème Trimestre'}[per];
  document.getElementById('bul-c').innerHTML='<div style="max-width:800px;margin:0 auto"><div style="background:var(--bleu-pronote);color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center"><div style="font-family:Raleway,sans-serif;font-size:24px;font-weight:800;letter-spacing:2px">M13 STUDIO</div><div style="font-size:13px;opacity:.8">Bulletin — '+lp+' 2024-2025</div></div><div style="background:#F5F9FF;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border:1px solid #DDE3EA;border-top:none"><div><strong>'+eleve.prenom+' '+eleve.nom+'</strong><br><span class="text-muted text-sm">Classe : '+(eleve.classes?eleve.classes.nom:'-')+'</span></div><div><span class="badge badge-rouge" style="margin-right:6px">Abs: '+na+'</span><span class="badge badge-orange">Retards: '+nr+'</span></div></div><table style="width:100%;border-collapse:collapse;border:1px solid #DDE3EA;border-top:none"><thead><tr style="background:#EEF2F7"><th style="padding:10px 14px;text-align:left;font-size:11.5px;color:#546E7A">Matière</th><th style="padding:10px 14px;text-align:center;font-size:11.5px;color:#546E7A">Notes</th><th style="padding:10px 14px;text-align:center;font-size:11.5px;color:#546E7A">Moyenne</th></tr></thead><tbody>'+rows.map(function(r){return '<tr style="border-bottom:1px solid #F0F4F8"><td style="padding:10px 14px;border-left:3px solid '+(r.col||'#1565C0')+'"><strong>'+r.mat+'</strong></td><td style="padding:10px 14px;text-align:center;color:#546E7A">'+r.nb+'</td><td style="padding:10px 14px;text-align:center"><span style="font-size:18px;font-weight:800;color:'+(r.moy>=14?'#2E7D32':r.moy>=10?'#E65100':'#C62828')+'">'+r.moy.toFixed(2)+'</span><span style="color:#90A4AE;font-size:12px">/20</span></td></tr>';}).join('')+'</tbody></table>'+(mg!==null?'<div style="background:#E3F2FD;padding:16px 20px;border:1px solid #DDE3EA;border-top:none;border-radius:0 0 8px 8px;display:flex;justify-content:space-between;align-items:center"><strong style="color:#1565C0">Moyenne générale</strong><span style="font-size:28px;font-weight:800;color:'+(mg>=14?'#2E7D32':mg>=10?'#E65100':'#C62828')+'">'+mg.toFixed(2)+'<span style="font-size:16px;color:#90A4AE">/20</span></span></div>':'')+'</div>';
}

// ── COMPTES (Réalisateur) ──────────────────────
async function loadComptes() {
  var el=document.getElementById('page-comptes');
  var r=await supa.from('profiles').select('*,classes(nom)').order('role').order('nom');
  var rows=(r.data||[]).map(function(u){return '<tr><td><span class="badge '+(u.role==='realisateur'?'badge-violet':u.role==='moderateur'?'badge-bleu':'badge-vert')+'">'+(u.role==='realisateur'?'🎬 Réalisateur':u.role==='moderateur'?'🎭 Modérateur':'🎓 Acteur')+'</span></td><td><strong>'+u.nom+'</strong></td><td>'+u.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+u.identifiant+'</code></td><td>'+(u.classes?u.classes.nom:'-')+'</td><td><span class="badge '+(u.actif?'badge-vert':'badge-rouge')+'">'+(u.actif?'Actif':'Inactif')+'</span></td><td>'+(u.role==='acteur'?'<button class="btn btn-secondary btn-sm" onclick="modalEleve(\''+u.id+'\')">✏️</button> ':'')+( u.id!==currentUser.id?'<button class="btn btn-danger btn-sm" onclick="deactivate(\''+u.id+'\')">🗑️</button>':'')+'</td></tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Gestion des comptes</span></div><div class="card"><div class="card-header"><div class="card-title">👥 Tous les comptes</div><div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="modalEleve()">+ Acteur</button><button class="btn btn-secondary btn-sm" onclick="modalProf()">+ Modérateur</button></div></div><div class="table-container"><table><thead><tr><th>Rôle</th><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe</th><th>Statut</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

// ── MATIÈRES ──────────────────────────────────
async function loadMatieres() {
  var el=document.getElementById('page-matieres');
  var r=await db.matieres();
  var rows=(r.data||[]).map(function(m){return '<tr><td><span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:3px;background:'+m.couleur+';display:inline-block"></span><strong>'+m.nom+'</strong></span></td><td><code>'+(m.code||'-')+'</code></td><td style="font-size:12px;color:#546E7A">'+m.couleur+'</td><td>'+m.coefficient+'</td><td><button class="btn btn-danger btn-sm" onclick="delMatiere(\''+m.id+'\')">🗑️</button></td></tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Matières</span></div><div class="card"><div class="card-header"><div class="card-title">📚 Matières</div><button class="btn btn-primary btn-sm" onclick="modalMatiere()">+ Ajouter</button></div><div class="table-container"><table><thead><tr><th>Nom</th><th>Code</th><th>Couleur</th><th>Coeff.</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
async function modalMatiere() {
  document.getElementById('modal-title').textContent='Ajouter une matière';
  document.getElementById('modal-body').innerHTML=mf('Nom *','f-nom','','Ex: Mathématiques')+mf('Code','f-code','','Ex: MATH')+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Couleur</label><input class="form-control" id="f-couleur" type="color" value="#3B82F6" style="height:42px;padding:4px 6px"></div><div class="form-group"><label class="form-label">Coefficient</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveMatiere()">Ajouter</button>';
  openModal();
}
async function saveMatiere() {
  var nom=g('f-nom');if(!nom){showToast('Nom requis','warning');return;}
  var r=await supa.from('matieres').insert({nom,code:g('f-code'),couleur:document.getElementById('f-couleur').value,coefficient:parseFloat(g('f-coeff'))||1});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Matière créée !','success');loadMatieres();
}
async function delMatiere(id){if(!confirm('Supprimer ?'))return;await supa.from('matieres').update({actif:false}).eq('id',id);showToast('Supprimé','success');loadMatieres();}

// ── VUE ACTEUR ────────────────────────────────
async function loadMonDashboard() {
  var el=document.getElementById('page-mondashboard');
  var res=await Promise.all([db.notes({eleve_id:currentUser.id}),db.absences({eleve_id:currentUser.id}),supa.from('cahier_textes').select('*,matieres(nom,couleur)').gte('date_remise',today()).order('date_remise').limit(6)]);
  var notes=res[0].data||[],abs=res[1].data||[],devoirs=res[2].data||[];
  var moy=notes.length?notes.reduce(function(s,n){return s+(n.valeur/n.sur*20);},0)/notes.length:null;
  var na=abs.filter(function(a){return a.type==='absence';}).length,nr=abs.filter(function(a){return a.type==='retard';}).length;
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mon espace</span></div><div style="background:var(--bleu-pronote);color:white;border-radius:10px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;border:2px solid rgba(255,255,255,.4)">'+initials(currentUser.nom,currentUser.prenom)+'</div><div><div style="font-family:Raleway,sans-serif;font-size:18px;font-weight:800">Bonjour, '+currentUser.prenom+' !</div><div style="font-size:12.5px;opacity:.8">M13 Studio</div></div></div><div class="dashboard-grid" style="margin-bottom:20px">'+sc('📝','#E3F2FD',moy!==null?'<span class="'+noteColor(moy)+'">'+moy.toFixed(2)+'/20</span>':'-','Moyenne')+sc('📋','#FFEBEE',na,'Absences')+sc('⏱️','#FFF3E0',nr,'Retards')+'</div><div class="card"><div class="card-header"><div class="card-title">📚 Prochains devoirs</div></div><div class="card-body">'+(devoirs.length===0?'<div class="alert alert-success">Aucun devoir prochainement ! 🎉</div>':devoirs.map(function(d){return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--gris-border)"><div style="width:10px;height:10px;border-radius:50%;background:'+(d.matieres?d.matieres.couleur:'#1565C0')+';margin-top:4px;flex-shrink:0"></div><div style="flex:1"><div style="font-weight:600;font-size:13px">'+(d.matieres?d.matieres.nom:'-')+'</div><div style="font-size:12.5px;color:#546E7A;margin-top:2px">'+(d.devoirs||'')+'</div></div><div style="font-size:11.5px;color:var(--rouge);font-weight:600;white-space:nowrap">📅 '+fmt(d.date_remise)+'</div></div>';}).join(''))+'</div></div>';
}
async function loadMesNotes() {
  var el=document.getElementById('page-monnotes');
  var r=await db.notes({eleve_id:currentUser.id});
  var pm={};
  (r.data||[]).forEach(function(n){var m=n.matieres?n.matieres.nom:'?';if(!pm[m])pm[m]={notes:[],couleur:n.matieres?n.matieres.couleur:'#1565C0'};pm[m].notes.push(n);});
  if(!Object.keys(pm).length){el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes notes</span></div><div class="alert alert-info">Aucune note.</div>';return;}
  var cards=Object.entries(pm).map(function(kv){var mat=kv[0],ns=kv[1].notes,col=kv[1].couleur;var tc=ns.reduce(function(s,n){return s+n.coefficient;},0);var moy=tc>0?ns.reduce(function(s,n){return s+(n.valeur/n.sur*20*n.coefficient);},0)/tc:0;return '<div class="card"><div class="card-header"><div class="card-title" style="color:'+col+'">'+mat+'</div><span class="note-value '+noteColor(moy)+'" style="font-size:18px;font-weight:800">'+moy.toFixed(2)+'/20</span></div><div class="table-container"><table><thead><tr><th>Note</th><th>Intitulé</th><th>Période</th><th>Date</th></tr></thead><tbody>'+ns.map(function(n){return '<tr><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+(n.intitule||'-')+'</td><td><span class="badge badge-bleu">'+n.periode+'</span></td><td>'+fmt(n.date)+'</td></tr>';}).join('')+'</tbody></table></div></div>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes notes</span></div><div class="dashboard-grid">'+cards+'</div>';
}
async function loadMesAbsences() {
  var el=document.getElementById('page-monAbsences');
  var r=await db.absences({eleve_id:currentUser.id});
  var rows=(r.data||[]).length===0?'<tr><td colspan="4" style="text-align:center;color:#90A4AE;padding:20px">Aucune absence 🎉</td></tr>':(r.data||[]).map(function(a){return '<tr><td>'+fmt(a.date)+'</td><td><span class="badge '+(a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet')+'">'+a.type+'</span></td><td>'+(a.motif||'-')+'</td><td>'+(a.justifiee?'<span class="badge badge-vert">Justifiée</span>':'<span class="badge badge-rouge">Non justifiée</span>')+'</td></tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes absences</span></div><div class="card"><div class="card-header"><div class="card-title">📋 Mes absences et retards</div></div><div class="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

// ── HELPERS ───────────────────────────────────
function g(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
function mf(label,id,val,ph){return '<div class="form-group"><label class="form-label">'+label+'</label><input class="form-control" id="'+id+'" value="'+(val||'')+'" placeholder="'+(ph||'')+'"></div>';}

// ── POINT D'ENTRÉE ────────────────────────────
function init() {
  // Le CDN Supabase crée window.supabase — on l'utilise directement
  supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  if (loadSession()) { initApp(); return; }

  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app').style.display='none';

  var btn=document.getElementById('btn-login');
  if(btn) btn.addEventListener('click', login);

  ['login-ident','login-pwd'].forEach(function(id){
    var f=document.getElementById(id);
    if(f){
      f.addEventListener('keydown',function(e){if(e.key==='Enter')login();});
      f.addEventListener('input',clearLoginError);
    }
  });

  var ov=document.getElementById('generic-modal');
  if(ov) ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
}

document.addEventListener('DOMContentLoaded', init);

// =============================================
// M13 STUDIO — MODULE PUBLICATIONS v2
// Sondages, Infos, Prise de conscience
// =============================================

// ── PUBLICATIONS : PAGE PRINCIPALE ───────────
async function loadPublications() {
  var el = document.getElementById('page-publications');
  var canCreate = currentRole !== 'acteur'; // acteurs soumettent pour validation
  
  el.innerHTML = 
    '<div class="breadcrumb">M13 Studio <span>Publications</span></div>' +
    '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-header">' +
        '<div class="card-title">📢 Publications</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-primary btn-sm" onclick="modalPublication(\'info\')">📋 Nouvelle info</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="modalPublication(\'sondage\')">📊 Nouveau sondage</button>' +
          (currentRole !== 'acteur' ? '<button class="btn btn-sm" style="background:#F3E5F5;color:#6A1B9A;border:none" onclick="loadValidations()">⏳ En attente</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="card-body" style="padding:10px 16px">' +
        '<div class="tabs" style="margin-bottom:0">' +
          '<div class="tab active" onclick="filterPubs(\'tous\',this)">Toutes</div>' +
          '<div class="tab" onclick="filterPubs(\'info\',this)">📋 Infos</div>' +
          '<div class="tab" onclick="filterPubs(\'sondage\',this)">📊 Sondages</div>' +
          (currentRole !== 'acteur' ? '<div class="tab" onclick="filterPubs(\'draft\',this)">⏳ En attente</div>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="pubs-list"></div>';
  
  renderPublications('tous');
}

var _pubFilter = 'tous';
async function filterPubs(f, el) {
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  if(el) el.classList.add('active');
  renderPublications(f);
}

async function renderPublications(filter) {
  _pubFilter = filter;
  var el = document.getElementById('pubs-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:#90A4AE">Chargement…</div>';

  var q = supa.from('publications')
    .select('*, profiles!publications_auteur_id_fkey(nom,prenom,role)')
    .order('creee_le', {ascending: false});

  if (filter === 'info')    q = q.eq('type', 'info').eq('statut', 'published');
  else if (filter === 'sondage') q = q.eq('type', 'sondage').eq('statut', 'published');
  else if (filter === 'draft')   q = q.eq('statut', 'draft');
  else q = q.eq('statut', 'published');

  var r = await q;
  var pubs = r.data || [];

  if (!pubs.length) {
    el.innerHTML = '<div class="alert alert-info">Aucune publication.</div>';
    return;
  }

  el.innerHTML = '';
  for (var i = 0; i < pubs.length; i++) {
    el.innerHTML += await renderOnePub(pubs[i]);
  }
}

async function renderOnePub(pub) {
  var auteur = pub.profiles ? pub.profiles.prenom + ' ' + pub.profiles.nom : '?';
  var isAdmin = currentRole !== 'acteur';
  var html = '<div id="pub-'+pub.id+'" style="background:white;border-radius:8px;border:1px solid var(--gris-border);padding:18px;margin-bottom:14px;box-shadow:var(--ombre)">';

  // En-tête
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">';
  html += '<div style="display:flex;align-items:center;gap:10px">';
  html += '<span style="font-size:22px">' + (pub.type === 'info' ? '📋' : '📊') + '</span>';
  html += '<div><div style="font-weight:700;font-size:15px">' + pub.titre + '</div>';
  html += '<div style="font-size:12px;color:#90A4AE;margin-top:2px">' + auteur + ' · ' + fmt(pub.creee_le) + 
    (pub.statut === 'draft' ? ' · <span class="badge badge-orange">En attente de validation</span>' : '') + '</div></div>';
  html += '</div>';
  if (isAdmin && pub.auteur_id !== currentUser.id) {
    html += '<div style="display:flex;gap:6px">';
    if (pub.statut === 'draft') {
      html += '<button class="btn btn-success btn-sm" onclick="validerPub(\''+pub.id+'\')">✅ Valider</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="rejeterPub(\''+pub.id+'\')">❌ Rejeter</button>';
    }
    html += '</div>';
  }
  if (pub.auteur_id === currentUser.id || currentRole === 'realisateur') {
    html += '<button class="btn btn-danger btn-sm" onclick="deletePub(\''+pub.id+'\')">🗑️</button>';
  }
  html += '</div>';

  // Contenu
  if (pub.contenu) html += '<div style="font-size:13.5px;line-height:1.6;margin-bottom:14px;color:#37474F">' + pub.contenu + '</div>';

  // SONDAGE
  if (pub.type === 'sondage' && pub.options && pub.statut === 'published') {
    html += await renderSondage(pub);
  }

  // INFO — prise de conscience
  if (pub.type === 'info' && pub.statut === 'published') {
    html += await renderPriseConscience(pub);
  }

  html += '</div>';
  return html;
}

async function renderSondage(pub) {
  var opts = pub.options || [];
  var rr = await supa.from('sondage_reponses').select('*').eq('publication_id', pub.id);
  var reponses = rr.data || [];
  var total = reponses.length;
  var maReponse = reponses.find(function(r){ return r.auteur_id === currentUser.id; });

  var html = '<div style="background:#F5F9FF;border-radius:8px;padding:14px;border:1px solid #BBDEFB">';
  html += '<div style="font-size:12.5px;font-weight:700;color:#1565C0;margin-bottom:10px">📊 ' + total + ' réponse(s)</div>';

  opts.forEach(function(opt) {
    var nb = reponses.filter(function(r){ return r.reponse === opt; }).length;
    var pct = total > 0 ? Math.round(nb / total * 100) : 0;
    var isChosen = maReponse && maReponse.reponse === opt;
    html += '<div style="margin-bottom:8px">';
    if (!maReponse) {
      // Pas encore répondu : bouton vote
      html += '<button onclick="voterSondage(\''+pub.id+'\',\''+opt.replace(/'/g,"\\'")+'\')" style="width:100%;text-align:left;padding:10px 14px;border-radius:6px;border:2px solid '+(isChosen?'#1565C0':'#DDE3EA')+';background:white;cursor:pointer;font-size:13px;transition:.15s" onmouseover="this.style.borderColor=\'#1565C0\'" onmouseout="this.style.borderColor=\''+(isChosen?'#1565C0':'#DDE3EA')+'\'">'+opt+'</button>';
    } else {
      // Déjà répondu : afficher résultat
      html += '<div style="padding:8px 0"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="font-weight:'+(isChosen?700:400)+'">'+opt+(isChosen?' ✓':'')+'</span><span>'+nb+' ('+pct+'%)</span></div>';
      html += '<div style="height:8px;background:#E3F2FD;border-radius:4px"><div style="height:8px;background:'+(isChosen?'#1565C0':'#90CAF9')+';border-radius:4px;width:'+pct+'%;transition:width .4s"></div></div></div>';
    }
    html += '</div>';
  });

  // Admin peut voir tout même sans avoir répondu
  if (!maReponse && currentRole !== 'acteur' && total > 0) {
    html += '<div style="font-size:11.5px;color:#90A4AE;margin-top:8px">Résultats (vue admin) :</div>';
    opts.forEach(function(opt) {
      var nb = reponses.filter(function(r){ return r.reponse === opt; }).length;
      var pct = total > 0 ? Math.round(nb / total * 100) : 0;
      html += '<div style="font-size:12.5px;margin:2px 0">' + opt + ' : <strong>' + nb + '</strong> (' + pct + '%)</div>';
    });
  }

  html += '</div>';
  return html;
}

async function renderPriseConscience(pub) {
  var rl = await supa.from('info_lues').select('id').eq('publication_id', pub.id).eq('utilisateur_id', currentUser.id).maybeSingle();
  var aLu = rl.data !== null;
  var rtotal = await supa.from('info_lues').select('id', {count:'exact',head:true}).eq('publication_id', pub.id);
  var nbLus = rtotal.count || 0;

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:'+(aLu?'#E8F5E9':'#FFF3E0')+';border-radius:8px;margin-top:8px;border:1px solid '+(aLu?'#A5D6A7':'#FFE082')+'">';
  if (aLu) {
    html += '<span style="font-size:13px;color:#2E7D32;font-weight:600">✅ Information prise en compte</span>';
  } else {
    html += '<span style="font-size:13px;color:#E65100">⚠️ Vous devez prendre connaissance de cette information</span>';
    html += '<button class="btn btn-sm" style="background:#E65100;color:white;border:none" onclick="prendreConscience(\''+pub.id+'\')">J\'ai pris connaissance</button>';
  }
  html += '<span style="font-size:12px;color:#78909C;margin-left:8px">'+nbLus+' lecture(s)</span>';
  html += '</div>';
  return html;
}

// ── ACTIONS SONDAGE ───────────────────────────
async function voterSondage(pubId, reponse) {
  var r = await supa.from('sondage_reponses').insert({publication_id:pubId, auteur_id:currentUser.id, reponse:reponse});
  if (r.error) { showToast('Erreur: '+r.error.message,'danger'); return; }
  showToast('Vote enregistré !','success');
  renderPublications(_pubFilter);
}

async function prendreConscience(pubId) {
  var r = await supa.from('info_lues').insert({publication_id:pubId, utilisateur_id:currentUser.id});
  if (r.error && !r.error.message.includes('duplicate')) { showToast('Erreur','danger'); return; }
  showToast('Prise de conscience enregistrée !','success');
  renderPublications(_pubFilter);
}

async function validerPub(id) {
  await supa.from('publications').update({statut:'published', valide_par:currentUser.id, date_validation:new Date().toISOString()}).eq('id',id);
  showToast('Publication validée et publiée !','success');
  renderPublications(_pubFilter);
}

async function rejeterPub(id) {
  var raison = prompt('Raison du rejet (optionnel) :');
  await supa.from('publications').update({statut:'rejected'}).eq('id',id);
  showToast('Publication rejetée.','warning');
  renderPublications(_pubFilter);
}

async function deletePub(id) {
  if (!confirm('Supprimer cette publication ?')) return;
  await supa.from('publications').delete().eq('id',id);
  showToast('Supprimée','success');
  renderPublications(_pubFilter);
}

// ── CRÉER PUBLICATION ─────────────────────────
async function modalPublication(type) {
  var rc = await db.classes();
  var needsValidation = currentRole === 'acteur';
  document.getElementById('modal-title').textContent = type === 'info' ? '📋 Nouvelle information' : '📊 Nouveau sondage';
  
  var body = mf('Titre *','f-titre','','Ex: Réunion parents d\'élèves…') +
    '<div class="form-group"><label class="form-label">Contenu</label><textarea class="form-control" id="f-contenu" rows="4" placeholder="Décrivez l\'information ou posez votre question…"></textarea></div>';

  if (type === 'sondage') {
    body += '<div class="form-group"><label class="form-label">Options du sondage (une par ligne) *</label>' +
      '<textarea class="form-control" id="f-options" rows="4" placeholder="Oui\nNon\nPeut-être"></textarea></div>';
  }

  body += '<div class="form-group"><label class="form-label">Destinataires</label>' +
    '<select class="form-control" id="f-cible" onchange="updateCibleSelect()">' +
      '<option value="tous">Tous</option>' +
      '<option value="classe">Une classe spécifique</option>' +
    '</select></div>' +
    '<div id="f-classe-wrap" style="display:none" class="form-group"><label class="form-label">Classe</label>' +
      '<select class="form-control" id="f-classe"><option value="">-- Choisir --</option>' +
      (rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('') +
      '</select></div>';

  body += '<div class="form-group"><label class="form-label">Date d\'expiration (optionnel)</label>' +
    '<input class="form-control" id="f-expir" type="date"></div>';

  if (needsValidation) {
    body += '<div class="alert alert-warning" style="margin-top:8px">⚠️ En tant qu\'acteur, votre publication sera soumise à validation avant d\'être publiée.</div>';
  }

  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = 
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>' +
    '<button class="btn btn-primary" onclick="savePublication(\''+type+'\')">'+
      (needsValidation ? 'Soumettre pour validation' : 'Publier') +
    '</button>';
  openModal();
}

function updateCibleSelect() {
  var v = document.getElementById('f-cible').value;
  document.getElementById('f-classe-wrap').style.display = v === 'classe' ? 'block' : 'none';
}

async function savePublication(type) {
  var titre = g('f-titre');
  var contenu = g('f-contenu');
  if (!titre) { showToast('Titre requis','warning'); return; }

  var opts = null;
  if (type === 'sondage') {
    var optsTxt = document.getElementById('f-options') ? document.getElementById('f-options').value.trim() : '';
    opts = optsTxt.split('\n').map(function(o){return o.trim();}).filter(function(o){return o;});
    if (opts.length < 2) { showToast('Au moins 2 options pour un sondage','warning'); return; }
  }

  var cible = g('f-cible') || 'tous';
  var classeId = cible === 'classe' ? (g('f-classe')||null) : null;
  var statut = currentRole === 'acteur' ? 'draft' : 'published';

  var r = await supa.from('publications').insert({
    auteur_id: currentUser.id,
    type: type,
    titre: titre,
    contenu: contenu || null,
    options: opts,
    cible: cible,
    classe_id: classeId,
    statut: statut,
    demande_validation: currentRole === 'acteur',
    date_expiration: g('f-expir') || null
  });

  if (r.error) { showToast('Erreur: '+r.error.message,'danger'); return; }
  closeModal();
  showToast(statut === 'draft' ? 'Soumis pour validation !' : 'Publié !', 'success');
  renderPublications('tous');
}

// ── AGENDA / ÉVÉNEMENTS ───────────────────────
async function loadAgenda() {
  var el = document.getElementById('page-agenda');
  el.innerHTML = 
    '<div class="breadcrumb">M13 Studio <span>Agenda</span></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">📅 Agenda & Événements</div>' +
        (currentRole !== 'acteur' ? '<button class="btn btn-primary btn-sm" onclick="modalEvenement()">+ Ajouter</button>' : '') +
      '</div>' +
      '<div id="agenda-list" class="card-body"></div>' +
    '</div>';
  renderAgenda();
}

async function renderAgenda() {
  var r = await supa.from('evenements').select('*, classes(nom), profiles!evenements_createur_id_fkey(nom,prenom)')
    .gte('date_debut', today()).order('date_debut').limit(30);
  
  var evts = r.data || [];
  if (!evts.length) {
    document.getElementById('agenda-list').innerHTML = '<div class="alert alert-info">Aucun événement à venir.</div>';
    return;
  }

  var icons = {evenement:'📅',examen:'📝',sortie:'🚌',reunion:'👥',autre:'📌'};
  var colors = {evenement:'#1565C0',examen:'#C62828',sortie:'#2E7D32',reunion:'#6A1B9A',autre:'#455A64'};

  document.getElementById('agenda-list').innerHTML = evts.map(function(e){
    return '<div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--gris-border);align-items:flex-start">' +
      '<div style="background:'+(colors[e.type]||'#1565C0')+'22;border-radius:8px;padding:10px;flex-shrink:0;text-align:center;min-width:54px">' +
        '<div style="font-size:18px">'+(icons[e.type]||'📅')+'</div>' +
        '<div style="font-size:10px;font-weight:700;color:'+(colors[e.type]||'#1565C0')+'">'+fmt(e.date_debut)+'</div>' +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-weight:700;font-size:14px">'+e.titre+'</div>' +
        '<div style="font-size:12.5px;color:#546E7A;margin-top:2px">' +
          (e.heure_debut ? e.heure_debut.substring(0,5)+(e.heure_fin?'→'+e.heure_fin.substring(0,5):'') : '') +
          (e.classes ? ' · Classe : '+e.classes.nom : '') +
        '</div>' +
        (e.description ? '<div style="font-size:13px;color:#37474F;margin-top:4px">'+e.description+'</div>' : '') +
      '</div>' +
      (currentRole !== 'acteur' ? '<button class="btn btn-danger btn-sm" onclick="delEvenement(\''+e.id+'\')">🗑️</button>' : '') +
    '</div>';
  }).join('');
}

async function modalEvenement() {
  var rc = await db.classes();
  document.getElementById('modal-title').textContent = '📅 Ajouter un événement';
  document.getElementById('modal-body').innerHTML = 
    mf('Titre *','f-titre','') +
    '<div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="f-desc" rows="2"></textarea></div>' +
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="evenement">Événement</option><option value="examen">Examen / Contrôle</option><option value="sortie">Sortie scolaire</option><option value="reunion">Réunion</option><option value="autre">Autre</option></select></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="form-group"><label class="form-label">Date début *</label><input class="form-control" id="f-ddebut" type="date" value="'+today()+'"></div>' +
      '<div class="form-group"><label class="form-label">Date fin</label><input class="form-control" id="f-dfin" type="date"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-hdebut" type="time"></div>' +
      '<div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-hfin" type="time"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Classe (optionnel)</label><select class="form-control" id="f-classe"><option value="">Tous</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveEvenement()">Ajouter</button>';
  openModal();
}

async function saveEvenement() {
  var titre = g('f-titre');
  if (!titre) { showToast('Titre requis','warning'); return; }
  var r = await supa.from('evenements').insert({
    titre:titre, description:g('f-desc')||null, type:g('f-type'),
    date_debut:g('f-ddebut'), date_fin:g('f-dfin')||null,
    heure_debut:g('f-hdebut')||null, heure_fin:g('f-hfin')||null,
    classe_id:g('f-classe')||null, createur_id:currentUser.id
  });
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Événement ajouté !','success'); renderAgenda();
}

async function delEvenement(id) {
  if (!confirm('Supprimer cet événement ?')) return;
  await supa.from('evenements').delete().eq('id',id);
  showToast('Supprimé','success'); renderAgenda();
}

// ── NOTES PERSONNELLES ────────────────────────
async function loadNotesPerso() {
  var el = document.getElementById('page-notesperso');
  el.innerHTML = 
    '<div class="breadcrumb">M13 Studio <span>Mes notes personnelles</span></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<h3 style="font-size:16px;font-weight:700;color:var(--bleu-pronote)">📒 Mon carnet</h3>' +
      '<button class="btn btn-primary btn-sm" onclick="modalNotePerso()">+ Nouvelle note</button>' +
    '</div>' +
    '<div id="nperso-list" class="dashboard-grid"></div>';
  renderNotesPerso();
}

async function renderNotesPerso() {
  var r = await supa.from('notes_perso').select('*').eq('utilisateur_id', currentUser.id).order('modifiee_le', {ascending:false});
  var notes = r.data || [];
  if (!notes.length) {
    document.getElementById('nperso-list').innerHTML = '<div class="alert alert-info" style="grid-column:1/-1">Aucune note personnelle.</div>';
    return;
  }
  document.getElementById('nperso-list').innerHTML = notes.map(function(n){
    return '<div style="background:'+(n.couleur||'#FFF9C4')+';border-radius:8px;padding:16px;border:1px solid rgba(0,0,0,.08);position:relative">' +
      '<div style="font-weight:700;font-size:14px;margin-bottom:8px">' + (n.titre||'Sans titre') + '</div>' +
      '<div style="font-size:13px;color:#37474F;white-space:pre-wrap;line-height:1.5">' + (n.contenu||'') + '</div>' +
      '<div style="font-size:11px;color:#78909C;margin-top:10px">' + fmtDT(n.modifiee_le) + '</div>' +
      '<div style="position:absolute;top:10px;right:10px;display:flex;gap:4px">' +
        '<button class="btn btn-sm" style="padding:3px 7px;background:rgba(0,0,0,.08);border:none;border-radius:4px" onclick="editNotePerso(\''+n.id+'\')">✏️</button>' +
        '<button class="btn btn-sm" style="padding:3px 7px;background:rgba(198,40,40,.15);border:none;border-radius:4px" onclick="delNotePerso(\''+n.id+'\')">🗑️</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

var _colors = ['#FFF9C4','#F8BBD0','#C8E6C9','#B3E5FC','#E1BEE7','#FFE0B2','#F0F4F8'];

async function modalNotePerso(id) {
  id = id || null;
  var note = null;
  if (id) { var rn = await supa.from('notes_perso').select('*').eq('id',id).maybeSingle(); note = rn.data; }
  document.getElementById('modal-title').textContent = id ? '✏️ Modifier la note' : '📒 Nouvelle note';
  document.getElementById('modal-body').innerHTML = 
    mf('Titre','f-titre', note?note.titre||'':'') +
    '<div class="form-group"><label class="form-label">Contenu</label><textarea class="form-control" id="f-contenu" rows="6" style="font-family:monospace">'+(note?note.contenu||'':'')+'</textarea></div>' +
    '<div class="form-group"><label class="form-label">Couleur</label><div style="display:flex;gap:8px;flex-wrap:wrap">' +
    _colors.map(function(c){return '<div onclick="selectNoteColor(this,\''+c+'\')" style="width:30px;height:30px;border-radius:50%;background:'+c+';cursor:pointer;border:3px solid '+(note&&note.couleur===c?'#1565C0':'transparent')+'" data-color="'+c+'"></div>';}).join('') +
    '</div></div>' +
    '<input type="hidden" id="f-couleur" value="'+(note?note.couleur||_colors[0]:_colors[0])+'">';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveNotePerso(\''+(id||'')+'\')">Enregistrer</button>';
  openModal();
}

function selectNoteColor(el, color) {
  document.querySelectorAll('[data-color]').forEach(function(d){ d.style.border='3px solid transparent'; });
  el.style.border = '3px solid #1565C0';
  document.getElementById('f-couleur').value = color;
}

function editNotePerso(id) { modalNotePerso(id); }

async function saveNotePerso(id) {
  var data = { titre:g('f-titre'), contenu:document.getElementById('f-contenu').value, couleur:g('f-couleur'), utilisateur_id:currentUser.id, modifiee_le:new Date().toISOString() };
  var r;
  if (id) { r = await supa.from('notes_perso').update(data).eq('id',id); }
  else    { r = await supa.from('notes_perso').insert(data); }
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Note sauvegardée !','success'); renderNotesPerso();
}

async function delNotePerso(id) {
  if (!confirm('Supprimer cette note ?')) return;
  await supa.from('notes_perso').delete().eq('id',id);
  showToast('Supprimée','success'); renderNotesPerso();
}

// ── RESSOURCES PARTAGÉES ──────────────────────
async function loadRessources() {
  var el = document.getElementById('page-ressources');
  el.innerHTML =
    '<div class="breadcrumb">M13 Studio <span>Ressources</span></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">📂 Ressources partagées</div>' +
        (currentRole !== 'acteur' ? '<button class="btn btn-primary btn-sm" onclick="modalRessource()">+ Ajouter</button>' : '') +
      '</div>' +
      '<div id="res-list" class="card-body"></div>' +
    '</div>';
  renderRessources();
}

async function renderRessources() {
  var r = await supa.from('ressources').select('*, matieres(nom,couleur), classes(nom), profiles!ressources_auteur_id_fkey(nom,prenom)').order('creee_le',{ascending:false});
  var list = r.data || [];
  if (!list.length) { document.getElementById('res-list').innerHTML='<div class="alert alert-info">Aucune ressource partagée.</div>'; return; }
  var icons = {document:'📄',video:'🎥',lien:'🔗',exercice:'📝',autre:'📦'};
  document.getElementById('res-list').innerHTML = list.map(function(r){
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--gris-border)">' +
      '<span style="font-size:24px">'+(icons[r.type]||'📄')+'</span>' +
      '<div style="flex:1">' +
        '<a href="'+r.url+'" target="_blank" style="font-weight:700;font-size:14px;color:var(--bleu-pronote);text-decoration:none">'+r.titre+'</a>' +
        '<div style="font-size:12px;color:#90A4AE;margin-top:2px">' +
          (r.matieres?'<span class="badge" style="background:'+r.matieres.couleur+'22;color:'+r.matieres.couleur+'">'+r.matieres.nom+'</span> ':'')+
          (r.classes?r.classes.nom+' · ':'')+
          (r.profiles?r.profiles.prenom+' '+r.profiles.nom:'')+
          ' · '+fmt(r.creee_le) +
        '</div>' +
        (r.description?'<div style="font-size:12.5px;color:#546E7A;margin-top:2px">'+r.description+'</div>':'') +
      '</div>' +
      '<a href="'+r.url+'" target="_blank" class="btn btn-secondary btn-sm">Ouvrir 🔗</a>' +
    '</div>';
  }).join('');
}

async function modalRessource() {
  var rm = await db.matieres(), rc = await db.classes();
  document.getElementById('modal-title').textContent = '📂 Ajouter une ressource';
  document.getElementById('modal-body').innerHTML = 
    mf('Titre *','f-titre','') +
    mf('URL *','f-url','','https://…') +
    '<div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="f-desc" rows="2"></textarea></div>' +
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="document">Document</option><option value="video">Vidéo</option><option value="lien">Lien web</option><option value="exercice">Exercice</option><option value="autre">Autre</option></select></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="form-group"><label class="form-label">Matière</label><select class="form-control" id="f-matiere"><option value="">-- Toutes --</option>'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div>' +
      '<div class="form-group"><label class="form-label">Classe</label><select class="form-control" id="f-classe"><option value="">-- Toutes --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div>' +
    '</div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveRessource()">Ajouter</button>';
  openModal();
}

async function saveRessource() {
  var titre=g('f-titre'), url=g('f-url');
  if(!titre||!url){showToast('Titre et URL requis','warning');return;}
  var r=await supa.from('ressources').insert({titre,url,description:g('f-desc')||null,type:g('f-type'),matiere_id:g('f-matiere')||null,classe_id:g('f-classe')||null,auteur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Ressource ajoutée !','success');renderRessources();
}

// ── HOOK : étendre navigate et buildSidebar ───
var _origNavigate = navigate;
navigate = function(page) {
  var extras = {publications:loadPublications, agenda:loadAgenda, notesperso:loadNotesPerso, ressources:loadRessources};
  if (extras[page]) {
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.sidebar-item').forEach(function(i){i.classList.remove('active');});
    var p = document.getElementById('page-'+page);
    if(p) p.classList.add('active');
    var n = document.querySelector('.sidebar-item[data-page="'+page+'"]');
    if(n) n.classList.add('active');
    extras[page]();
  } else {
    _origNavigate(page);
  }
};

var _origBuildSidebar = buildSidebar;
buildSidebar = function() {
  _origBuildSidebar();
  var nav = document.getElementById('sidebar-nav');
  var extra = '<div class="sidebar-section"><div class="sidebar-section-title">Communauté</div>' +
    '<a class="sidebar-item" data-page="publications" onclick="navigate(\'publications\')"><span class="icon">📢</span> Publications</a>' +
    '<a class="sidebar-item" data-page="agenda" onclick="navigate(\'agenda\')"><span class="icon">📅</span> Agenda</a>' +
    '<a class="sidebar-item" data-page="ressources" onclick="navigate(\'ressources\')"><span class="icon">📂</span> Ressources</a>' +
    '</div>' +
    '<div class="sidebar-section"><div class="sidebar-section-title">Personnel</div>' +
    '<a class="sidebar-item" data-page="notesperso" onclick="navigate(\'notesperso\')"><span class="icon">📒</span> Mes notes perso</a>' +
    '</div>';
  nav.innerHTML += extra;
};

// ── AJOUTER LES PAGES AU HTML DYNAMIQUEMENT ───
var _origInitApp = initApp;
initApp = function() {
  var main = document.querySelector('.main-content');
  if (main) {
    ['publications','agenda','notesperso','ressources'].forEach(function(page){
      if (!document.getElementById('page-'+page)) {
        var div = document.createElement('div');
        div.className = 'page';
        div.id = 'page-'+page;
        main.appendChild(div);
      }
    });
  }
  _origInitApp();
};


// =============================================
// MODULE ABSENCES AVANCÉ — Motifs colorés
// =============================================

var MOTIFS_ABSENCE = [
  {label:'MALADIE AVEC CERTIFICAT',        couleur:'#E91E8C', cat:'Santé'},
  {label:'MALADIE SANS CERTIFICAT',        couleur:'#1565C0', cat:'Santé'},
  {label:'INFIRMERIE',                      couleur:'#00BCD4', cat:'Santé'},
  {label:'RDV MÉDICAL EXTÉRIEUR',          couleur:'#FFC107', cat:'Santé'},
  {label:'VISITE MÉDICALE',                couleur:'#8BC34A', cat:'Santé'},
  {label:'CONVOCATION ADMINISTRATIVE',     couleur:'#F44336', cat:'Administratif'},
  {label:'EXCLUSION TEMPORAIRE',           couleur:'#9C27B0', cat:'Administratif'},
  {label:'STAGE EN ENTREPRISE',            couleur:'#E53935', cat:'Administratif'},
  {label:'SORTIE SCOLAIRE OU PÉDAGOGIQUE', couleur:'#00E676', cat:'Administratif'},
  {label:'REUNION DÉLÉGUÉS',               couleur:'#F48FB1', cat:'Administratif'},
  {label:'REUNION FSE',                    couleur:'#1E88E5', cat:'Administratif'},
  {label:'REUNION (AUTRE)',                couleur:'#81D4FA', cat:'Administratif'},
  {label:'RAISON FAMILIALE',               couleur:'#1B5E20', cat:'Social'},
  {label:'RDV ASSISTANTE SOCIALE',         couleur:'#827717', cat:'Social'},
  {label:'RDV PSYCHOLOGUE E.N.',           couleur:'#4E342E', cat:'Social'},
  {label:'PROBLÈME DE TRANSPORT',          couleur:'#0D47A1', cat:'Social'},
  {label:'MOTIF NON ENCORE CONNU',         couleur:'#EEEEEE', cat:'Autre'},
  {label:'DIVERS',                         couleur:'#006064', cat:'Autre'},
  {label:'SANS EXCUSES',                   couleur:'#FFEE58', cat:'Autre'},
];

function motifInfo(label) {
  return MOTIFS_ABSENCE.find(function(m){ return m.label === label; }) || {couleur:'#90A4AE'};
}

function motifBadge(label) {
  if (!label) return '<span style="font-size:11px;color:#90A4AE">—</span>';
  var m = motifInfo(label);
  var dark = ['#EEEEEE','#FFEE58','#FFC107','#00E676','#81D4FA','#8BC34A','#F48FB1'];
  var textColor = dark.indexOf(m.couleur) >= 0 ? '#263238' : 'white';
  return '<span style="background:'+m.couleur+';color:'+textColor+';padding:2px 7px;border-radius:10px;font-size:10.5px;font-weight:700;white-space:nowrap;border:1px solid rgba(0,0,0,.1)">'+label+'</span>';
}

function buildMotifSelect(selectedVal) {
  var cats = {};
  MOTIFS_ABSENCE.forEach(function(m) {
    if (!cats[m.cat]) cats[m.cat] = [];
    cats[m.cat].push(m);
  });
  var html = '<select class="form-control" id="f-motif-code"><option value="">-- Choisir un motif --</option>';
  Object.entries(cats).forEach(function(kv) {
    html += '<optgroup label="── ' + kv[0] + ' ──">';
    kv[1].forEach(function(m) {
      html += '<option value="' + m.label + '"' + (selectedVal === m.label ? ' selected' : '') + '>' + m.label + '</option>';
    });
    html += '</optgroup>';
  });
  html += '</select>';
  return html;
}

// Override loadAbsences avec la version avancée
loadAbsences = async function() {
  var el = document.getElementById('page-absences');
  el.innerHTML =
    '<div class="breadcrumb">M13 Studio <span>Absences / Retards</span></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">📋 Absences & Retards</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<input class="form-control" id="abs-date" type="date" value="' + today() + '" onchange="renderAbsV2()" style="width:155px">' +
          '<select class="form-control" id="abs-tf" onchange="renderAbsV2()" style="width:120px">' +
            '<option value="">Tous</option>' +
            '<option value="absence">Absence</option>' +
            '<option value="retard">Retard</option>' +
            '<option value="exclusion">Exclusion</option>' +
          '</select>' +
          '<button class="btn btn-primary btn-sm" onclick="modalAbsenceV2()">+ Saisir</button>' +
        '</div>' +
      '</div>' +
      '<div id="abs-t2"></div>' +
    '</div>';
  renderAbsV2();
};

async function renderAbsV2() {
  var d  = document.getElementById('abs-date') ? document.getElementById('abs-date').value : null;
  var tf = document.getElementById('abs-tf')   ? document.getElementById('abs-tf').value   : '';
  var filters = d ? {date: d} : {};
  var r = await db.absences(filters);
  var data = (r.data || []);
  if (tf) data = data.filter(function(a) { return a.type === tf; });

  var target = document.getElementById('abs-t2');
  if (!target) return;
  if (!data.length) {
    target.innerHTML = '<div style="padding:24px;text-align:center;color:#90A4AE">Aucune absence pour ces filtres.</div>';
    return;
  }

  var typeColors = {absence:'#C62828', retard:'#E65100', exclusion:'#6A1B9A'};
  var rows = data.map(function(a) {
    var tc = typeColors[a.type] || '#546E7A';
    var mc = a.motif_code || a.motif || null;
    return '<tr>' +
      '<td><strong>' + (a.profiles ? a.profiles.prenom + ' ' + a.profiles.nom : '') + '</strong></td>' +
      '<td style="font-size:12px">' + (a.profiles && a.profiles.classes ? a.profiles.classes.nom : '-') + '</td>' +
      '<td>' + fmt(a.date) + '</td>' +
      '<td><span style="background:' + tc + ';color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">' + a.type + '</span></td>' +
      '<td>' + motifBadge(mc) + '</td>' +
      '<td style="font-size:12px;color:#546E7A;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (a.commentaire || '-') + '</td>' +
      '<td>' +
        '<button class="btn btn-sm ' + (a.justifiee ? 'btn-success' : 'btn-secondary') + '" onclick="toggleJustif(\'' + a.id + '\',' + (!a.justifiee) + ')" title="' + (a.justifiee ? 'Justifiée' : 'Non justifiée') + '">' +
          (a.justifiee ? '✅' : '❌') +
        '</button>' +
      '</td>' +
      '<td>' +
        '<button class="btn btn-secondary btn-sm" onclick="modalModifAbsence(\'' + a.id + '\')" title="Modifier">✏️</button> ' +
        '<button class="btn btn-danger btn-sm" onclick="delAbsence(\'' + a.id + '\')" title="Supprimer">🗑️</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  target.innerHTML =
    '<div class="table-container"><table><thead><tr>' +
    '<th>Élève</th><th>Classe</th><th>Date</th><th>Type</th><th>Motif officiel</th><th>Commentaire</th><th>Justif.</th><th>Actions</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

async function modalAbsenceV2() {
  var re = await db.profiles({role: 'acteur', actif: true});
  document.getElementById('modal-title').textContent = '➕ Saisir une absence / retard';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Élève *</label>' +
      '<select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>' +
      (re.data || []).map(function(e) { return '<option value="' + e.id + '">' + e.prenom + ' ' + e.nom + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-date" type="date" value="' + today() + '"></div>' +
    '<div class="form-group"><label class="form-label">Type</label>' +
      '<select class="form-control" id="f-type">' +
        '<option value="absence">Absence</option>' +
        '<option value="retard">Retard</option>' +
        '<option value="exclusion">Exclusion</option>' +
      '</select>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-hd" type="time"></div>' +
      '<div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-hf" type="time"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Motif officiel</label>' + buildMotifSelect('') + '</div>' +
    '<div class="form-group"><label class="form-label">Commentaire libre</label>' +
      '<textarea class="form-control" id="f-commentaire" rows="2" placeholder="Informations complémentaires…"></textarea>' +
    '</div>' +
    '<div class="form-group" style="display:flex;gap:8px;align-items:center">' +
      '<input type="checkbox" id="f-justif"><label for="f-justif" class="form-label" style="margin:0">Justifiée</label>' +
    '</div>';
  document.getElementById('modal-footer').innerHTML =
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>' +
    '<button class="btn btn-primary" onclick="saveAbsenceV2()">Enregistrer</button>';
  openModal();
}

async function saveAbsenceV2() {
  var eid = g('f-eleve'), d = g('f-date');
  if (!eid || !d) { showToast('Champs obligatoires', 'warning'); return; }
  var mc = g('f-motif-code') || null;
  var r = await supa.from('absences').insert({
    eleve_id: eid, date: d,
    type: g('f-type'),
    heure_debut: g('f-hd') || null,
    heure_fin:   g('f-hf') || null,
    motif: mc,
    motif_code: mc,
    commentaire: document.getElementById('f-commentaire').value || null,
    justifiee: document.getElementById('f-justif').checked,
    saisie_par: currentUser.id
  });
  if (r.error) { showToast(r.error.message, 'danger'); return; }
  closeModal(); showToast('Absence enregistrée !', 'success'); renderAbsV2();
}

async function modalModifAbsence(id) {
  var ra = await supa.from('absences').select('*').eq('id', id).maybeSingle();
  var a = ra.data;
  if (!a) return;
  var mc = a.motif_code || a.motif || '';
  document.getElementById('modal-title').textContent = '✏️ Modifier / Justifier';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Motif officiel</label>' + buildMotifSelect(mc) + '</div>' +
    '<div class="form-group"><label class="form-label">Commentaire</label>' +
      '<textarea class="form-control" id="f-commentaire" rows="3">' + (a.commentaire || '') + '</textarea>' +
    '</div>' +
    '<div class="form-group" style="display:flex;gap:8px;align-items:center">' +
      '<input type="checkbox" id="f-justif"' + (a.justifiee ? ' checked' : '') + '>' +
      '<label for="f-justif" class="form-label" style="margin:0">Justifiée</label>' +
    '</div>';
  document.getElementById('modal-footer').innerHTML =
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>' +
    '<button class="btn btn-primary" onclick="updateAbsenceV2(\'' + id + '\')">Enregistrer</button>';
  openModal();
}

async function updateAbsenceV2(id) {
  var mc = g('f-motif-code') || null;
  var r = await supa.from('absences').update({
    motif: mc, motif_code: mc,
    commentaire: document.getElementById('f-commentaire').value,
    justifiee: document.getElementById('f-justif').checked
  }).eq('id', id);
  if (r.error) { showToast(r.error.message, 'danger'); return; }
  closeModal(); showToast('Mis à jour !', 'success'); renderAbsV2();
}

// =============================================
// MODULE SANCTIONS AVANCÉ — Retenues détaillées
// =============================================

loadSanctions = async function() {
  var el = document.getElementById('page-sanctions');
  el.innerHTML =
    '<div class="breadcrumb">M13 Studio <span>Retenues & Sanctions</span></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">⚠️ Retenues & Sanctions</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-sm" style="background:#E65100;color:white;border:none" onclick="modalSanctionV2(\'Retenue\')">🕐 Retenue</button>' +
          '<button class="btn btn-sm" style="background:#F9A825;color:#263238;border:none" onclick="modalSanctionV2(\'Avertissement\')">⚡ Avertissement</button>' +
          '<button class="btn btn-sm" style="background:#9C27B0;color:white;border:none" onclick="modalSanctionV2(\'Exclusion temporaire\')">🚫 Exclusion</button>' +
          '<button class="btn btn-sm" style="background:#C62828;color:white;border:none" onclick="modalSanctionV2(\'Convocation parents\')">👨‍👩‍👦 Conv. parents</button>' +
        '</div>' +
      '</div>' +
      '<div id="san-t2"></div>' +
    '</div>';
  renderSanctionsV2();
};

async function renderSanctionsV2() {
  var r = await db.sanctions();
  var target = document.getElementById('san-t2');
  if (!target) return;
  var data = r.data || [];
  if (!data.length) {
    target.innerHTML = '<div style="padding:24px;text-align:center;color:#90A4AE">Aucune sanction enregistrée.</div>';
    return;
  }
  var typeColors = {
    'Retenue': '#E65100',
    'Avertissement': '#F9A825',
    'Exclusion temporaire': '#9C27B0',
    'Convocation parents': '#C62828',
    'Travail supplémentaire': '#1565C0'
  };
  var rows = data.map(function(s) {
    var tc = typeColors[s.type] || '#546E7A';
    var textColor = s.type === 'Avertissement' ? '#263238' : 'white';
    return '<tr>' +
      '<td><strong>' + (s.profiles ? s.profiles.prenom + ' ' + s.profiles.nom : '') + '</strong></td>' +
      '<td style="font-size:12px">' + (s.profiles && s.profiles.classes ? s.profiles.classes.nom : '-') + '</td>' +
      '<td><span style="background:' + tc + ';color:' + textColor + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">' + s.type + '</span></td>' +
      '<td style="font-size:12.5px;max-width:240px">' + (s.motif || '-') + '</td>' +
      '<td>' + fmt(s.date) + '</td>' +
      '<td>' + (s.date_execution ? fmt(s.date_execution) + (s.heure_debut_retenue ? '<br><span style="font-size:11px;color:#90A4AE">' + s.heure_debut_retenue.substring(0,5) + (s.heure_fin_retenue ? '→' + s.heure_fin_retenue.substring(0,5) : '') + (s.lieu_retenue ? ' · ' + s.lieu_retenue : '') + '</span>' : '') : '<span style="font-size:11.5px;color:#90A4AE">—</span>') + '</td>' +
      '<td><span class="badge ' + (s.executee ? 'badge-vert' : 'badge-orange') + '">' + (s.executee ? '✅ Fait' : '⏳ À faire') + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm" style="background:' + (s.executee ? '#ECEFF1' : '#E8F5E9') + ';border:none;border-radius:4px;padding:3px 8px" onclick="toggleSanctionV2(\'' + s.id + '\',' + (!s.executee) + ')" title="Basculer statut">' + (s.executee ? '↩' : '✅') + '</button> ' +
        '<button class="btn btn-danger btn-sm" onclick="delSanctionV2(\'' + s.id + '\')" title="Supprimer">🗑️</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  target.innerHTML =
    '<div class="table-container"><table><thead><tr>' +
    '<th>Élève</th><th>Classe</th><th>Type</th><th>Motif / Raison</th><th>Date faute</th><th>Retenue planifiée</th><th>Statut</th><th>Actions</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

async function modalSanctionV2(typeDefaut) {
  var re = await db.profiles({role: 'acteur', actif: true});
  typeDefaut = typeDefaut || 'Retenue';
  var isRetenue = typeDefaut === 'Retenue';
  document.getElementById('modal-title').textContent = '⚠️ ' + typeDefaut;
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Élève *</label>' +
      '<select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>' +
      (re.data || []).map(function(e) { return '<option value="' + e.id + '">' + e.prenom + ' ' + e.nom + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Type *</label>' +
      '<select class="form-control" id="f-type">' +
      ['Retenue','Avertissement','Exclusion temporaire','Convocation parents','Travail supplémentaire']
        .map(function(t) { return '<option' + (t === typeDefaut ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
      '</select>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Motif / Raison *</label>' +
      '<textarea class="form-control" id="f-motif" rows="4" placeholder="Décrivez précisément le comportement ou la raison de cette sanction…"></textarea>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div class="form-group"><label class="form-label">Date de la faute</label><input class="form-control" id="f-date" type="date" value="' + today() + '"></div>' +
      (isRetenue ? '<div class="form-group"><label class="form-label">📅 Date retenue</label><input class="form-control" id="f-date-exec" type="date"></div>' : '<div></div>') +
    '</div>' +
    (isRetenue ?
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' +
        '<div class="form-group"><label class="form-label">Début</label><input class="form-control" id="f-h-debut" type="time" value="17:00"></div>' +
        '<div class="form-group"><label class="form-label">Fin</label><input class="form-control" id="f-h-fin" type="time" value="18:00"></div>' +
        '<div class="form-group"><label class="form-label">Salle</label><input class="form-control" id="f-lieu" placeholder="Salle 204"></div>' +
      '</div>' : '');
  document.getElementById('modal-footer').innerHTML =
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>' +
    '<button class="btn btn-primary" onclick="saveSanctionV2()">Enregistrer</button>';
  openModal();
}

async function saveSanctionV2() {
  var eid = g('f-eleve');
  var motif = document.getElementById('f-motif') ? document.getElementById('f-motif').value.trim() : '';
  if (!eid) { showToast('Sélectionnez un élève', 'warning'); return; }
  if (!motif) { showToast('Le motif est obligatoire', 'warning'); return; }
  var payload = {
    eleve_id: eid, type: g('f-type'), motif: motif,
    date: g('f-date') || today(), prononcee_par: currentUser.id
  };
  var fields = ['f-date-exec','f-h-debut','f-h-fin','f-lieu'];
  var keys   = ['date_execution','heure_debut_retenue','heure_fin_retenue','lieu_retenue'];
  fields.forEach(function(fid, i) {
    var el = document.getElementById(fid);
    if (el && el.value) payload[keys[i]] = el.value;
  });
  var r = await supa.from('sanctions').insert(payload);
  if (r.error) { showToast(r.error.message, 'danger'); return; }
  closeModal(); showToast(payload.type + ' enregistrée !', 'success'); renderSanctionsV2();
}

async function toggleSanctionV2(id, val) {
  await supa.from('sanctions').update({executee: val}).eq('id', id);
  renderSanctionsV2();
}

async function delSanctionV2(id) {
  if (!confirm('Supprimer cette sanction ?')) return;
  await supa.from('sanctions').delete().eq('id', id);
  showToast('Supprimée', 'success'); renderSanctionsV2();
}

// =============================================
// MODULE MES COURS — Vue acteur-prof
// EDT + liste élèves + appel + retenues
// =============================================

async function loadMesCours() {
  var el = document.getElementById('page-mesCours');
  if (!el) return;

  // Chercher les cours où cet acteur est prof
  var r = await supa.from('emploi_du_temps')
    .select('*, matieres(nom, couleur), classes(nom)')
    .eq('professeur_id', currentUser.id)
    .eq('actif', true)
    .order('jour').order('heure_debut');
  
  var cours = r.data || [];

  el.innerHTML =
    '<div class="breadcrumb">M13 Studio <span>Mes cours</span></div>' +
    (cours.length === 0 ?
      '<div class="alert alert-info">Vous n\'êtes assigné à aucun cours pour le moment. Le Modérateur ou Réalisateur peut vous assigner à un créneau dans l\'emploi du temps.</div>' :
      '<div class="dashboard-grid">' +
      cours.map(function(c) {
        return '<div class="card" style="border-left:4px solid ' + c.matieres.couleur + '">' +
          '<div class="card-header">' +
            '<div class="card-title" style="color:' + c.matieres.couleur + '">' + c.matieres.nom + '</div>' +
            '<span class="badge badge-bleu">' + c.classes.nom + '</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<div style="font-size:13px;color:#546E7A;margin-bottom:10px">' +
              '📅 ' + c.jour + ' · ' + c.heure_debut.substring(0,5) + ' → ' + c.heure_fin.substring(0,5) +
              (c.salle ? ' · 🏫 ' + c.salle : '') +
            '</div>' +
            '<button class="btn btn-secondary btn-sm" onclick="voirElevesClasse(\'' + c.classe_id + '\',\'' + c.classes.nom + '\')">👥 Voir élèves</button> ' +
            '<button class="btn btn-primary btn-sm" onclick="faireAppelCours(\'' + c.id + '\',\'' + c.classe_id + '\',\'' + c.matieres.nom + '\')">📋 Appel</button>' +
          '</div>' +
        '</div>';
      }).join('') +
      '</div>'
    );
}

async function voirElevesClasse(classeId, classeNom) {
  var r = await supa.from('profiles').select('*, absences(id, type, date)').eq('classe_id', classeId).eq('role', 'acteur').eq('actif', true).order('nom');
  var eleves = r.data || [];

  document.getElementById('modal-title').textContent = '👥 Élèves — ' + classeNom;
  document.getElementById('modal-body').innerHTML =
    '<div class="table-container"><table><thead><tr><th>Nom</th><th>Prénom</th><th>Absences</th><th>Retards</th></tr></thead><tbody>' +
    eleves.map(function(e) {
      var abs = (e.absences || []).filter(function(a){ return a.type === 'absence'; }).length;
      var ret = (e.absences || []).filter(function(a){ return a.type === 'retard'; }).length;
      return '<tr>' +
        '<td><strong>' + e.nom + '</strong></td>' +
        '<td>' + e.prenom + '</td>' +
        '<td><span class="badge ' + (abs > 3 ? 'badge-rouge' : abs > 0 ? 'badge-orange' : 'badge-vert') + '">' + abs + '</span></td>' +
        '<td><span class="badge ' + (ret > 3 ? 'badge-rouge' : ret > 0 ? 'badge-orange' : 'badge-vert') + '">' + ret + '</span></td>' +
      '</tr>';
    }).join('') +
    '</tbody></table></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-primary" onclick="closeModal()">Fermer</button>';
  openModal();
}

async function faireAppelCours(coursId, classeId, matiereNom) {
  var r = await supa.from('profiles').select('*').eq('classe_id', classeId).eq('role', 'acteur').eq('actif', true).order('nom');
  var eleves = r.data || [];

  document.getElementById('modal-title').textContent = '📋 Appel — ' + matiereNom;
  document.getElementById('modal-body').innerHTML =
    '<div style="font-size:12.5px;color:#546E7A;margin-bottom:12px">Cochez les élèves <strong>absents ou en retard</strong> :</div>' +
    '<div style="max-height:400px;overflow-y:auto">' +
    eleves.map(function(e) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;border:1px solid var(--gris-border);margin-bottom:6px">' +
        '<span style="font-weight:600;flex:1">' + e.prenom + ' ' + e.nom + '</span>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">' +
          '<input type="radio" name="appel-' + e.id + '" value="present" checked> Présent' +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;color:#E65100">' +
          '<input type="radio" name="appel-' + e.id + '" value="retard"> Retard' +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;color:#C62828">' +
          '<input type="radio" name="appel-' + e.id + '" value="absent"> Absent' +
        '</label>' +
      '</div>';
    }).join('') +
    '</div>';
  document.getElementById('modal-footer').innerHTML =
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>' +
    '<button class="btn btn-primary" onclick="validerAppel(' + JSON.stringify(eleves.map(function(e){return {id:e.id,nom:e.nom,prenom:e.prenom};})) + ')">✅ Valider l\'appel</button>';
  openModal();
}

async function validerAppel(eleves) {
  var absents = [];
  var today_val = today();
  eleves.forEach(function(e) {
    var radios = document.getElementsByName('appel-' + e.id);
    var val = 'present';
    radios.forEach(function(r){ if(r.checked) val = r.value; });
    if (val !== 'present') absents.push({id: e.id, type: val, nom: e.nom, prenom: e.prenom});
  });

  if (!absents.length) {
    closeModal(); showToast('Appel validé — tous présents ✅', 'success'); return;
  }

  var inserts = absents.map(function(a) {
    return {eleve_id: a.id, date: today_val, type: a.type === 'absent' ? 'absence' : 'retard', saisie_par: currentUser.id};
  });

  var r = await supa.from('absences').insert(inserts);
  if (r.error) { showToast(r.error.message, 'danger'); return; }
  closeModal();
  showToast(absents.length + ' absence(s)/retard(s) enregistré(s) !', 'success');
}

async function loadAppel() {
  var el = document.getElementById('page-appel');
  if (!el) return;
  // Redirige vers la liste des cours pour choisir
  el.innerHTML =
    '<div class="breadcrumb">M13 Studio <span>Appel & Absences</span></div>' +
    '<div class="alert alert-info">Allez dans <strong>Mes cours → Classes & Élèves</strong> et cliquez sur "📋 Appel" pour faire l\'appel d\'un cours.</div>';
  loadMesCours();
  navigate('mesCours');
}

async function loadMesRetenues() {
  var el = document.getElementById('page-mesRetenues');
  if (!el) return;
  el.innerHTML =
    '<div class="breadcrumb">M13 Studio <span>Mes retenues</span></div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">⚠️ Retenues saisies par moi</div>' +
        '<button class="btn btn-primary btn-sm" onclick="modalSanctionV2(\'Retenue\')">🕐 Nouvelle retenue</button>' +
      '</div>' +
      '<div id="mes-retenues-t"></div>' +
    '</div>';

  var r = await supa.from('sanctions')
    .select('*, profiles!sanctions_eleve_id_fkey(nom, prenom, classes(nom))')
    .eq('prononcee_par', currentUser.id)
    .order('date', {ascending: false});

  var data = r.data || [];
  if (!data.length) {
    document.getElementById('mes-retenues-t').innerHTML = '<div style="padding:20px;text-align:center;color:#90A4AE">Vous n\'avez saisi aucune retenue.</div>';
    return;
  }

  var typeColors = {'Retenue':'#E65100','Avertissement':'#F9A825','Exclusion temporaire':'#9C27B0','Convocation parents':'#C62828','Travail supplémentaire':'#1565C0'};
  var rows = data.map(function(s) {
    var tc = typeColors[s.type] || '#546E7A';
    return '<tr>' +
      '<td><strong>' + (s.profiles ? s.profiles.prenom + ' ' + s.profiles.nom : '') + '</strong></td>' +
      '<td style="font-size:12px">' + (s.profiles && s.profiles.classes ? s.profiles.classes.nom : '-') + '</td>' +
      '<td><span style="background:' + tc + ';color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">' + s.type + '</span></td>' +
      '<td style="font-size:12.5px">' + (s.motif || '-') + '</td>' +
      '<td>' + fmt(s.date) + '</td>' +
      '<td>' + (s.date_execution ? fmt(s.date_execution) : '<span class="badge badge-orange">À planifier</span>') + '</td>' +
      '<td><span class="badge ' + (s.executee ? 'badge-vert' : 'badge-orange') + '">' + (s.executee ? '✅ Fait' : '⏳ À faire') + '</span></td>' +
    '</tr>';
  }).join('');

  document.getElementById('mes-retenues-t').innerHTML =
    '<div class="table-container"><table><thead><tr>' +
    '<th>Élève</th><th>Classe</th><th>Type</th><th>Motif</th><th>Date</th><th>Retenue le</th><th>Statut</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

// ── Hook navigate pour les nouvelles pages ──
var _nav2 = navigate;
navigate = function(page) {
  var newPages = {
    mesCours: loadMesCours,
    appel: loadAppel,
    mesRetenues: loadMesRetenues
  };
  if (newPages[page]) {
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.sidebar-item').forEach(function(i){i.classList.remove('active');});
    var p = document.getElementById('page-' + page);
    if (!p) {
      p = document.createElement('div');
      p.className = 'page'; p.id = 'page-' + page;
      var main = document.querySelector('.main-content');
      if (main) main.appendChild(p);
    }
    p.classList.add('active');
    var n = document.querySelector('.sidebar-item[data-page="' + page + '"]');
    if (n) n.classList.add('active');
    newPages[page]();
  } else {
    _nav2(page);
  }
};

// ── SQL supplémentaire à exécuter ──
// ALTER TABLE public.sanctions
//   ADD COLUMN IF NOT EXISTS date_execution DATE,
//   ADD COLUMN IF NOT EXISTS heure_debut_retenue TIME,
//   ADD COLUMN IF NOT EXISTS heure_fin_retenue TIME,
//   ADD COLUMN IF NOT EXISTS lieu_retenue VARCHAR(100);
// ALTER TABLE public.absences
//   ADD COLUMN IF NOT EXISTS motif_code VARCHAR(100),
//   ADD COLUMN IF NOT EXISTS commentaire TEXT;

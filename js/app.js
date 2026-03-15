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
    return supa.from('profiles').select('*').eq('identifiant',ident).single();
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
  if(currentRole==='realisateur'||currentRole==='moderateur'){
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Accueil</div>';
    h+='<a class="sidebar-item" data-page="dashboard" onclick="navigate(\'dashboard\')"><span class="icon">📊</span> Tableau de bord</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Vie Scolaire</div>';
    h+='<a class="sidebar-item" data-page="absences" onclick="navigate(\'absences\')"><span class="icon">📋</span> Absences / Retards</a>';
    h+='<a class="sidebar-item" data-page="sanctions" onclick="navigate(\'sanctions\')"><span class="icon">⚠️</span> Sanctions</a>';
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
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Accueil</div>';
    h+='<a class="sidebar-item" data-page="mondashboard" onclick="navigate(\'mondashboard\')"><span class="icon">🏠</span> Mon espace</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Ma scolarité</div>';
    h+='<a class="sidebar-item" data-page="monnotes" onclick="navigate(\'monnotes\')"><span class="icon">📝</span> Mes notes</a>';
    h+='<a class="sidebar-item" data-page="monAbsences" onclick="navigate(\'monAbsences\')"><span class="icon">📋</span> Mes absences</a>';
    h+='<a class="sidebar-item" data-page="edt" onclick="navigate(\'edt\')"><span class="icon">📅</span> Emploi du temps</a>';
    h+='<a class="sidebar-item" data-page="cahier" onclick="navigate(\'cahier\')"><span class="icon">📖</span> Cahier de textes</a></div>';
    h+='<div class="sidebar-section"><div class="sidebar-section-title">Communication</div>';
    h+='<a class="sidebar-item" data-page="messages" onclick="navigate(\'messages\')"><span class="icon">✉️</span> Messagerie</a></div>';
    if(currentUser&&currentUser.dirige_cours){
      h+='<div class="sidebar-section"><div class="sidebar-section-title">Mes cours</div>';
      h+='<a class="sidebar-item" data-page="notes" onclick="navigate(\'notes\')"><span class="icon">📝</span> Saisir notes</a>';
      h+='<a class="sidebar-item" data-page="absences" onclick="navigate(\'absences\')"><span class="icon">📋</span> Faire l\'appel</a></div>';
    }
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
  var u=null; if(id){var ru=await supa.from('profiles').select('*').eq('id',id).single();u=ru.data;}
  document.getElementById('modal-title').textContent=id?'Modifier acteur':'Ajouter un acteur';
  document.getElementById('modal-body').innerHTML=
    mf('Nom *','f-nom',u?u.nom:'')+mf('Prénom *','f-prenom',u?u.prenom:'')+
    mf('Identifiant *','f-ident',u?u.identifiant:'')+
    '<div class="form-group"><label class="form-label">Mot de passe '+(id?'(vide=inchangé)':'*')+'</label><input class="form-control" id="f-pwd" type="password"></div>'+
    '<div class="form-group"><label class="form-label">Classe</label><select class="form-control" id="f-classe"><option value="">-- Aucune --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'"'+(u&&u.classe_id===c.id?' selected':'')+'>'+c.nom+'</option>';}).join('')+'</select></div>'+
    mf('Email','f-email',u?u.email||'':'','email@exemple.com')+
    '<div class="form-group" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="f-dirige"'+(u&&u.dirige_cours?' checked':'')+'><label for="f-dirige" class="form-label" style="margin:0">Dirige des cours</label></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveEleve(\''+(id||'')+'\')">Enregistrer</button>';
  openModal();
}
async function saveEleve(id) {
  var nom=g('f-nom'),prenom=g('f-prenom'),ident=g('f-ident'),pwd=g('f-pwd');
  if(!nom||!prenom||!ident){showToast('Champs obligatoires manquants','warning');return;}
  var d={nom:nom,prenom:prenom,identifiant:ident,classe_id:g('f-classe')||null,email:g('f-email'),role:'acteur',dirige_cours:document.getElementById('f-dirige').checked};
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
  var peutEcrire=currentRole!=='acteur'||(currentUser&&currentUser.dirige_cours);
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
  var r=await supa.from('messages').select('*,profiles!messages_expediteur_id_fkey(nom,prenom)').eq('id',id).single();
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
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Sanctions</span></div><div class="card"><div class="card-header"><div class="card-title">⚠️ Sanctions & Punitions</div><button class="btn btn-primary btn-sm" onclick="modalSanction()">+ Ajouter</button></div><div id="san-t"></div></div>';
  renderSanctions();
}
async function renderSanctions() {
  var r=await db.sanctions();
  var rows=(r.data||[]).map(function(s){return '<tr><td>'+(s.profiles?s.profiles.prenom+' '+s.profiles.nom:'')+'</td><td>'+(s.profiles&&s.profiles.classes?s.profiles.classes.nom:'-')+'</td><td><span class="badge badge-orange">'+s.type+'</span></td><td>'+(s.motif||'-')+'</td><td>'+fmt(s.date)+'</td><td>'+(s.executee?'✅':'❌')+'</td></tr>';}).join('');
  document.getElementById('san-t').innerHTML='<div class="table-container"><table><thead><tr><th>Élève</th><th>Classe</th><th>Type</th><th>Motif</th><th>Date</th><th>Exécutée</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
async function modalSanction() {
  var re=await db.profiles({role:'acteur',actif:true});
  document.getElementById('modal-title').textContent='Ajouter une sanction';
  document.getElementById('modal-body').innerHTML=
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Type *</label><select class="form-control" id="f-type"><option>Avertissement</option><option>Retenue</option><option>Exclusion temporaire</option><option>Convocation parents</option><option>Travail supplémentaire</option></select></div>'+
    '<div class="form-group"><label class="form-label">Motif</label><textarea class="form-control" id="f-motif" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>';
  document.getElementById('modal-footer').innerHTML='<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveSanction()">Enregistrer</button>';
  openModal();
}
async function saveSanction() {
  var eid=g('f-eleve');if(!eid){showToast('Élève requis','warning');return;}
  var r=await supa.from('sanctions').insert({eleve_id:eid,type:g('f-type'),motif:g('f-motif'),date:g('f-date'),prononcee_par:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Sanction enregistrée !','success');renderSanctions();
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
  var res=await Promise.all([supa.from('profiles').select('*,classes(nom)').eq('id',eid).single(),db.notes({eleve_id:eid,periode:per}),db.absences({eleve_id:eid})]);
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

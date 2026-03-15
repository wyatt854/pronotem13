// =============================================
// M13 STUDIO — app.js COMPLET v3
// Un seul fichier. Aucune dépendance externe.
// =============================================

// ── 1. CONFIG SUPABASE ──────────────────────
const SUPABASE_URL = 'https://nlgzunlagcdgsbkzeiin.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZ3p1bmxhZ2NkZ3Nia3plaWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDQyNzksImV4cCI6MjA4MzE4MDI3OX0.4sSfmztjJJkfHaIOBOK6Pv-27QWSpM2B-lxg0b3XC7U';
let supabase = null;

// ── 2. SESSION ──────────────────────────────
let currentUser = null;
let currentRole = null;

function loadSession() {
  try {
    const s = localStorage.getItem('m13_session');
    if (!s) return false;
    const parsed = JSON.parse(s);
    currentUser = parsed.user;
    currentRole = parsed.role;
    return true;
  } catch (e) {
    localStorage.removeItem('m13_session');
    return false;
  }
}

function saveSession(user) {
  currentUser = user;
  currentRole = user.role;
  localStorage.setItem('m13_session', JSON.stringify({ user: user, role: user.role }));
}

function clearSession() {
  currentUser = null;
  currentRole = null;
  localStorage.removeItem('m13_session');
}

// ── 3. UTILITAIRES ──────────────────────────
function showToast(msg, type) {
  type = type || 'info';
  document.querySelectorAll('.m13toast').forEach(function(t) { t.remove(); });
  var colors = { success: '#2E7D32', danger: '#C62828', warning: '#E65100', info: '#1565C0' };
  var t = document.createElement('div');
  t.className = 'm13toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:8px;color:white;font-family:Open Sans,sans-serif;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.25);background:' + (colors[type] || colors.info) + ';max-width:320px;';
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function() { t.remove(); }, 300); }, 3200);
}

function showLoginError(msg) {
  var el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearLoginError() {
  var el = document.getElementById('login-error');
  if (el) el.classList.add('hidden');
}

function resetLoginBtn() {
  var btn = document.getElementById('btn-login');
  if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getInitials(nom, prenom) {
  return ((prenom ? prenom[0] : '') + (nom ? nom[0] : '')).toUpperCase();
}

function noteColor(val, sur) {
  sur = sur || 20;
  var p = val / sur;
  if (p >= 0.7) return 'note-good';
  if (p >= 0.5) return 'note-medium';
  return 'note-bad';
}

function labelRole(role) {
  var map = { acteur: 'Acteur', moderateur: 'Modérateur', realisateur: 'Réalisateur' };
  return map[role] || role;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── 4. BASE DE DONNÉES ──────────────────────
var db = {
  getProfiles: function(filters) {
    filters = filters || {};
    var q = supabase.from('profiles').select('*, classes(nom)');
    if (filters.role) q = q.eq('role', filters.role);
    if (filters.actif !== undefined) q = q.eq('actif', filters.actif);
    return q.order('nom');
  },
  getProfileByIdentifiant: function(identifiant) {
    return supabase.from('profiles').select('*').eq('identifiant', identifiant).single();
  },
  createProfile: function(data) {
    return supabase.from('profiles').insert(data).select().single();
  },
  updateProfile: function(id, data) {
    return supabase.from('profiles').update(data).eq('id', id);
  },
  deleteProfile: function(id) {
    return supabase.from('profiles').update({ actif: false }).eq('id', id);
  },
  getClasses: function() {
    return supabase.from('classes').select('*').eq('actif', true).order('nom');
  },
  createClasse: function(data) {
    return supabase.from('classes').insert(data).select().single();
  },
  getMatieres: function() {
    return supabase.from('matieres').select('*').eq('actif', true).order('nom');
  },
  getEDT: function(classeId) {
    return supabase.from('emploi_du_temps')
      .select('*, matieres(nom, couleur), profiles(nom, prenom)')
      .eq('classe_id', classeId).eq('actif', true)
      .order('jour').order('heure_debut');
  },
  createCreneauEDT: function(data) {
    return supabase.from('emploi_du_temps').insert(data).select().single();
  },
  getAbsences: function(filters) {
    filters = filters || {};
    var q = supabase.from('absences')
      .select('*, profiles!absences_eleve_id_fkey(nom, prenom, classes(nom))');
    if (filters.eleve_id) q = q.eq('eleve_id', filters.eleve_id);
    if (filters.date) q = q.eq('date', filters.date);
    return q.order('date', { ascending: false });
  },
  createAbsence: function(data) {
    data.saisie_par = currentUser ? currentUser.id : null;
    return supabase.from('absences').insert(data).select().single();
  },
  updateAbsence: function(id, data) {
    return supabase.from('absences').update(data).eq('id', id);
  },
  getNotes: function(filters) {
    filters = filters || {};
    var q = supabase.from('notes')
      .select('*, profiles!notes_eleve_id_fkey(nom, prenom), matieres(nom, couleur)');
    if (filters.eleve_id) q = q.eq('eleve_id', filters.eleve_id);
    if (filters.matiere_id) q = q.eq('matiere_id', filters.matiere_id);
    if (filters.periode) q = q.eq('periode', filters.periode);
    return q.order('date', { ascending: false });
  },
  createNote: function(data) {
    data.professeur_id = currentUser ? currentUser.id : null;
    return supabase.from('notes').insert(data).select().single();
  },
  deleteNote: function(id) {
    return supabase.from('notes').delete().eq('id', id);
  },
  getCahier: function(filters) {
    filters = filters || {};
    var q = supabase.from('cahier_textes')
      .select('*, matieres(nom, couleur), classes(nom), profiles(nom, prenom)');
    if (filters.classe_id) q = q.eq('classe_id', filters.classe_id);
    return q.order('date', { ascending: false });
  },
  createEntreeCahier: function(data) {
    data.professeur_id = currentUser ? currentUser.id : null;
    return supabase.from('cahier_textes').insert(data).select().single();
  },
  getMessages: function(userId) {
    return supabase.from('messages')
      .select('*, profiles!messages_expediteur_id_fkey(nom, prenom)')
      .eq('destinataire_id', userId).is('parent_id', null)
      .order('date_envoi', { ascending: false });
  },
  sendMessage: function(data) {
    data.expediteur_id = currentUser ? currentUser.id : null;
    return supabase.from('messages').insert(data).select().single();
  },
  markMessageRead: function(id) {
    return supabase.from('messages').update({ lu: true }).eq('id', id);
  },
  getSanctions: function(filters) {
    filters = filters || {};
    var q = supabase.from('sanctions')
      .select('*, profiles!sanctions_eleve_id_fkey(nom, prenom, classes(nom))');
    if (filters.eleve_id) q = q.eq('eleve_id', filters.eleve_id);
    return q.order('date', { ascending: false });
  },
  createSanction: function(data) {
    data.prononcee_par = currentUser ? currentUser.id : null;
    return supabase.from('sanctions').insert(data).select().single();
  }
};

// ── 5. CONNEXION ────────────────────────────
async function login() {
  var ident = document.getElementById('login-ident').value.trim();
  var pwd   = document.getElementById('login-pwd').value;
  var role  = document.getElementById('selected-role').value;

  if (!role) {
    showLoginError('Sélectionnez votre rôle : Acteur, Modérateur ou Réalisateur.');
    return;
  }
  if (!ident) {
    showLoginError('Saisissez votre identifiant.');
    document.getElementById('login-ident').focus();
    return;
  }
  if (!pwd) {
    showLoginError('Saisissez votre mot de passe.');
    document.getElementById('login-pwd').focus();
    return;
  }

  var btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = '⏳ Connexion…';
  clearLoginError();

  try {
    var res = await db.getProfileByIdentifiant(ident);

    if (res.error || !res.data) {
      showLoginError('Identifiant introuvable. Contactez le Réalisateur.');
      showToast('Identifiant introuvable', 'danger');
      resetLoginBtn();
      return;
    }

    var user = res.data;

    if (user.mot_de_passe_hash !== pwd) {
      showLoginError('Mot de passe incorrect.');
      showToast('Mot de passe incorrect', 'danger');
      document.getElementById('login-pwd').value = '';
      document.getElementById('login-pwd').focus();
      resetLoginBtn();
      return;
    }

    if (!user.actif) {
      showLoginError('Compte désactivé. Contactez le Réalisateur.');
      showToast('Compte désactivé', 'danger');
      resetLoginBtn();
      return;
    }

    if (user.role !== role) {
      showLoginError('Ce compte est "' + labelRole(user.role) + '", pas "' + labelRole(role) + '". Choisissez le bon rôle.');
      showToast('Rôle incorrect', 'danger');
      resetLoginBtn();
      return;
    }

    supabase.from('profiles').update({ derniere_connexion: new Date().toISOString() }).eq('id', user.id).then(function(){});

    saveSession(user);
    showToast('Bienvenue, ' + user.prenom + ' ' + user.nom + ' !', 'success');
    initApp();

  } catch (err) {
    showLoginError('Erreur de connexion au serveur.');
    showToast('Erreur serveur', 'danger');
    console.error('[M13] login error:', err);
    resetLoginBtn();
  }
}

function logout() {
  clearSession();
  document.getElementById('login-ident').value = '';
  document.getElementById('login-pwd').value = '';
  document.getElementById('selected-role').value = '';
  document.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('selected'); });
  clearLoginError();
  resetLoginBtn();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  showToast('Vous avez été déconnecté.', 'info');
}

// ── 6. INIT APP ─────────────────────────────
function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser.prenom + ' ' + currentUser.nom;
  document.getElementById('user-initials').textContent = getInitials(currentUser.nom, currentUser.prenom);
  var roleLabel = currentRole === 'realisateur' ? '🎬 Réalisateur' : currentRole === 'moderateur' ? '🎭 Modérateur' : '🎓 Acteur';
  document.getElementById('user-role-badge').textContent = roleLabel;
  buildSidebar();
  refreshNotifMessages();
  navigate(currentRole === 'acteur' ? 'mondashboard' : 'dashboard');
}

async function refreshNotifMessages() {
  if (!currentUser) return;
  try {
    var res = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('destinataire_id', currentUser.id).eq('lu', false);
    var badge = document.getElementById('notif-msg');
    if (!badge) return;
    if (res.count > 0) { badge.textContent = res.count; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  } catch(e) {}
}

// ── 7. NAVIGATION ───────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.sidebar-item').forEach(function(i) { i.classList.remove('active'); });
  var p = document.getElementById('page-' + page);
  if (p) p.classList.add('active');
  var nav = document.querySelector('.sidebar-item[data-page="' + page + '"]');
  if (nav) nav.classList.add('active');
  var loaders = {
    dashboard: loadDashboard, eleves: loadEleves, profs: loadProfs,
    classes: loadClasses, edt: loadEDT, absences: loadAbsences,
    notes: loadNotes, cahier: loadCahier, messages: loadMessages,
    sanctions: loadSanctions, bulletins: loadBulletins,
    comptes: loadComptes, matieres: loadMatieres,
    monnotes: loadMesNotes, monAbsences: loadMesAbsences, mondashboard: loadMonDashboard
  };
  if (loaders[page]) loaders[page]();
}

// ── 8. SIDEBAR ──────────────────────────────
function buildSidebar() {
  var html = '';
  if (currentRole === 'realisateur' || currentRole === 'moderateur') {
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Accueil</div>';
    html += '<a class="sidebar-item" data-page="dashboard" onclick="navigate(\'dashboard\')"><span class="icon">📊</span> Tableau de bord</a></div>';
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Vie Scolaire</div>';
    html += '<a class="sidebar-item" data-page="absences" onclick="navigate(\'absences\')"><span class="icon">📋</span> Absences / Retards</a>';
    html += '<a class="sidebar-item" data-page="sanctions" onclick="navigate(\'sanctions\')"><span class="icon">⚠️</span> Sanctions</a>';
    html += '<a class="sidebar-item" data-page="bulletins" onclick="navigate(\'bulletins\')"><span class="icon">📄</span> Bulletins</a></div>';
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Scolarité</div>';
    html += '<a class="sidebar-item" data-page="edt" onclick="navigate(\'edt\')"><span class="icon">📅</span> Emploi du temps</a>';
    html += '<a class="sidebar-item" data-page="notes" onclick="navigate(\'notes\')"><span class="icon">📝</span> Notes</a>';
    html += '<a class="sidebar-item" data-page="cahier" onclick="navigate(\'cahier\')"><span class="icon">📖</span> Cahier de textes</a></div>';
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Annuaire</div>';
    html += '<a class="sidebar-item" data-page="eleves" onclick="navigate(\'eleves\')"><span class="icon">🎓</span> Acteurs</a>';
    html += '<a class="sidebar-item" data-page="profs" onclick="navigate(\'profs\')"><span class="icon">🎭</span> Modérateurs</a>';
    html += '<a class="sidebar-item" data-page="classes" onclick="navigate(\'classes\')"><span class="icon">🏫</span> Classes</a></div>';
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Communication</div>';
    html += '<a class="sidebar-item" data-page="messages" onclick="navigate(\'messages\')"><span class="icon">✉️</span> Messagerie</a></div>';
    if (currentRole === 'realisateur') {
      html += '<div class="sidebar-section"><div class="sidebar-section-title">Administration</div>';
      html += '<a class="sidebar-item" data-page="comptes" onclick="navigate(\'comptes\')"><span class="icon">👥</span> Gestion comptes</a>';
      html += '<a class="sidebar-item" data-page="matieres" onclick="navigate(\'matieres\')"><span class="icon">📚</span> Matières</a></div>';
    }
  } else {
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Accueil</div>';
    html += '<a class="sidebar-item" data-page="mondashboard" onclick="navigate(\'mondashboard\')"><span class="icon">🏠</span> Mon espace</a></div>';
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Ma scolarité</div>';
    html += '<a class="sidebar-item" data-page="monnotes" onclick="navigate(\'monnotes\')"><span class="icon">📝</span> Mes notes</a>';
    html += '<a class="sidebar-item" data-page="monAbsences" onclick="navigate(\'monAbsences\')"><span class="icon">📋</span> Mes absences</a>';
    html += '<a class="sidebar-item" data-page="edt" onclick="navigate(\'edt\')"><span class="icon">📅</span> Emploi du temps</a>';
    html += '<a class="sidebar-item" data-page="cahier" onclick="navigate(\'cahier\')"><span class="icon">📖</span> Cahier de textes</a></div>';
    html += '<div class="sidebar-section"><div class="sidebar-section-title">Communication</div>';
    html += '<a class="sidebar-item" data-page="messages" onclick="navigate(\'messages\')"><span class="icon">✉️</span> Messagerie</a></div>';
    if (currentUser && currentUser.dirige_cours) {
      html += '<div class="sidebar-section"><div class="sidebar-section-title">Mes cours</div>';
      html += '<a class="sidebar-item" data-page="notes" onclick="navigate(\'notes\')"><span class="icon">📝</span> Saisir notes</a>';
      html += '<a class="sidebar-item" data-page="absences" onclick="navigate(\'absences\')"><span class="icon">📋</span> Faire l\'appel</a></div>';
    }
  }
  document.getElementById('sidebar-nav').innerHTML = html;
}

// ── 9. MODALE ───────────────────────────────
function openModal()  { document.getElementById('generic-modal').classList.add('open'); }
function closeModal() { document.getElementById('generic-modal').classList.remove('open'); }

// ── 10. DASHBOARD ───────────────────────────
async function loadDashboard() {
  var el = document.getElementById('page-dashboard');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Tableau de bord</span></div><div id="stats-grid" class="dashboard-grid"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px"><div id="card-abs"></div><div id="card-notes"></div></div>';

  var t = today();
  var results = await Promise.all([
    supabase.from('profiles').select('id').eq('role','acteur').eq('actif',true),
    supabase.from('profiles').select('id').eq('role','moderateur').eq('actif',true),
    supabase.from('classes').select('id').eq('actif',true),
    supabase.from('absences').select('id').eq('date',t)
  ]);

  document.getElementById('stats-grid').innerHTML =
    '<div class="stat-card"><div class="stat-icon" style="background:#E3F2FD">🎓</div><div class="stat-info"><div class="stat-value">'+(results[0].data||[]).length+'</div><div class="stat-label">Acteurs</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon" style="background:#E8F5E9">🎭</div><div class="stat-info"><div class="stat-value">'+(results[1].data||[]).length+'</div><div class="stat-label">Modérateurs</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon" style="background:#FFF3E0">🏫</div><div class="stat-info"><div class="stat-value">'+(results[2].data||[]).length+'</div><div class="stat-label">Classes</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon" style="background:#FFEBEE">📋</div><div class="stat-info"><div class="stat-value">'+(results[3].data||[]).length+'</div><div class="stat-label">Absences aujourd\'hui</div></div></div>';

  var ra = await db.getAbsences();
  document.getElementById('card-abs').innerHTML = '<div class="card"><div class="card-header"><div class="card-title">📋 Dernières absences</div></div><div class="table-container"><table><thead><tr><th>Élève</th><th>Date</th><th>Type</th><th>Justif.</th></tr></thead><tbody>' +
    (ra.data||[]).slice(0,8).map(function(a){ return '<tr><td>'+(a.profiles?a.profiles.prenom+' '+a.profiles.nom:'')+'</td><td>'+formatDate(a.date)+'</td><td><span class="badge '+(a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet')+'">'+a.type+'</span></td><td>'+(a.justifiee?'✅':'❌')+'</td></tr>'; }).join('') +
    '</tbody></table></div></div>';

  var rn = await db.getNotes();
  document.getElementById('card-notes').innerHTML = '<div class="card"><div class="card-header"><div class="card-title">📝 Dernières notes</div></div><div class="table-container"><table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th><th>Date</th></tr></thead><tbody>' +
    (rn.data||[]).slice(0,8).map(function(n){ return '<tr><td>'+(n.profiles?n.profiles.prenom+' '+n.profiles.nom:'')+'</td><td>'+(n.matieres?n.matieres.nom:'-')+'</td><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+formatDate(n.date)+'</td></tr>'; }).join('') +
    '</tbody></table></div></div>';
}

// ── 11. ÉLÈVES ──────────────────────────────
async function loadEleves() {
  var el = document.getElementById('page-eleves');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Acteurs</span></div><div class="card"><div class="card-header"><div class="card-title">🎓 Liste des Acteurs</div><div style="display:flex;gap:8px"><input class="form-control" id="search-eleves" placeholder="Rechercher…" style="width:200px" oninput="filterEleves()">'+(currentRole==='realisateur'?'<button class="btn btn-primary btn-sm" onclick="openModalAddEleve()">+ Ajouter</button>':'')+'</div></div><div class="table-container" id="table-eleves"></div></div>';
  await renderEleves('');
}

async function renderEleves(search) {
  var res = await db.getProfiles({ role: 'acteur' });
  var data = (res.data||[]).filter(function(e){ return !search || (e.prenom+' '+e.nom+' '+e.identifiant).toLowerCase().includes(search.toLowerCase()); });
  var rows = data.map(function(e){
    return '<tr><td><strong>'+e.nom+'</strong></td><td>'+e.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+e.identifiant+'</code></td><td>'+(e.classes?e.classes.nom:'-')+'</td><td><span class="badge '+(e.actif?'badge-vert':'badge-rouge')+'">'+(e.actif?'Actif':'Inactif')+'</span></td>'+(currentRole==='realisateur'?'<td><button class="btn btn-secondary btn-sm" onclick="openModalAddEleve(\''+e.id+'\')">✏️</button> <button class="btn btn-danger btn-sm" onclick="desactiverUser(\''+e.id+'\')">🗑️</button></td>':'')+'</tr>';
  }).join('');
  document.getElementById('table-eleves').innerHTML = '<table><thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe</th><th>Statut</th>'+(currentRole==='realisateur'?'<th>Actions</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table>';
}

function filterEleves() { renderEleves(document.getElementById('search-eleves').value); }

async function openModalAddEleve(id) {
  id = id || null;
  var rc = await db.getClasses();
  var user = null;
  if (id) { var ru = await supabase.from('profiles').select('*').eq('id',id).single(); user = ru.data; }
  document.getElementById('modal-title').textContent = id ? 'Modifier acteur' : 'Ajouter un acteur';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom" value="'+(user?user.nom:'')+'" placeholder="Nom"></div>'+
    '<div class="form-group"><label class="form-label">Prénom *</label><input class="form-control" id="f-prenom" value="'+(user?user.prenom:'')+'" placeholder="Prénom"></div>'+
    '<div class="form-group"><label class="form-label">Identifiant *</label><input class="form-control" id="f-ident" value="'+(user?user.identifiant:'')+'" placeholder="identifiant.unique"></div>'+
    '<div class="form-group"><label class="form-label">Mot de passe '+(id?'(vide = inchangé)':'*')+'</label><input class="form-control" id="f-pwd" type="password"></div>'+
    '<div class="form-group"><label class="form-label">Classe</label><select class="form-control" id="f-classe"><option value="">-- Aucune --</option>'+
    (rc.data||[]).map(function(c){ return '<option value="'+c.id+'"'+(user&&user.classe_id===c.id?' selected':'')+'>'+c.nom+'</option>'; }).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Email</label><input class="form-control" id="f-email" value="'+(user?user.email||'':'')+'" placeholder="email@exemple.com"></div>'+
    '<div class="form-group" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="f-dirige"'+(user&&user.dirige_cours?' checked':'')+'>'+
    '<label for="f-dirige" class="form-label" style="margin:0">Dirige des cours</label></div>';
  document.getElementById('modal-footer').innerHTML =
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>'+
    '<button class="btn btn-primary" onclick="saveEleve(\''+(id||'')+'\')">Enregistrer</button>';
  openModal();
}

async function saveEleve(id) {
  var nom = document.getElementById('f-nom').value.trim();
  var prenom = document.getElementById('f-prenom').value.trim();
  var ident = document.getElementById('f-ident').value.trim();
  var pwd = document.getElementById('f-pwd').value;
  if (!nom||!prenom||!ident) { showToast('Champs obligatoires manquants','warning'); return; }
  var data = { nom:nom, prenom:prenom, identifiant:ident, classe_id:document.getElementById('f-classe').value||null, email:document.getElementById('f-email').value.trim(), role:'acteur', dirige_cours:document.getElementById('f-dirige').checked };
  if (pwd) data.mot_de_passe_hash = pwd;
  if (id) {
    var r = await supabase.from('profiles').update(data).eq('id',id);
    if (r.error) { showToast('Erreur : '+r.error.message,'danger'); return; }
  } else {
    if (!pwd) { showToast('Mot de passe requis','warning'); return; }
    data.actif = true;
    var r2 = await supabase.from('profiles').insert(data);
    if (r2.error) { showToast('Erreur : '+r2.error.message,'danger'); return; }
  }
  closeModal(); showToast('Acteur enregistré !','success'); loadEleves();
}

async function desactiverUser(id) {
  if (!confirm('Désactiver ce compte ?')) return;
  await supabase.from('profiles').update({actif:false}).eq('id',id);
  showToast('Compte désactivé','success');
  if (document.getElementById('page-eleves').classList.contains('active')) loadEleves();
  else if (document.getElementById('page-comptes').classList.contains('active')) loadComptes();
}

// ── 12. MODÉRATEURS ─────────────────────────
async function loadProfs() {
  var el = document.getElementById('page-profs');
  var res = await db.getProfiles({ role:'moderateur' });
  var rows = (res.data||[]).map(function(p){
    return '<tr><td><strong>'+p.nom+'</strong></td><td>'+p.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+p.identifiant+'</code></td><td><span class="badge '+(p.actif?'badge-vert':'badge-rouge')+'">'+(p.actif?'Actif':'Inactif')+'</span></td>'+(currentRole==='realisateur'?'<td><button class="btn btn-danger btn-sm" onclick="desactiverUser(\''+p.id+'\')">🗑️</button></td>':'')+'</tr>';
  }).join('');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Modérateurs</span></div><div class="card"><div class="card-header"><div class="card-title">🎭 Modérateurs</div>'+(currentRole==='realisateur'?'<button class="btn btn-primary btn-sm" onclick="openModalAddProf()">+ Ajouter</button>':'')+'</div><div class="table-container"><table><thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Statut</th>'+(currentRole==='realisateur'?'<th>Actions</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

async function openModalAddProf() {
  document.getElementById('modal-title').textContent = 'Ajouter un modérateur';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom"></div>'+
    '<div class="form-group"><label class="form-label">Prénom *</label><input class="form-control" id="f-prenom"></div>'+
    '<div class="form-group"><label class="form-label">Identifiant *</label><input class="form-control" id="f-ident"></div>'+
    '<div class="form-group"><label class="form-label">Mot de passe *</label><input class="form-control" id="f-pwd" type="password"></div>'+
    '<div class="form-group"><label class="form-label">Email</label><input class="form-control" id="f-email"></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveProf()">Créer</button>';
  openModal();
}

async function saveProf() {
  var nom=document.getElementById('f-nom').value.trim(), prenom=document.getElementById('f-prenom').value.trim(), ident=document.getElementById('f-ident').value.trim(), pwd=document.getElementById('f-pwd').value;
  if (!nom||!prenom||!ident||!pwd) { showToast('Champs obligatoires manquants','warning'); return; }
  var r = await supabase.from('profiles').insert({nom,prenom,identifiant:ident,mot_de_passe_hash:pwd,role:'moderateur',actif:true});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Modérateur créé !','success'); loadProfs();
}

// ── 13. CLASSES ─────────────────────────────
async function loadClasses() {
  var el = document.getElementById('page-classes');
  var res = await db.getClasses();
  var rows = (res.data||[]).map(function(c){ return '<tr><td><strong>'+c.nom+'</strong></td><td>'+(c.niveau||'-')+'</td><td>'+c.annee_scolaire+'</td></tr>'; }).join('');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Classes</span></div><div class="card"><div class="card-header"><div class="card-title">🏫 Classes</div>'+(currentRole!=='acteur'?'<button class="btn btn-primary btn-sm" onclick="openModalAddClasse()">+ Créer</button>':'')+'</div><div class="table-container"><table><thead><tr><th>Nom</th><th>Niveau</th><th>Année</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

async function openModalAddClasse() {
  document.getElementById('modal-title').textContent = 'Créer une classe';
  document.getElementById('modal-body').innerHTML = '<div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom" placeholder="Ex: 3ème A"></div><div class="form-group"><label class="form-label">Niveau</label><input class="form-control" id="f-niveau"></div><div class="form-group"><label class="form-label">Année</label><input class="form-control" id="f-annee" value="2024-2025"></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveClasse()">Créer</button>';
  openModal();
}

async function saveClasse() {
  var nom = document.getElementById('f-nom').value.trim();
  if (!nom) { showToast('Nom requis','warning'); return; }
  var r = await supabase.from('classes').insert({nom, niveau:document.getElementById('f-niveau').value, annee_scolaire:document.getElementById('f-annee').value});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Classe créée !','success'); loadClasses();
}

// ── 14. EMPLOI DU TEMPS ─────────────────────
async function loadEDT() {
  var el = document.getElementById('page-edt');
  var rc = await db.getClasses();
  var opts = (rc.data||[]).map(function(c){ return '<option value="'+c.id+'">'+c.nom+'</option>'; }).join('');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Emploi du temps</span></div><div class="card"><div class="card-header"><div class="card-title">📅 Emploi du temps</div><div style="display:flex;gap:8px;align-items:center"><select class="form-control" id="edt-classe" onchange="renderEDT()" style="width:170px"><option value="">-- Choisir classe --</option>'+opts+'</select>'+(currentRole!=='acteur'?'<button class="btn btn-primary btn-sm" onclick="openModalAddCreneau()">+ Ajouter</button>':'')+'</div></div><div class="card-body" id="edt-content"><div class="alert alert-info">Sélectionnez une classe.</div></div></div>';
}

async function renderEDT() {
  var classeId = document.getElementById('edt-classe').value;
  if (!classeId) return;
  var res = await db.getEDT(classeId);
  var jours = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
  var heures = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  var html = '<div style="overflow-x:auto"><div class="edt-grid" style="min-width:700px"><div class="edt-header">Horaire</div>';
  jours.forEach(function(j){ html += '<div class="edt-header">'+j+'</div>'; });
  for (var i=0; i<heures.length-1; i++) {
    html += '<div class="edt-time">'+heures[i]+'<br><span style="color:#B0BEC5;font-size:10px">'+heures[i+1]+'</span></div>';
    jours.forEach(function(jour) {
      var c = (res.data||[]).find(function(x){ return x.jour===jour && x.heure_debut<=heures[i] && x.heure_fin>heures[i]; });
      if (c) {
        html += '<div class="edt-cell"><div class="edt-cours" style="background:'+c.matieres.couleur+'22;border-left:3px solid '+c.matieres.couleur+';color:'+c.matieres.couleur+'"><div>'+c.matieres.nom+'</div><div style="font-size:10px;opacity:.8">'+(c.profiles?c.profiles.prenom+' '+c.profiles.nom:'')+'</div><div style="font-size:10px">'+(c.salle||'')+'</div></div></div>';
      } else { html += '<div class="edt-cell"></div>'; }
    });
  }
  html += '</div></div>';
  document.getElementById('edt-content').innerHTML = html;
}

async function openModalAddCreneau() {
  var rc = await db.getClasses(), rm = await db.getMatieres();
  var rp = await supabase.from('profiles').select('*').in('role',['moderateur','acteur']).eq('actif',true);
  document.getElementById('modal-title').textContent = 'Ajouter un créneau';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Classe *</label><select class="form-control" id="f-classe">'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Enseignant</label><select class="form-control" id="f-prof"><option value="">-- Aucun --</option>'+(rp.data||[]).map(function(p){return '<option value="'+p.id+'">'+p.prenom+' '+p.nom+'</option>';}).join('')+'</select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Jour *</label><select class="form-control" id="f-jour">'+['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map(function(j){return '<option>'+j+'</option>';}).join('')+'</select></div><div class="form-group"><label class="form-label">Salle</label><input class="form-control" id="f-salle"></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Début *</label><input class="form-control" id="f-hdebut" type="time" value="08:00"></div><div class="form-group"><label class="form-label">Fin *</label><input class="form-control" id="f-hfin" type="time" value="09:00"></div></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveCreneau()">Ajouter</button>';
  openModal();
}

async function saveCreneau() {
  var r = await supabase.from('emploi_du_temps').insert({classe_id:document.getElementById('f-classe').value, matiere_id:document.getElementById('f-matiere').value, professeur_id:document.getElementById('f-prof').value||null, jour:document.getElementById('f-jour').value, heure_debut:document.getElementById('f-hdebut').value, heure_fin:document.getElementById('f-hfin').value, salle:document.getElementById('f-salle').value});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Créneau ajouté !','success'); renderEDT();
}

// ── 15. ABSENCES ────────────────────────────
async function loadAbsences() {
  var el = document.getElementById('page-absences');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Absences / Retards</span></div><div class="card"><div class="card-header"><div class="card-title">📋 Absences & Retards</div><div style="display:flex;gap:8px"><input class="form-control" id="abs-date" type="date" value="'+today()+'" onchange="renderAbsences()" style="width:160px"><button class="btn btn-primary btn-sm" onclick="openModalAddAbsence()">+ Saisir</button></div></div><div id="abs-table"></div></div>';
  renderAbsences();
}

async function renderAbsences() {
  var d = document.getElementById('abs-date') ? document.getElementById('abs-date').value : null;
  var res = await db.getAbsences(d?{date:d}:{});
  var rows = (res.data||[]).map(function(a){
    return '<tr><td><strong>'+(a.profiles?a.profiles.prenom+' '+a.profiles.nom:'')+'</strong></td><td>'+(a.profiles&&a.profiles.classes?a.profiles.classes.nom:'-')+'</td><td>'+formatDate(a.date)+'</td><td><span class="badge '+(a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet')+'">'+a.type+'</span></td><td>'+(a.motif||'-')+'</td><td><button class="btn btn-sm '+(a.justifiee?'btn-success':'btn-secondary')+'" onclick="toggleJustif(\''+a.id+'\','+(!a.justifiee)+')">'+( a.justifiee?'✅ Oui':'❌ Non')+'</button></td><td><button class="btn btn-danger btn-sm" onclick="deleteAbsence(\''+a.id+'\')">🗑️</button></td></tr>';
  }).join('');
  document.getElementById('abs-table').innerHTML = '<div class="table-container"><table><thead><tr><th>Élève</th><th>Classe</th><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

async function openModalAddAbsence() {
  var re = await db.getProfiles({role:'acteur',actif:true});
  document.getElementById('modal-title').textContent = 'Saisir une absence / retard';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="absence">Absence</option><option value="retard">Retard</option><option value="exclusion">Exclusion</option></select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-hdebut" type="time"></div><div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-hfin" type="time"></div></div>'+
    '<div class="form-group"><label class="form-label">Motif</label><textarea class="form-control" id="f-motif" rows="2"></textarea></div>'+
    '<div class="form-group" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="f-justif"><label for="f-justif" class="form-label" style="margin:0">Justifiée</label></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveAbsence()">Enregistrer</button>';
  openModal();
}

async function saveAbsence() {
  var eid=document.getElementById('f-eleve').value, d=document.getElementById('f-date').value;
  if (!eid||!d) { showToast('Champs obligatoires manquants','warning'); return; }
  var r = await db.createAbsence({eleve_id:eid, date:d, type:document.getElementById('f-type').value, heure_debut:document.getElementById('f-hdebut').value||null, heure_fin:document.getElementById('f-hfin').value||null, motif:document.getElementById('f-motif').value, justifiee:document.getElementById('f-justif').checked});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Absence enregistrée !','success'); renderAbsences();
}

async function toggleJustif(id, val) { await supabase.from('absences').update({justifiee:val}).eq('id',id); renderAbsences(); }
async function deleteAbsence(id) { if (!confirm('Supprimer ?')) return; await supabase.from('absences').delete().eq('id',id); showToast('Supprimé','success'); renderAbsences(); }

// ── 16. NOTES ───────────────────────────────
var _currentPeriode = 'T1';

async function loadNotes() {
  var el = document.getElementById('page-notes');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Notes</span></div><div class="card"><div class="card-header"><div class="card-title">📝 Notes</div><button class="btn btn-primary btn-sm" onclick="openModalAddNote()">+ Ajouter</button></div><div class="card-body"><div class="tabs"><div class="tab active" onclick="switchPeriode(\'T1\',this)">Trimestre 1</div><div class="tab" onclick="switchPeriode(\'T2\',this)">Trimestre 2</div><div class="tab" onclick="switchPeriode(\'T3\',this)">Trimestre 3</div></div><div id="notes-table"></div></div></div>';
  renderNotes('T1');
}

async function renderNotes(p) {
  _currentPeriode = p || _currentPeriode;
  var res = await db.getNotes({periode:_currentPeriode});
  var rows = (res.data||[]).map(function(n){
    return '<tr><td>'+(n.profiles?n.profiles.prenom+' '+n.profiles.nom:'')+'</td><td><span class="badge" style="background:'+n.matieres.couleur+'22;color:'+n.matieres.couleur+'">'+n.matieres.nom+'</span></td><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+(n.intitule||'-')+'</td><td>'+formatDate(n.date)+'</td><td><button class="btn btn-danger btn-sm" onclick="deleteNote(\''+n.id+'\')">🗑️</button></td></tr>';
  }).join('');
  document.getElementById('notes-table').innerHTML = '<div class="table-container"><table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th><th>Intitulé</th><th>Date</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function switchPeriode(p, el) { document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');}); el.classList.add('active'); renderNotes(p); }

async function openModalAddNote() {
  var re = await db.getProfiles({role:'acteur',actif:true}), rm = await db.getMatieres();
  document.getElementById('modal-title').textContent = 'Ajouter une note';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"><div class="form-group"><label class="form-label">Note *</label><input class="form-control" id="f-note" type="number" min="0" max="20" step="0.5" value="10"></div><div class="form-group"><label class="form-label">Sur</label><input class="form-control" id="f-sur" type="number" value="20"></div><div class="form-group"><label class="form-label">Coeff.</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div></div>'+
    '<div class="form-group"><label class="form-label">Intitulé</label><input class="form-control" id="f-intitule" placeholder="Ex: Contrôle chapitre 3"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div><div class="form-group"><label class="form-label">Période</label><select class="form-control" id="f-periode"><option value="T1">Trimestre 1</option><option value="T2">Trimestre 2</option><option value="T3">Trimestre 3</option></select></div></div>'+
    '<div class="form-group"><label class="form-label">Commentaire</label><textarea class="form-control" id="f-comment" rows="2"></textarea></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveNote()">Enregistrer</button>';
  openModal();
}

async function saveNote() {
  var eid=document.getElementById('f-eleve').value, mid=document.getElementById('f-matiere').value, val=parseFloat(document.getElementById('f-note').value);
  if (!eid||!mid||isNaN(val)) { showToast('Champs obligatoires manquants','warning'); return; }
  var r = await db.createNote({eleve_id:eid, matiere_id:mid, valeur:val, sur:parseFloat(document.getElementById('f-sur').value)||20, coefficient:parseFloat(document.getElementById('f-coeff').value)||1, intitule:document.getElementById('f-intitule').value, date:document.getElementById('f-date').value, periode:document.getElementById('f-periode').value, commentaire:document.getElementById('f-comment').value});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Note enregistrée !','success'); renderNotes();
}

async function deleteNote(id) { if (!confirm('Supprimer ?')) return; await supabase.from('notes').delete().eq('id',id); showToast('Note supprimée','success'); renderNotes(); }

// ── 17. CAHIER DE TEXTES ────────────────────
async function loadCahier() {
  var el = document.getElementById('page-cahier');
  var rc = await db.getClasses();
  var peutEcrire = currentRole !== 'acteur' || (currentUser && currentUser.dirige_cours);
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Cahier de textes</span></div><div class="card"><div class="card-header"><div class="card-title">📖 Cahier de textes</div><div style="display:flex;gap:8px"><select class="form-control" id="cahier-classe" onchange="renderCahier()" style="width:170px"><option value="">-- Toutes classes --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select>'+(peutEcrire?'<button class="btn btn-primary btn-sm" onclick="openModalAddCahier()">+ Ajouter</button>':'')+'</div></div><div id="cahier-list" class="card-body"></div></div>';
  renderCahier();
}

async function renderCahier() {
  var cid = document.getElementById('cahier-classe') ? document.getElementById('cahier-classe').value : '';
  var res = await db.getCahier(cid?{classe_id:cid}:{});
  if (!(res.data||[]).length) { document.getElementById('cahier-list').innerHTML = '<div class="alert alert-info">Aucune entrée.</div>'; return; }
  document.getElementById('cahier-list').innerHTML = (res.data||[]).map(function(e){
    return '<div style="border:1px solid var(--gris-border);border-radius:6px;padding:14px;margin-bottom:12px;border-left:4px solid '+(e.matieres?e.matieres.couleur:'#1565C0')+'"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:700;color:'+(e.matieres?e.matieres.couleur:'#1565C0')+'">'+(e.matieres?e.matieres.nom:'?')+'</span><span class="text-muted text-sm">'+formatDate(e.date)+' | '+(e.classes?e.classes.nom:'-')+' | '+(e.profiles?e.profiles.prenom+' '+e.profiles.nom:'')+'</span></div>'+(e.contenu_cours?'<div style="margin-bottom:8px"><strong style="font-size:12px;color:#546E7A">📚 Cours :</strong><div style="margin-top:4px">'+e.contenu_cours+'</div></div>':'')+(e.devoirs?'<div><strong style="font-size:12px;color:#546E7A">📝 Devoirs :</strong><div style="margin-top:4px">'+e.devoirs+'</div>'+(e.date_remise?'<div class="text-sm text-muted mt-1">📅 À rendre le '+formatDate(e.date_remise)+'</div>':'')+'</div>':'')+'</div>';
  }).join('');
}

async function openModalAddCahier() {
  var rc = await db.getClasses(), rm = await db.getMatieres();
  document.getElementById('modal-title').textContent = 'Ajouter au cahier de textes';
  document.getElementById('modal-body').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Classe *</label><select class="form-control" id="f-classe">'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div><div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div></div>'+
    '<div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label class="form-label">Contenu du cours</label><textarea class="form-control" id="f-contenu" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Devoirs</label><textarea class="form-control" id="f-devoirs" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Date de remise</label><input class="form-control" id="f-remise" type="date"></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveCahier()">Enregistrer</button>';
  openModal();
}

async function saveCahier() {
  var r = await db.createEntreeCahier({classe_id:document.getElementById('f-classe').value, matiere_id:document.getElementById('f-matiere').value, date:document.getElementById('f-date').value, contenu_cours:document.getElementById('f-contenu').value, devoirs:document.getElementById('f-devoirs').value, date_remise:document.getElementById('f-remise').value||null});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Entrée ajoutée !','success'); renderCahier();
}

// ── 18. MESSAGERIE ──────────────────────────
async function loadMessages() {
  var el = document.getElementById('page-messages');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Messagerie</span></div><div style="display:grid;grid-template-columns:300px 1fr;gap:16px"><div class="card" style="max-height:580px;display:flex;flex-direction:column"><div class="card-header" style="flex-shrink:0"><div class="card-title">✉️ Reçus</div><button class="btn btn-primary btn-sm" onclick="openModalMessage()">+ Nouveau</button></div><div id="msg-list" style="overflow-y:auto;flex:1"></div></div><div class="card" id="msg-detail" style="max-height:580px;display:flex;flex-direction:column"><div class="card-body" style="flex:1;display:flex;align-items:center;justify-content:center;color:#90A4AE">Sélectionnez un message</div></div></div>';
  renderMessagesList();
}

async function renderMessagesList() {
  var res = await db.getMessages(currentUser.id);
  var el = document.getElementById('msg-list');
  if (!(res.data||[]).length) { el.innerHTML = '<div style="padding:16px;text-align:center;color:#90A4AE;font-size:13px">Aucun message</div>'; return; }
  el.innerHTML = (res.data||[]).map(function(m){
    return '<div onclick="openMessage(\''+m.id+'\')" style="padding:12px 14px;border-bottom:1px solid var(--gris-border);cursor:pointer;background:'+(m.lu?'white':'#F0F7FF')+'" onmouseover="this.style.background=\'#EEF5FF\'" onmouseout="this.style.background=\''+(m.lu?'white':'#F0F7FF')+'\'"><div style="display:flex;justify-content:space-between;font-size:12px"><strong>'+(m.profiles?m.profiles.prenom+' '+m.profiles.nom:'')+'</strong><span class="text-muted">'+formatDateTime(m.date_envoi)+'</span></div><div style="font-size:13px;font-weight:'+(m.lu?400:700)+';margin-top:2px">'+(m.sujet||'(Sans sujet)')+'</div><div style="font-size:11.5px;color:#90A4AE;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'+(m.contenu||'').substring(0,60)+'…</div></div>';
  }).join('');
}

async function openMessage(id) {
  var res = await supabase.from('messages').select('*, profiles!messages_expediteur_id_fkey(nom, prenom)').eq('id',id).single();
  await db.markMessageRead(id); refreshNotifMessages();
  var m = res.data;
  document.getElementById('msg-detail').innerHTML = '<div class="card-header" style="flex-shrink:0"><div><div class="card-title">'+(m.sujet||'(Sans sujet)')+'</div><div class="text-sm text-muted">De : '+(m.profiles?m.profiles.prenom+' '+m.profiles.nom:'')+' | '+formatDateTime(m.date_envoi)+'</div></div><button class="btn btn-secondary btn-sm" onclick="openModalMessage(\''+m.expediteur_id+'\')">↩ Répondre</button></div><div class="card-body" style="overflow-y:auto;flex:1;white-space:pre-wrap;line-height:1.6">'+(m.contenu||'')+'</div>';
  renderMessagesList();
}

async function openModalMessage(destId) {
  destId = destId || null;
  var ru = await supabase.from('profiles').select('id, nom, prenom, role').eq('actif',true);
  document.getElementById('modal-title').textContent = 'Nouveau message';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Destinataire *</label><select class="form-control" id="f-dest"><option value="">-- Choisir --</option>'+(ru.data||[]).filter(function(u){return u.id!==currentUser.id;}).map(function(u){return '<option value="'+u.id+'"'+(u.id===destId?' selected':'')+'>'+u.prenom+' '+u.nom+' ('+labelRole(u.role)+')</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Sujet</label><input class="form-control" id="f-sujet" placeholder="Objet du message"></div>'+
    '<div class="form-group"><label class="form-label">Message *</label><textarea class="form-control" id="f-contenu" rows="6"></textarea></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="sendMsg()">Envoyer ✉️</button>';
  openModal();
}

async function sendMsg() {
  var dest=document.getElementById('f-dest').value, contenu=document.getElementById('f-contenu').value.trim();
  if (!dest||!contenu) { showToast('Destinataire et message requis','warning'); return; }
  var r = await db.sendMessage({destinataire_id:dest, sujet:document.getElementById('f-sujet').value, contenu:contenu});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Message envoyé !','success'); loadMessages();
}

// ── 19. SANCTIONS ───────────────────────────
async function loadSanctions() {
  var el = document.getElementById('page-sanctions');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Sanctions</span></div><div class="card"><div class="card-header"><div class="card-title">⚠️ Sanctions & Punitions</div><button class="btn btn-primary btn-sm" onclick="openModalAddSanction()">+ Ajouter</button></div><div id="sanctions-table"></div></div>';
  renderSanctions();
}

async function renderSanctions() {
  var res = await db.getSanctions();
  var rows = (res.data||[]).map(function(s){
    return '<tr><td>'+(s.profiles?s.profiles.prenom+' '+s.profiles.nom:'')+'</td><td>'+(s.profiles&&s.profiles.classes?s.profiles.classes.nom:'-')+'</td><td><span class="badge badge-orange">'+s.type+'</span></td><td>'+(s.motif||'-')+'</td><td>'+formatDate(s.date)+'</td><td>'+(s.executee?'✅':'❌')+'</td></tr>';
  }).join('');
  document.getElementById('sanctions-table').innerHTML = '<div class="table-container"><table><thead><tr><th>Élève</th><th>Classe</th><th>Type</th><th>Motif</th><th>Date</th><th>Exécutée</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

async function openModalAddSanction() {
  var re = await db.getProfiles({role:'acteur',actif:true});
  document.getElementById('modal-title').textContent = 'Ajouter une sanction';
  document.getElementById('modal-body').innerHTML =
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Type *</label><select class="form-control" id="f-type"><option>Avertissement</option><option>Retenue</option><option>Exclusion temporaire</option><option>Convocation parents</option><option>Travail supplémentaire</option></select></div>'+
    '<div class="form-group"><label class="form-label">Motif</label><textarea class="form-control" id="f-motif" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveSanction()">Enregistrer</button>';
  openModal();
}

async function saveSanction() {
  var eid = document.getElementById('f-eleve').value;
  if (!eid) { showToast('Élève requis','warning'); return; }
  var r = await db.createSanction({eleve_id:eid, type:document.getElementById('f-type').value, motif:document.getElementById('f-motif').value, date:document.getElementById('f-date').value});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Sanction enregistrée !','success'); renderSanctions();
}

// ── 20. BULLETINS ───────────────────────────
async function loadBulletins() {
  var el = document.getElementById('page-bulletins');
  var re = await db.getProfiles({role:'acteur',actif:true});
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Bulletins</span></div><div class="card"><div class="card-header"><div class="card-title">📄 Bulletins scolaires</div><div style="display:flex;gap:8px"><select class="form-control" id="bul-eleve" style="width:200px"><option value="">-- Choisir un élève --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select><select class="form-control" id="bul-periode" style="width:130px"><option value="T1">Trimestre 1</option><option value="T2">Trimestre 2</option><option value="T3">Trimestre 3</option></select><button class="btn btn-primary btn-sm" onclick="genererBulletin()">Générer</button></div></div><div id="bulletin-content" class="card-body"><div class="alert alert-info">Sélectionnez un élève et une période.</div></div></div>';
}

async function genererBulletin() {
  var eid=document.getElementById('bul-eleve').value, per=document.getElementById('bul-periode').value;
  if (!eid) { showToast('Choisissez un élève','warning'); return; }
  var results = await Promise.all([
    supabase.from('profiles').select('*, classes(nom)').eq('id',eid).single(),
    db.getNotes({eleve_id:eid, periode:per}),
    db.getAbsences({eleve_id:eid})
  ]);
  var eleve=results[0].data, notes=results[1].data||[], absences=results[2].data||[];
  var parMat = {};
  notes.forEach(function(n){ var m=n.matieres.nom; if(!parMat[m]) parMat[m]={notes:[],couleur:n.matieres.couleur}; parMat[m].notes.push(n); });
  var rows = Object.entries(parMat).map(function(kv){ var mat=kv[0], ns=kv[1].notes, couleur=kv[1].couleur; var tc=ns.reduce(function(s,n){return s+n.coefficient;},0); var moy=tc>0?ns.reduce(function(s,n){return s+(n.valeur/n.sur*20*n.coefficient);},0)/tc:0; return {mat,moy,nb:ns.length,couleur}; });
  var moyGen = rows.length ? rows.reduce(function(s,r){return s+r.moy;},0)/rows.length : null;
  var nbAbs=absences.filter(function(a){return a.type==='absence';}).length, nbRet=absences.filter(function(a){return a.type==='retard';}).length;
  var lp={'T1':'1er Trimestre','T2':'2ème Trimestre','T3':'3ème Trimestre'}[per];
  document.getElementById('bulletin-content').innerHTML =
    '<div style="max-width:800px;margin:0 auto"><div style="background:var(--bleu-pronote);color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center"><div style="font-family:Raleway,sans-serif;font-size:24px;font-weight:800;letter-spacing:2px">M13 STUDIO</div><div style="font-size:13px;opacity:.8">Bulletin scolaire — '+lp+' 2024-2025</div></div>'+
    '<div style="background:#F5F9FF;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border:1px solid #DDE3EA;border-top:none"><div><strong style="font-size:15px">'+eleve.prenom+' '+eleve.nom+'</strong><br><span class="text-muted text-sm">Classe : '+(eleve.classes?eleve.classes.nom:'-')+'</span></div><div><span class="badge badge-rouge" style="margin-right:6px">Absences : '+nbAbs+'</span><span class="badge badge-orange">Retards : '+nbRet+'</span></div></div>'+
    '<table style="width:100%;border-collapse:collapse;border:1px solid #DDE3EA;border-top:none"><thead><tr style="background:#EEF2F7"><th style="padding:10px 14px;text-align:left;font-size:11.5px;text-transform:uppercase;color:#546E7A">Matière</th><th style="padding:10px 14px;text-align:center;font-size:11.5px;color:#546E7A">Nb notes</th><th style="padding:10px 14px;text-align:center;font-size:11.5px;color:#546E7A">Moyenne</th></tr></thead><tbody>'+
    rows.map(function(r){ return '<tr style="border-bottom:1px solid #F0F4F8"><td style="padding:10px 14px;border-left:3px solid '+(r.couleur||'#1565C0')+'"><strong>'+r.mat+'</strong></td><td style="padding:10px 14px;text-align:center;color:#546E7A">'+r.nb+'</td><td style="padding:10px 14px;text-align:center"><span style="font-size:18px;font-weight:800;color:'+(r.moy>=14?'#2E7D32':r.moy>=10?'#E65100':'#C62828')+'">'+r.moy.toFixed(2)+'</span><span style="color:#90A4AE;font-size:12px">/20</span></td></tr>'; }).join('')+
    '</tbody></table>'+(moyGen!==null?'<div style="background:#E3F2FD;padding:16px 20px;border:1px solid #DDE3EA;border-top:none;border-radius:0 0 8px 8px;display:flex;justify-content:space-between;align-items:center"><strong style="color:#1565C0">Moyenne générale</strong><span style="font-size:28px;font-weight:800;color:'+(moyGen>=14?'#2E7D32':moyGen>=10?'#E65100':'#C62828')+'">'+moyGen.toFixed(2)+'<span style="font-size:16px;color:#90A4AE">/20</span></span></div>':'')+'</div>';
}

// ── 21. COMPTES (Réalisateur) ───────────────
async function loadComptes() {
  var el = document.getElementById('page-comptes');
  var res = await supabase.from('profiles').select('*, classes(nom)').order('role').order('nom');
  var rows = (res.data||[]).map(function(u){
    return '<tr><td><span class="badge '+(u.role==='realisateur'?'badge-violet':u.role==='moderateur'?'badge-bleu':'badge-vert')+'">'+(u.role==='realisateur'?'🎬 Réalisateur':u.role==='moderateur'?'🎭 Modérateur':'🎓 Acteur')+'</span></td><td><strong>'+u.nom+'</strong></td><td>'+u.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+u.identifiant+'</code></td><td>'+(u.classes?u.classes.nom:'-')+'</td><td><span class="badge '+(u.actif?'badge-vert':'badge-rouge')+'">'+(u.actif?'Actif':'Inactif')+'</span></td><td>'+(u.role==='acteur'?'<button class="btn btn-secondary btn-sm" onclick="openModalAddEleve(\''+u.id+'\')">✏️</button> ':'')+( u.id!==currentUser.id?'<button class="btn btn-danger btn-sm" onclick="desactiverUser(\''+u.id+'\')">🗑️</button>':'')+'</td></tr>';
  }).join('');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Gestion des comptes</span></div><div class="card"><div class="card-header"><div class="card-title">👥 Tous les comptes</div><div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="openModalAddEleve()">+ Acteur</button><button class="btn btn-secondary btn-sm" onclick="openModalAddProf()">+ Modérateur</button></div></div><div class="table-container"><table><thead><tr><th>Rôle</th><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe</th><th>Statut</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

// ── 22. MATIÈRES (Réalisateur) ──────────────
async function loadMatieres() {
  var el = document.getElementById('page-matieres');
  var res = await db.getMatieres();
  var rows = (res.data||[]).map(function(m){ return '<tr><td><span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:3px;background:'+m.couleur+';display:inline-block"></span><strong>'+m.nom+'</strong></span></td><td><code>'+(m.code||'-')+'</code></td><td style="font-size:12px;color:#546E7A">'+m.couleur+'</td><td>'+m.coefficient+'</td><td><button class="btn btn-danger btn-sm" onclick="deleteMatiere(\''+m.id+'\')">🗑️</button></td></tr>'; }).join('');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Matières</span></div><div class="card"><div class="card-header"><div class="card-title">📚 Matières</div><button class="btn btn-primary btn-sm" onclick="openModalAddMatiere()">+ Ajouter</button></div><div class="table-container"><table><thead><tr><th>Nom</th><th>Code</th><th>Couleur</th><th>Coeff.</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

async function openModalAddMatiere() {
  document.getElementById('modal-title').textContent = 'Ajouter une matière';
  document.getElementById('modal-body').innerHTML = '<div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom" placeholder="Ex: Mathématiques"></div><div class="form-group"><label class="form-label">Code</label><input class="form-control" id="f-code" placeholder="Ex: MATH"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Couleur</label><input class="form-control" id="f-couleur" type="color" value="#3B82F6" style="height:42px;padding:4px 6px"></div><div class="form-group"><label class="form-label">Coefficient</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div></div>';
  document.getElementById('modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveMatiere()">Ajouter</button>';
  openModal();
}

async function saveMatiere() {
  var nom = document.getElementById('f-nom').value.trim();
  if (!nom) { showToast('Nom requis','warning'); return; }
  var r = await supabase.from('matieres').insert({nom, code:document.getElementById('f-code').value, couleur:document.getElementById('f-couleur').value, coefficient:parseFloat(document.getElementById('f-coeff').value)||1});
  if (r.error) { showToast(r.error.message,'danger'); return; }
  closeModal(); showToast('Matière créée !','success'); loadMatieres();
}

async function deleteMatiere(id) {
  if (!confirm('Supprimer ?')) return;
  await supabase.from('matieres').update({actif:false}).eq('id',id);
  showToast('Matière supprimée','success'); loadMatieres();
}

// ── 23. VUE ACTEUR ──────────────────────────
async function loadMonDashboard() {
  var el = document.getElementById('page-mondashboard');
  var results = await Promise.all([
    db.getNotes({eleve_id:currentUser.id}),
    db.getAbsences({eleve_id:currentUser.id}),
    supabase.from('cahier_textes').select('*, matieres(nom, couleur)').gte('date_remise',today()).order('date_remise').limit(6)
  ]);
  var notes=results[0].data||[], absences=results[1].data||[], devoirs=results[2].data||[];
  var moy = notes.length ? notes.reduce(function(s,n){return s+(n.valeur/n.sur*20);},0)/notes.length : null;
  var nbAbs=absences.filter(function(a){return a.type==='absence';}).length;
  var nbRet=absences.filter(function(a){return a.type==='retard';}).length;
  el.innerHTML =
    '<div class="breadcrumb">M13 Studio <span>Mon espace</span></div>'+
    '<div style="background:var(--bleu-pronote);color:white;border-radius:10px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;border:2px solid rgba(255,255,255,.4)">'+getInitials(currentUser.nom,currentUser.prenom)+'</div><div><div style="font-family:Raleway,sans-serif;font-size:18px;font-weight:800">Bonjour, '+currentUser.prenom+' !</div><div style="font-size:12.5px;opacity:.8">M13 Studio</div></div></div>'+
    '<div class="dashboard-grid" style="margin-bottom:20px">'+
    '<div class="stat-card"><div class="stat-icon" style="background:#E3F2FD">📝</div><div class="stat-info"><div class="stat-value '+(moy!==null?noteColor(moy):'') +'">'+(moy!==null?moy.toFixed(2)+'/20':'-')+'</div><div class="stat-label">Moyenne générale</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon" style="background:#FFEBEE">📋</div><div class="stat-info"><div class="stat-value">'+nbAbs+'</div><div class="stat-label">Absences</div></div></div>'+
    '<div class="stat-card"><div class="stat-icon" style="background:#FFF3E0">⏱️</div><div class="stat-info"><div class="stat-value">'+nbRet+'</div><div class="stat-label">Retards</div></div></div></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">📚 Prochains devoirs</div></div><div class="card-body">'+
    (devoirs.length===0?'<div class="alert alert-success">Aucun devoir prochainement ! 🎉</div>':
      devoirs.map(function(d){ return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--gris-border)"><div style="width:10px;height:10px;border-radius:50%;background:'+(d.matieres?d.matieres.couleur:'#1565C0')+';margin-top:4px;flex-shrink:0"></div><div style="flex:1"><div style="font-weight:600;font-size:13px">'+(d.matieres?d.matieres.nom:'-')+'</div><div style="font-size:12.5px;color:#546E7A;margin-top:2px">'+(d.devoirs||'')+'</div></div><div style="font-size:11.5px;color:var(--rouge);font-weight:600;white-space:nowrap">📅 '+formatDate(d.date_remise)+'</div></div>'; }).join(''))+'</div></div>';
}

async function loadMesNotes() {
  var el = document.getElementById('page-monnotes');
  var res = await db.getNotes({eleve_id:currentUser.id});
  var parMat = {};
  (res.data||[]).forEach(function(n){ var m=n.matieres?n.matieres.nom:'?'; if(!parMat[m]) parMat[m]={notes:[],couleur:n.matieres?n.matieres.couleur:'#1565C0'}; parMat[m].notes.push(n); });
  if (!Object.keys(parMat).length) { el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Mes notes</span></div><div class="alert alert-info">Aucune note enregistrée.</div>'; return; }
  var cards = Object.entries(parMat).map(function(kv){
    var mat=kv[0], ns=kv[1].notes, couleur=kv[1].couleur;
    var tc=ns.reduce(function(s,n){return s+n.coefficient;},0);
    var moy=tc>0?ns.reduce(function(s,n){return s+(n.valeur/n.sur*20*n.coefficient);},0)/tc:0;
    return '<div class="card"><div class="card-header"><div class="card-title" style="color:'+couleur+'">'+mat+'</div><span class="note-value '+noteColor(moy)+'" style="font-size:18px;font-weight:800">'+moy.toFixed(2)+'/20</span></div><div class="table-container"><table><thead><tr><th>Note</th><th>Intitulé</th><th>Période</th><th>Date</th></tr></thead><tbody>'+ns.map(function(n){ return '<tr><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+(n.intitule||'-')+'</td><td><span class="badge badge-bleu">'+n.periode+'</span></td><td>'+formatDate(n.date)+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  }).join('');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Mes notes</span></div><div class="dashboard-grid">'+cards+'</div>';
}

async function loadMesAbsences() {
  var el = document.getElementById('page-monAbsences');
  var res = await db.getAbsences({eleve_id:currentUser.id});
  var rows = (res.data||[]).length===0 ? '<tr><td colspan="4" style="text-align:center;color:#90A4AE;padding:20px">Aucune absence 🎉</td></tr>' :
    (res.data||[]).map(function(a){ return '<tr><td>'+formatDate(a.date)+'</td><td><span class="badge '+(a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet')+'">'+a.type+'</span></td><td>'+(a.motif||'-')+'</td><td>'+(a.justifiee?'<span class="badge badge-vert">Justifiée</span>':'<span class="badge badge-rouge">Non justifiée</span>')+'</td></tr>'; }).join('');
  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Mes absences</span></div><div class="card"><div class="card-header"><div class="card-title">📋 Mes absences et retards</div></div><div class="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

// ── 24. POINT D'ENTRÉE ──────────────────────
function init() {
  // Créer le client Supabase (le CDN est déjà chargé avant ce script)
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // Session existante → relancer directement
  if (loadSession()) {
    initApp();
    return;
  }

  // Afficher l'écran de connexion
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';

  // Bouton connexion
  var btn = document.getElementById('btn-login');
  if (btn) btn.addEventListener('click', login);

  // Touche Entrée sur les champs
  ['login-ident', 'login-pwd'].forEach(function(id) {
    var f = document.getElementById(id);
    if (f) {
      f.addEventListener('keydown', function(e) { if (e.key === 'Enter') login(); });
      f.addEventListener('input', clearLoginError);
    }
  });

  // Fermer modale en cliquant l'overlay
  var overlay = document.getElementById('generic-modal');
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
}

document.addEventListener('DOMContentLoaded', init);

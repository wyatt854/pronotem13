// =============================================================
// M13 STUDIO — app.js  (version complète avec event listeners)
// =============================================================

// ─────────────────────────────────────────────────────────────
// 1. NAVIGATION
// ─────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`.sidebar-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  const loaders = {
    dashboard:    loadDashboard,
    eleves:       loadEleves,
    profs:        loadProfs,
    classes:      loadClasses,
    edt:          loadEDT,
    absences:     loadAbsences,
    notes:        loadNotes,
    cahier:       loadCahier,
    messages:     loadMessages,
    sanctions:    loadSanctions,
    bulletins:    loadBulletins,
    comptes:      loadComptes,
    matieres:     loadMatieres,
    monnotes:     loadMesNotes,
    monAbsences:  loadMesAbsences,
    mondashboard: loadMonDashboard,
  };
  if (loaders[page]) loaders[page]();
}

// ─────────────────────────────────────────────────────────────
// 2. CONNEXION — logique metier
// ─────────────────────────────────────────────────────────────
async function login() {
  const identEl = document.getElementById('login-ident');
  const pwdEl   = document.getElementById('login-pwd');
  const roleEl  = document.getElementById('selected-role');
  const btn     = document.getElementById('btn-login');
  const errEl   = document.getElementById('login-error');

  errEl.classList.add('hidden');
  errEl.textContent = '';

  const ident = identEl.value.trim();
  const pwd   = pwdEl.value;
  const role  = roleEl.value;

  if (!role) {
    afficherErreurLogin('Veuillez choisir votre role (Acteur, Moderateur ou Realisateur).');
    showToast('Choisissez votre role', 'warning');
    return;
  }
  if (!ident) {
    afficherErreurLogin('Veuillez saisir votre identifiant.');
    identEl.focus();
    return;
  }
  if (!pwd) {
    afficherErreurLogin('Veuillez saisir votre mot de passe.');
    pwdEl.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span style="opacity:.7">Connexion en cours...</span>';

  try {
    const { data, error } = await db.getProfileByIdentifiant(ident);

    if (error || !data) {
      afficherErreurLogin('Identifiant introuvable. Verifiez votre saisie.');
      showToast('Identifiant introuvable', 'danger');
      resetBtn(btn);
      return;
    }

    if (data.mot_de_passe_hash !== pwd) {
      afficherErreurLogin('Mot de passe incorrect.');
      showToast('Mot de passe incorrect', 'danger');
      pwdEl.value = '';
      pwdEl.focus();
      resetBtn(btn);
      return;
    }

    if (!data.actif) {
      afficherErreurLogin('Ce compte est desactive. Contactez le Realisateur.');
      showToast('Compte desactive', 'danger');
      resetBtn(btn);
      return;
    }

    if (data.role !== role) {
      afficherErreurLogin(
        'Ce compte est de type "' + labelRole(data.role) + '". ' +
        'Vous avez selectionne "' + labelRole(role) + '".'
      );
      showToast('Mauvais role selectionne', 'danger');
      resetBtn(btn);
      return;
    }

    await supabase
      .from('profiles')
      .update({ derniere_connexion: new Date().toISOString() })
      .eq('id', data.id);

    saveSession(data);
    showToast('Bienvenue, ' + data.prenom + ' !', 'success');
    initApp();

  } catch (err) {
    afficherErreurLogin('Impossible de joindre le serveur. Verifiez votre connexion Internet.');
    showToast('Erreur reseau', 'danger');
    console.error('[M13 login error]', err);
    resetBtn(btn);
  }
}

function afficherErreurLogin(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function resetBtn(btn) {
  btn.disabled = false;
  btn.textContent = 'Se connecter';
}

function labelRole(r) {
  return r === 'realisateur' ? 'Realisateur' :
         r === 'moderateur'  ? 'Moderateur'  : 'Acteur';
}

// ─────────────────────────────────────────────────────────────
// 3. DECONNEXION
// ─────────────────────────────────────────────────────────────
function logout() {
  clearSession();
  document.getElementById('app').style.display          = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-ident').value          = '';
  document.getElementById('login-pwd').value            = '';
  document.getElementById('selected-role').value        = '';
  document.getElementById('login-error').classList.add('hidden');
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('btn-login').textContent      = 'Se connecter';
  document.getElementById('btn-login').disabled         = false;
}

// ─────────────────────────────────────────────────────────────
// 4. INITIALISATION APP (apres connexion reussie)
// ─────────────────────────────────────────────────────────────
function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display          = 'block';

  document.getElementById('user-name').textContent =
    currentUser.prenom + ' ' + currentUser.nom;
  document.getElementById('user-initials').textContent =
    getInitials(currentUser.nom, currentUser.prenom);
  document.getElementById('user-role-badge').textContent =
    currentRole === 'realisateur' ? 'Realisateur' :
    currentRole === 'moderateur'  ? 'Moderateur'  : 'Acteur';

  buildSidebar();

  if (currentRole === 'acteur') navigate('mondashboard');
  else                          navigate('dashboard');
}

// ─────────────────────────────────────────────────────────────
// 5. SIDEBAR DYNAMIQUE
// ─────────────────────────────────────────────────────────────
function buildSidebar() {
  const sidebar = document.getElementById('sidebar-nav');
  let html = '';

  if (currentRole === 'realisateur' || currentRole === 'moderateur') {
    html += `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Accueil</div>
        <a class="sidebar-item" data-page="dashboard" onclick="navigate('dashboard')">
          <span class="icon">📊</span> Tableau de bord
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Vie Scolaire</div>
        <a class="sidebar-item" data-page="absences" onclick="navigate('absences')">
          <span class="icon">📋</span> Absences / Retards
        </a>
        <a class="sidebar-item" data-page="sanctions" onclick="navigate('sanctions')">
          <span class="icon">⚠️</span> Sanctions
        </a>
        <a class="sidebar-item" data-page="bulletins" onclick="navigate('bulletins')">
          <span class="icon">📄</span> Bulletins
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Scolarite</div>
        <a class="sidebar-item" data-page="edt" onclick="navigate('edt')">
          <span class="icon">📅</span> Emploi du temps
        </a>
        <a class="sidebar-item" data-page="notes" onclick="navigate('notes')">
          <span class="icon">📝</span> Notes
        </a>
        <a class="sidebar-item" data-page="cahier" onclick="navigate('cahier')">
          <span class="icon">📖</span> Cahier de textes
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Annuaire</div>
        <a class="sidebar-item" data-page="eleves" onclick="navigate('eleves')">
          <span class="icon">🎓</span> Acteurs (Eleves)
        </a>
        <a class="sidebar-item" data-page="profs" onclick="navigate('profs')">
          <span class="icon">👨‍🏫</span> Enseignants
        </a>
        <a class="sidebar-item" data-page="classes" onclick="navigate('classes')">
          <span class="icon">🏫</span> Classes
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Communication</div>
        <a class="sidebar-item" data-page="messages" onclick="navigate('messages')">
          <span class="icon">✉️</span> Messagerie
        </a>
      </div>`;

    if (currentRole === 'realisateur') {
      html += `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Administration</div>
        <a class="sidebar-item" data-page="comptes" onclick="navigate('comptes')">
          <span class="icon">👥</span> Gestion comptes
        </a>
        <a class="sidebar-item" data-page="matieres" onclick="navigate('matieres')">
          <span class="icon">📚</span> Matieres
        </a>
      </div>`;
    }
  } else {
    html += `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Accueil</div>
        <a class="sidebar-item" data-page="mondashboard" onclick="navigate('mondashboard')">
          <span class="icon">🏠</span> Mon tableau de bord
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Ma scolarite</div>
        <a class="sidebar-item" data-page="monnotes" onclick="navigate('monnotes')">
          <span class="icon">📝</span> Mes notes
        </a>
        <a class="sidebar-item" data-page="monAbsences" onclick="navigate('monAbsences')">
          <span class="icon">📋</span> Mes absences
        </a>
        <a class="sidebar-item" data-page="edt" onclick="navigate('edt')">
          <span class="icon">📅</span> Emploi du temps
        </a>
        <a class="sidebar-item" data-page="cahier" onclick="navigate('cahier')">
          <span class="icon">📖</span> Cahier de textes
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Communication</div>
        <a class="sidebar-item" data-page="messages" onclick="navigate('messages')">
          <span class="icon">✉️</span> Messagerie
        </a>
      </div>`;

    if (currentUser.dirige_cours) {
      html += `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Mes cours</div>
        <a class="sidebar-item" data-page="notes" onclick="navigate('notes')">
          <span class="icon">📝</span> Saisir notes
        </a>
        <a class="sidebar-item" data-page="absences" onclick="navigate('absences')">
          <span class="icon">📋</span> Appel
        </a>
        <a class="sidebar-item" data-page="cahier" onclick="navigate('cahier')">
          <span class="icon">📖</span> Cahier de textes
        </a>
      </div>`;
    }
  }

  sidebar.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// 6. DASHBOARD ADMIN / MODO
// ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Tableau de bord</span></div>
    <div id="stats-grid" class="dashboard-grid"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div id="card-recent-absences"></div>
      <div id="card-recent-notes"></div>
    </div>`;

  const [{ data: eleves }, { data: profs }, { data: classes }, { data: absToday }] =
    await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'acteur').eq('actif', true),
      supabase.from('profiles').select('id').eq('role', 'moderateur').eq('actif', true),
      supabase.from('classes').select('id').eq('actif', true),
      supabase.from('absences').select('id')
        .gte('date', new Date().toISOString().split('T')[0])
    ]);

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:#E3F2FD">🎓</div>
      <div class="stat-info">
        <div class="stat-value">${eleves ? eleves.length : 0}</div>
        <div class="stat-label">Acteurs (Eleves)</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#E8F5E9">👨‍🏫</div>
      <div class="stat-info">
        <div class="stat-value">${profs ? profs.length : 0}</div>
        <div class="stat-label">Enseignants</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#FFF3E0">🏫</div>
      <div class="stat-info">
        <div class="stat-value">${classes ? classes.length : 0}</div>
        <div class="stat-label">Classes actives</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#FFEBEE">📋</div>
      <div class="stat-info">
        <div class="stat-value">${absToday ? absToday.length : 0}</div>
        <div class="stat-label">Absences aujourd'hui</div>
      </div>
    </div>`;

  const { data: recAbsences } = await db.getAbsences();
  document.getElementById('card-recent-absences').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">📋 Dernieres absences</div></div>
      <div class="table-container">
        <table><thead><tr>
          <th>Eleve</th><th>Date</th><th>Type</th><th>Justif.</th>
        </tr></thead>
        <tbody>${(recAbsences || []).slice(0, 8).map(a => `
          <tr>
            <td>${a.profiles ? a.profiles.prenom : ''} ${a.profiles ? a.profiles.nom : ''}</td>
            <td>${formatDate(a.date)}</td>
            <td><span class="badge ${a.type === 'absence' ? 'badge-rouge' : a.type === 'retard' ? 'badge-orange' : 'badge-violet'}">${a.type}</span></td>
            <td>${a.justifiee ? '✅' : '❌'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;

  const { data: recNotes } = await db.getNotes();
  document.getElementById('card-recent-notes').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">📝 Dernieres notes</div></div>
      <div class="table-container">
        <table><thead><tr>
          <th>Eleve</th><th>Matiere</th><th>Note</th><th>Date</th>
        </tr></thead>
        <tbody>${(recNotes || []).slice(0, 8).map(n => `
          <tr>
            <td>${n.profiles ? n.profiles.prenom : ''} ${n.profiles ? n.profiles.nom : ''}</td>
            <td>${n.matieres ? n.matieres.nom : ''}</td>
            <td><span class="note-value ${noteColor(n.valeur, n.sur)}">${n.valeur}/${n.sur}</span></td>
            <td>${formatDate(n.date)}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// 7. GESTION ELEVES
// ─────────────────────────────────────────────────────────────
async function loadEleves() {
  const el = document.getElementById('page-eleves');
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Acteurs (Eleves)</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">🎓 Liste des Acteurs</div>
        <div style="display:flex;gap:8px">
          <input class="form-control" id="search-eleves" placeholder="Rechercher..." style="width:200px" oninput="filterEleves()">
          ${currentRole === 'realisateur' ? '<button class="btn btn-primary btn-sm" onclick="openModalAddEleve()">+ Ajouter</button>' : ''}
        </div>
      </div>
      <div class="table-container" id="table-eleves"></div>
    </div>`;
  await renderEleves();
}

async function renderEleves(search) {
  if (!search) search = '';
  const { data } = await db.getProfiles({ role: 'acteur' });
  const filtered = (data || []).filter(function(e) {
    return !search || (e.prenom + ' ' + e.nom + ' ' + e.identifiant).toLowerCase().indexOf(search.toLowerCase()) !== -1;
  });
  const tableEl = document.getElementById('table-eleves');
  if (!tableEl) return;
  tableEl.innerHTML = `
    <table><thead><tr>
      <th>Nom</th><th>Prenom</th><th>Identifiant</th><th>Classe</th><th>Statut</th>
      ${currentRole === 'realisateur' ? '<th>Actions</th>' : ''}
    </tr></thead>
    <tbody>${filtered.map(function(e) { return `
      <tr>
        <td><strong>${e.nom}</strong></td>
        <td>${e.prenom}</td>
        <td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">${e.identifiant}</code></td>
        <td>${e.classes ? e.classes.nom : '-'}</td>
        <td><span class="badge ${e.actif ? 'badge-vert' : 'badge-rouge'}">${e.actif ? 'Actif' : 'Inactif'}</span></td>
        ${currentRole === 'realisateur' ? '<td><button class="btn btn-secondary btn-sm" onclick="editEleve(\'' + e.id + '\')">✏️</button> <button class="btn btn-danger btn-sm" onclick="desactiverEleve(\'' + e.id + '\')">🗑️</button></td>' : ''}
      </tr>`;}).join('')}
    </tbody></table>`;
}

function filterEleves() {
  renderEleves(document.getElementById('search-eleves').value);
}

async function openModalAddEleve(id) {
  if (!id) id = null;
  const { data: classes } = await db.getClasses();
  var user = null;
  if (id) {
    var res = await supabase.from('profiles').select('*').eq('id', id).single();
    user = res.data;
  }

  document.getElementById('modal-title').textContent = id ? 'Modifier acteur' : 'Ajouter un acteur';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Nom *</label>
      <input class="form-control" id="f-nom" value="${user ? user.nom : ''}" placeholder="Nom de famille">
    </div>
    <div class="form-group">
      <label class="form-label">Prenom *</label>
      <input class="form-control" id="f-prenom" value="${user ? user.prenom : ''}" placeholder="Prenom">
    </div>
    <div class="form-group">
      <label class="form-label">Identifiant *</label>
      <input class="form-control" id="f-ident" value="${user ? user.identifiant : ''}" placeholder="Ex: dupont.thomas">
    </div>
    <div class="form-group">
      <label class="form-label">Mot de passe ${id ? '(laisser vide = inchange)' : '*'}</label>
      <input class="form-control" id="f-pwd" type="password" placeholder="Mot de passe">
    </div>
    <div class="form-group">
      <label class="form-label">Classe</label>
      <select class="form-control" id="f-classe">
        <option value="">-- Aucune --</option>
        ${(classes || []).map(function(c) { return '<option value="' + c.id + '"' + (user && user.classe_id === c.id ? ' selected' : '') + '>' + c.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-control" id="f-email" value="${user ? (user.email || '') : ''}" placeholder="email@exemple.com">
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="f-dirige" ${user && user.dirige_cours ? 'checked' : ''}>
      <label for="f-dirige" class="form-label" style="margin:0">Dirige des cours</label>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveEleve('${id || ''}')">Enregistrer</button>`;
  openModal();
}

async function saveEleve(id) {
  var nom        = document.getElementById('f-nom').value.trim();
  var prenom     = document.getElementById('f-prenom').value.trim();
  var identifiant = document.getElementById('f-ident').value.trim();
  var pwd        = document.getElementById('f-pwd').value;
  var classe_id  = document.getElementById('f-classe').value || null;
  var email      = document.getElementById('f-email').value.trim();
  var dirige_cours = document.getElementById('f-dirige').checked;

  if (!nom || !prenom || !identifiant) { showToast('Champs obligatoires manquants', 'warning'); return; }
  var data = { nom: nom, prenom: prenom, identifiant: identifiant, classe_id: classe_id, email: email, role: 'acteur', dirige_cours: dirige_cours };
  if (pwd) data.mot_de_passe_hash = pwd;

  if (id) {
    var res = await db.updateProfile(id, data);
    if (res.error) { showToast('Erreur : ' + res.error.message, 'danger'); return; }
  } else {
    if (!pwd) { showToast('Mot de passe requis', 'warning'); return; }
    data.actif = true;
    var res2 = await db.createProfile(data);
    if (res2.error) { showToast('Erreur : ' + res2.error.message, 'danger'); return; }
  }
  closeModal(); showToast('Acteur enregistre !', 'success'); loadEleves();
}

async function editEleve(id) { openModalAddEleve(id); }

async function desactiverEleve(id) {
  if (!confirm('Desactiver ce compte ?')) return;
  await db.deleteProfile(id);
  showToast('Compte desactive', 'success');
  loadEleves();
}

// ─────────────────────────────────────────────────────────────
// 8. PROFS / MODERATEURS
// ─────────────────────────────────────────────────────────────
async function loadProfs() {
  var el = document.getElementById('page-profs');
  var res = await db.getProfiles({ role: 'moderateur' });
  var data = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Enseignants</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">👨‍🏫 Enseignants / Moderateurs</div>
        ${currentRole === 'realisateur' ? '<button class="btn btn-primary btn-sm" onclick="openModalAddProf()">+ Ajouter</button>' : ''}
      </div>
      <div class="table-container">
        <table><thead><tr>
          <th>Nom</th><th>Prenom</th><th>Identifiant</th><th>Statut</th>
          ${currentRole === 'realisateur' ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>${(data || []).map(function(p) { return `
          <tr>
            <td><strong>${p.nom}</strong></td><td>${p.prenom}</td>
            <td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">${p.identifiant}</code></td>
            <td><span class="badge ${p.actif ? 'badge-vert' : 'badge-rouge'}">${p.actif ? 'Actif' : 'Inactif'}</span></td>
            ${currentRole === 'realisateur' ? '<td><button class="btn btn-danger btn-sm" onclick="desactiverEleve(\'' + p.id + '\')">🗑️</button></td>' : ''}
          </tr>`;}).join('')}
        </tbody></table>
      </div>
    </div>`;
}

async function openModalAddProf() {
  document.getElementById('modal-title').textContent = 'Ajouter un moderateur';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom" placeholder="Nom"></div>
    <div class="form-group"><label class="form-label">Prenom *</label><input class="form-control" id="f-prenom" placeholder="Prenom"></div>
    <div class="form-group"><label class="form-label">Identifiant *</label><input class="form-control" id="f-ident" placeholder="Identifiant"></div>
    <div class="form-group"><label class="form-label">Mot de passe *</label><input class="form-control" id="f-pwd" type="password" placeholder="Mot de passe"></div>
    <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="f-email" placeholder="email@exemple.com"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveProf()">Enregistrer</button>`;
  openModal();
}

async function saveProf() {
  var nom = document.getElementById('f-nom').value.trim();
  var prenom = document.getElementById('f-prenom').value.trim();
  var identifiant = document.getElementById('f-ident').value.trim();
  var pwd = document.getElementById('f-pwd').value;
  if (!nom || !prenom || !identifiant || !pwd) { showToast('Champs obligatoires manquants', 'warning'); return; }
  var res = await db.createProfile({ nom: nom, prenom: prenom, identifiant: identifiant, mot_de_passe_hash: pwd, role: 'moderateur', actif: true });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Moderateur cree !', 'success'); loadProfs();
}

// ─────────────────────────────────────────────────────────────
// 9. CLASSES
// ─────────────────────────────────────────────────────────────
async function loadClasses() {
  var el = document.getElementById('page-classes');
  var res = await db.getClasses();
  var data = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Classes</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">🏫 Classes</div>
        ${currentRole !== 'acteur' ? '<button class="btn btn-primary btn-sm" onclick="openModalAddClasse()">+ Creer une classe</button>' : ''}
      </div>
      <div class="table-container">
        <table><thead><tr><th>Nom</th><th>Niveau</th><th>Annee</th><th>Statut</th></tr></thead>
        <tbody>${(data || []).map(function(c) { return `
          <tr>
            <td><strong>${c.nom}</strong></td>
            <td>${c.niveau || '-'}</td>
            <td>${c.annee_scolaire}</td>
            <td><span class="badge badge-vert">Active</span></td>
          </tr>`;}).join('')}
        </tbody></table>
      </div>
    </div>`;
}

async function openModalAddClasse() {
  document.getElementById('modal-title').textContent = 'Creer une classe';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom" placeholder="Ex: 3eme A, Terminale B..."></div>
    <div class="form-group"><label class="form-label">Niveau</label><input class="form-control" id="f-niveau" placeholder="Ex: 3eme, Terminale..."></div>
    <div class="form-group"><label class="form-label">Annee scolaire</label><input class="form-control" id="f-annee" value="2024-2025"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveClasse()">Creer</button>`;
  openModal();
}

async function saveClasse() {
  var nom = document.getElementById('f-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'warning'); return; }
  var res = await db.createClasse({ nom: nom, niveau: document.getElementById('f-niveau').value, annee_scolaire: document.getElementById('f-annee').value });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Classe creee !', 'success'); loadClasses();
}

// ─────────────────────────────────────────────────────────────
// 10. EMPLOI DU TEMPS
// ─────────────────────────────────────────────────────────────
async function loadEDT() {
  var el = document.getElementById('page-edt');
  var res = await db.getClasses();
  var classes = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Emploi du temps</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📅 Emploi du temps</div>
        <div style="display:flex;gap:8px;align-items:center">
          <select class="form-control" id="edt-classe" onchange="renderEDT()" style="width:160px">
            <option value="">-- Choisir classe --</option>
            ${(classes || []).map(function(c) { return '<option value="' + c.id + '">' + c.nom + '</option>'; }).join('')}
          </select>
          ${currentRole !== 'acteur' ? '<button class="btn btn-primary btn-sm" onclick="openModalAddCreneau()">+ Ajouter</button>' : ''}
        </div>
      </div>
      <div class="card-body" id="edt-content">
        <div class="alert alert-info">Selectionnez une classe pour afficher l'emploi du temps.</div>
      </div>
    </div>`;
}

async function renderEDT() {
  var classeId = document.getElementById('edt-classe').value;
  if (!classeId) return;
  var res = await db.getEDT(classeId);
  var data = res.data;
  var jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  var heures = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

  var html = '<div class="edt-grid" style="min-width:700px"><div class="edt-header">Horaire</div>';
  jours.forEach(function(j) { html += '<div class="edt-header">' + j + '</div>'; });

  heures.forEach(function(h, i) {
    if (i < heures.length - 1) {
      html += '<div class="edt-time">' + h + '<br><span style="color:#B0BEC5;font-size:10px">' + heures[i + 1] + '</span></div>';
      jours.forEach(function(jour) {
        var cours = (data || []).filter(function(c) {
          return c.jour === jour && c.heure_debut <= h && c.heure_fin > h;
        });
        if (cours.length) {
          var c = cours[0];
          var couleur = c.matieres ? c.matieres.couleur : '#1565C0';
          html += '<div class="edt-cell"><div class="edt-cours" style="background:' + couleur + '22;border-left:3px solid ' + couleur + ';color:' + couleur + '">' +
            '<div>' + (c.matieres ? c.matieres.nom : '') + '</div>' +
            '<div style="font-size:10px;font-weight:400;opacity:.8">' + (c.profiles ? c.profiles.prenom + ' ' + c.profiles.nom : '') + '</div>' +
            '<div style="font-size:10px;font-weight:400">' + (c.salle || '') + '</div>' +
            '</div></div>';
        } else {
          html += '<div class="edt-cell"></div>';
        }
      });
    }
  });
  html += '</div>';
  document.getElementById('edt-content').innerHTML = html;
}

async function openModalAddCreneau() {
  var r1 = await db.getClasses();
  var r2 = await db.getMatieres();
  var r3 = await supabase.from('profiles').select('*').in('role', ['moderateur', 'acteur']).eq('actif', true).eq('dirige_cours', true);
  var classes = r1.data; var matieres = r2.data; var profs = r3.data;

  document.getElementById('modal-title').textContent = 'Ajouter un creneau';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Classe *</label>
      <select class="form-control" id="f-classe">
        ${(classes || []).map(function(c) { return '<option value="' + c.id + '">' + c.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Matiere *</label>
      <select class="form-control" id="f-matiere">
        ${(matieres || []).map(function(m) { return '<option value="' + m.id + '">' + m.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Enseignant</label>
      <select class="form-control" id="f-prof">
        <option value="">-- Aucun --</option>
        ${(profs || []).map(function(p) { return '<option value="' + p.id + '">' + p.prenom + ' ' + p.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Jour *</label>
        <select class="form-control" id="f-jour">
          <option value="Lundi">Lundi</option><option value="Mardi">Mardi</option>
          <option value="Mercredi">Mercredi</option><option value="Jeudi">Jeudi</option>
          <option value="Vendredi">Vendredi</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Salle</label>
        <input class="form-control" id="f-salle" placeholder="Salle 101">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Debut *</label>
        <input class="form-control" id="f-hdebut" type="time" value="08:00">
      </div>
      <div class="form-group"><label class="form-label">Fin *</label>
        <input class="form-control" id="f-hfin" type="time" value="09:00">
      </div>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveCreneau()">Ajouter</button>`;
  openModal();
}

async function saveCreneau() {
  var res = await db.createCreneauEDT({
    classe_id:     document.getElementById('f-classe').value,
    matiere_id:    document.getElementById('f-matiere').value,
    professeur_id: document.getElementById('f-prof').value || null,
    jour:          document.getElementById('f-jour').value,
    heure_debut:   document.getElementById('f-hdebut').value,
    heure_fin:     document.getElementById('f-hfin').value,
    salle:         document.getElementById('f-salle').value
  });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Creneau ajoute !', 'success');
  await renderEDT();
}

// ─────────────────────────────────────────────────────────────
// 11. ABSENCES
// ─────────────────────────────────────────────────────────────
async function loadAbsences() {
  var el = document.getElementById('page-absences');
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Absences / Retards</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Absences & Retards</div>
        <div style="display:flex;gap:8px">
          <input class="form-control" id="abs-date" type="date"
            value="${new Date().toISOString().split('T')[0]}"
            onchange="renderAbsences()" style="width:160px">
          <button class="btn btn-primary btn-sm" onclick="openModalAddAbsence()">+ Saisir</button>
        </div>
      </div>
      <div id="abs-table"></div>
    </div>`;
  renderAbsences();
}

async function renderAbsences() {
  var dateEl = document.getElementById('abs-date');
  var date = dateEl ? dateEl.value : null;
  var res = await db.getAbsences(date ? { date: date } : {});
  var data = res.data;
  var tableEl = document.getElementById('abs-table');
  if (!tableEl) return;
  tableEl.innerHTML = `
    <div class="table-container">
      <table><thead><tr>
        <th>Eleve</th><th>Classe</th><th>Date</th><th>Type</th><th>Motif</th><th>Justifiee</th><th>Actions</th>
      </tr></thead>
      <tbody>${(data || []).map(function(a) { return `
        <tr>
          <td><strong>${a.profiles ? a.profiles.prenom + ' ' + a.profiles.nom : '-'}</strong></td>
          <td>${a.profiles && a.profiles.classes ? a.profiles.classes.nom : '-'}</td>
          <td>${formatDate(a.date)}</td>
          <td><span class="badge ${a.type === 'absence' ? 'badge-rouge' : a.type === 'retard' ? 'badge-orange' : 'badge-violet'}">${a.type}</span></td>
          <td>${a.motif || '-'}</td>
          <td>
            <button class="btn btn-sm ${a.justifiee ? 'btn-success' : 'btn-secondary'}"
              onclick="toggleJustif('${a.id}',${!a.justifiee})">
              ${a.justifiee ? '✅ Oui' : '❌ Non'}
            </button>
          </td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteAbsence('${a.id}')">🗑️</button>
          </td>
        </tr>`;}).join('')}
      </tbody></table>
    </div>`;
}

async function openModalAddAbsence() {
  var res = await db.getProfiles({ role: 'acteur', actif: true });
  var eleves = res.data;
  document.getElementById('modal-title').textContent = 'Saisir une absence / retard';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Eleve *</label>
      <select class="form-control" id="f-eleve">
        <option value="">-- Choisir --</option>
        ${(eleves || []).map(function(e) { return '<option value="' + e.id + '">' + e.prenom + ' ' + e.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Date *</label>
      <input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group"><label class="form-label">Type</label>
      <select class="form-control" id="f-type">
        <option value="absence">Absence</option>
        <option value="retard">Retard</option>
        <option value="exclusion">Exclusion</option>
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Heure debut</label>
        <input class="form-control" id="f-hdebut" type="time">
      </div>
      <div class="form-group"><label class="form-label">Heure fin</label>
        <input class="form-control" id="f-hfin" type="time">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Motif</label>
      <textarea class="form-control" id="f-motif" rows="2" placeholder="Motif..."></textarea>
    </div>
    <div class="form-group" style="display:flex;gap:8px;align-items:center">
      <input type="checkbox" id="f-justif">
      <label for="f-justif" class="form-label" style="margin:0">Justifiee</label>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveAbsence()">Enregistrer</button>`;
  openModal();
}

async function saveAbsence() {
  var eleve_id = document.getElementById('f-eleve').value;
  var date = document.getElementById('f-date').value;
  if (!eleve_id || !date) { showToast('Champs obligatoires manquants', 'warning'); return; }
  var res = await db.createAbsence({
    eleve_id: eleve_id, date: date,
    type:        document.getElementById('f-type').value,
    heure_debut: document.getElementById('f-hdebut').value || null,
    heure_fin:   document.getElementById('f-hfin').value   || null,
    motif:       document.getElementById('f-motif').value,
    justifiee:   document.getElementById('f-justif').checked
  });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Absence enregistree !', 'success'); renderAbsences();
}

async function toggleJustif(id, val) {
  await db.updateAbsence(id, { justifiee: val });
  renderAbsences();
}

async function deleteAbsence(id) {
  if (!confirm('Supprimer cette absence ?')) return;
  await supabase.from('absences').delete().eq('id', id);
  showToast('Supprime', 'success'); renderAbsences();
}

// ─────────────────────────────────────────────────────────────
// 12. NOTES
// ─────────────────────────────────────────────────────────────
async function loadNotes() {
  var el = document.getElementById('page-notes');
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Notes</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📝 Saisie des notes</div>
        <button class="btn btn-primary btn-sm" onclick="openModalAddNote()">+ Ajouter une note</button>
      </div>
      <div class="card-body">
        <div class="tabs">
          <div class="tab active" onclick="switchPeriode('T1',this)">Trimestre 1</div>
          <div class="tab" onclick="switchPeriode('T2',this)">Trimestre 2</div>
          <div class="tab" onclick="switchPeriode('T3',this)">Trimestre 3</div>
        </div>
        <div id="notes-table"></div>
      </div>
    </div>`;
  renderNotes('T1');
}

async function renderNotes(periode) {
  if (!periode) periode = 'T1';
  var res = await db.getNotes({ periode: periode });
  var data = res.data;
  var el = document.getElementById('notes-table');
  if (!el) return;
  el.innerHTML = `
    <div class="table-container">
      <table><thead><tr>
        <th>Eleve</th><th>Matiere</th><th>Note</th><th>Intitule</th><th>Date</th><th>Actions</th>
      </tr></thead>
      <tbody>${(data || []).map(function(n) { return `
        <tr>
          <td>${n.profiles ? n.profiles.prenom + ' ' + n.profiles.nom : '-'}</td>
          <td><span class="badge" style="background:${n.matieres ? n.matieres.couleur + '22' : '#eee'};color:${n.matieres ? n.matieres.couleur : '#333'}">${n.matieres ? n.matieres.nom : '-'}</span></td>
          <td><span class="note-value ${noteColor(n.valeur, n.sur)}">${n.valeur}/${n.sur}</span></td>
          <td>${n.intitule || '-'}</td>
          <td>${formatDate(n.date)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteNote('${n.id}')">🗑️</button></td>
        </tr>`;}).join('')}
      </tbody></table>
    </div>`;
}

function switchPeriode(p, elTab) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  elTab.classList.add('active');
  renderNotes(p);
}

async function openModalAddNote() {
  var r1 = await db.getProfiles({ role: 'acteur', actif: true });
  var r2 = await db.getMatieres();
  var eleves = r1.data; var matieres = r2.data;
  document.getElementById('modal-title').textContent = 'Ajouter une note';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Eleve *</label>
      <select class="form-control" id="f-eleve">
        <option value="">-- Choisir --</option>
        ${(eleves || []).map(function(e) { return '<option value="' + e.id + '">' + e.prenom + ' ' + e.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Matiere *</label>
      <select class="form-control" id="f-matiere">
        ${(matieres || []).map(function(m) { return '<option value="' + m.id + '">' + m.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Note *</label>
        <input class="form-control" id="f-note" type="number" min="0" max="20" step="0.5" value="10">
      </div>
      <div class="form-group"><label class="form-label">Sur</label>
        <input class="form-control" id="f-sur" type="number" value="20">
      </div>
      <div class="form-group"><label class="form-label">Coeff.</label>
        <input class="form-control" id="f-coeff" type="number" value="1" step="0.5">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Intitule</label>
      <input class="form-control" id="f-intitule" placeholder="Ex: Controle de mathematiques">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Date</label>
        <input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group"><label class="form-label">Periode</label>
        <select class="form-control" id="f-periode">
          <option value="T1">Trimestre 1</option>
          <option value="T2">Trimestre 2</option>
          <option value="T3">Trimestre 3</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Commentaire</label>
      <textarea class="form-control" id="f-comment" rows="2"></textarea>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveNote()">Enregistrer</button>`;
  openModal();
}

async function saveNote() {
  var eleve_id   = document.getElementById('f-eleve').value;
  var matiere_id = document.getElementById('f-matiere').value;
  var valeur     = parseFloat(document.getElementById('f-note').value);
  if (!eleve_id || !matiere_id || isNaN(valeur)) { showToast('Champs obligatoires manquants', 'warning'); return; }
  var res = await db.createNote({
    eleve_id: eleve_id, matiere_id: matiere_id, valeur: valeur,
    sur:         parseFloat(document.getElementById('f-sur').value)   || 20,
    coefficient: parseFloat(document.getElementById('f-coeff').value) || 1,
    intitule:    document.getElementById('f-intitule').value,
    date:        document.getElementById('f-date').value,
    periode:     document.getElementById('f-periode').value,
    commentaire: document.getElementById('f-comment').value
  });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Note enregistree !', 'success'); renderNotes();
}

async function deleteNote(id) {
  if (!confirm('Supprimer cette note ?')) return;
  await db.deleteNote(id);
  showToast('Note supprimee', 'success'); renderNotes();
}

// ─────────────────────────────────────────────────────────────
// 13. CAHIER DE TEXTES
// ─────────────────────────────────────────────────────────────
async function loadCahier() {
  var el = document.getElementById('page-cahier');
  var res = await db.getClasses();
  var classes = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Cahier de textes</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📖 Cahier de textes</div>
        <div style="display:flex;gap:8px">
          <select class="form-control" id="cahier-classe" onchange="renderCahier()" style="width:160px">
            <option value="">-- Toutes classes --</option>
            ${(classes || []).map(function(c) { return '<option value="' + c.id + '">' + c.nom + '</option>'; }).join('')}
          </select>
          ${(currentRole !== 'acteur' || (currentUser && currentUser.dirige_cours)) ? '<button class="btn btn-primary btn-sm" onclick="openModalAddCahier()">+ Ajouter</button>' : ''}
        </div>
      </div>
      <div id="cahier-list" class="card-body"></div>
    </div>`;
  renderCahier();
}

async function renderCahier() {
  var classeEl = document.getElementById('cahier-classe');
  var classeId = classeEl ? classeEl.value : null;
  var res = await db.getCahier(classeId ? { classe_id: classeId } : {});
  var data = res.data;
  var listEl = document.getElementById('cahier-list');
  if (!listEl) return;
  if (!(data || []).length) {
    listEl.innerHTML = '<div class="alert alert-info">Aucune entree.</div>';
    return;
  }
  listEl.innerHTML = (data || []).map(function(e) {
    var couleur = e.matieres ? e.matieres.couleur : '#1565C0';
    return '<div style="border:1px solid var(--gris-border);border-radius:6px;padding:14px;margin-bottom:12px;border-left:4px solid ' + couleur + '">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span style="font-weight:700;color:' + couleur + '">' + (e.matieres ? e.matieres.nom : '?') + '</span>' +
      '<span class="text-muted text-sm">' + formatDate(e.date) + ' | ' + (e.classes ? e.classes.nom : '-') + ' | ' + (e.profiles ? e.profiles.prenom + ' ' + e.profiles.nom : '') + '</span>' +
      '</div>' +
      (e.contenu_cours ? '<div style="margin-bottom:8px"><strong style="font-size:12px;color:#546E7A">📚 Cours :</strong><div style="margin-top:4px;font-size:13px">' + e.contenu_cours + '</div></div>' : '') +
      (e.devoirs ? '<div><strong style="font-size:12px;color:#546E7A">📝 Devoirs :</strong><div style="margin-top:4px;font-size:13px">' + e.devoirs + '</div>' +
        (e.date_remise ? '<div class="text-sm text-muted mt-1">📅 A rendre le ' + formatDate(e.date_remise) + '</div>' : '') + '</div>' : '') +
      '</div>';
  }).join('');
}

async function openModalAddCahier() {
  var r1 = await db.getClasses();
  var r2 = await db.getMatieres();
  var classes = r1.data; var matieres = r2.data;
  document.getElementById('modal-title').textContent = 'Ajouter au cahier de textes';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Classe *</label>
        <select class="form-control" id="f-classe">
          ${(classes || []).map(function(c) { return '<option value="' + c.id + '">' + c.nom + '</option>'; }).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Matiere *</label>
        <select class="form-control" id="f-matiere">
          ${(matieres || []).map(function(m) { return '<option value="' + m.id + '">' + m.nom + '</option>'; }).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Date</label>
      <input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group"><label class="form-label">Contenu du cours</label>
      <textarea class="form-control" id="f-contenu" rows="3" placeholder="Resume du cours..."></textarea>
    </div>
    <div class="form-group"><label class="form-label">Devoirs</label>
      <textarea class="form-control" id="f-devoirs" rows="3" placeholder="Travail a faire..."></textarea>
    </div>
    <div class="form-group"><label class="form-label">Date de remise</label>
      <input class="form-control" id="f-remise" type="date">
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveCahier()">Enregistrer</button>`;
  openModal();
}

async function saveCahier() {
  var res = await db.createEntreeCahier({
    classe_id:    document.getElementById('f-classe').value,
    matiere_id:   document.getElementById('f-matiere').value,
    date:         document.getElementById('f-date').value,
    contenu_cours: document.getElementById('f-contenu').value,
    devoirs:      document.getElementById('f-devoirs').value,
    date_remise:  document.getElementById('f-remise').value || null
  });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Entree ajoutee !', 'success'); renderCahier();
}

// ─────────────────────────────────────────────────────────────
// 14. MESSAGERIE
// ─────────────────────────────────────────────────────────────
async function loadMessages() {
  var el = document.getElementById('page-messages');
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Messagerie</span></div>
    <div style="display:grid;grid-template-columns:300px 1fr;gap:16px;height:500px">
      <div class="card">
        <div class="card-header">
          <div class="card-title">✉️ Messages</div>
          <button class="btn btn-primary btn-sm" onclick="openModalMessage()">+ Nouveau</button>
        </div>
        <div id="msg-list" style="overflow-y:auto;max-height:420px"></div>
      </div>
      <div class="card" id="msg-detail">
        <div class="card-body" style="height:100%;display:flex;align-items:center;justify-content:center;color:#90A4AE">
          Selectionnez un message
        </div>
      </div>
    </div>`;

  var res = await db.getMessages(currentUser.id);
  var data = res.data;
  document.getElementById('msg-list').innerHTML = (data || []).map(function(m) {
    var bg = m.lu ? 'white' : '#F0F7FF';
    return '<div onclick="openMessage(\'' + m.id + '\')" style="padding:12px 14px;border-bottom:1px solid var(--gris-border);cursor:pointer;background:' + bg + ';transition:.15s" onmouseover="this.style.background=\'#F5F9FF\'" onmouseout="this.style.background=\'' + bg + '\'">' +
      '<div style="display:flex;justify-content:space-between;font-size:12px">' +
      '<strong>' + (m.profiles ? m.profiles.prenom + ' ' + m.profiles.nom : '-') + '</strong>' +
      '<span class="text-muted">' + formatDateTime(m.date_envoi) + '</span>' +
      '</div>' +
      '<div style="font-size:13px;font-weight:' + (m.lu ? 400 : 700) + ';color:#37474F;margin-top:2px">' + (m.sujet || '(Sans sujet)') + '</div>' +
      '<div style="font-size:11.5px;color:#90A4AE;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + ((m.contenu || '').substring(0, 60)) + '...</div>' +
      '</div>';
  }).join('');
}

async function openMessage(id) {
  var res = await supabase.from('messages').select('*, profiles!messages_expediteur_id_fkey(nom, prenom)').eq('id', id).single();
  var data = res.data;
  await db.markMessageRead(id);
  document.getElementById('msg-detail').innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">${data.sujet || '(Sans sujet)'}</div>
        <div class="text-sm text-muted">De : ${data.profiles ? data.profiles.prenom + ' ' + data.profiles.nom : '-'} | ${formatDateTime(data.date_envoi)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openModalMessage('${data.expediteur_id}')">↩ Repondre</button>
    </div>
    <div class="card-body" style="white-space:pre-wrap;line-height:1.6">${data.contenu}</div>`;
  loadMessages();
}

async function openModalMessage(destId) {
  if (!destId) destId = null;
  var res = await supabase.from('profiles').select('id, nom, prenom, role').eq('actif', true);
  var users = res.data;
  document.getElementById('modal-title').textContent = 'Nouveau message';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Destinataire *</label>
      <select class="form-control" id="f-dest">
        <option value="">-- Choisir --</option>
        ${(users || []).filter(function(u) { return u.id !== currentUser.id; })
          .map(function(u) { return '<option value="' + u.id + '"' + (u.id === destId ? ' selected' : '') + '>' + u.prenom + ' ' + u.nom + ' (' + labelRole(u.role) + ')</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Sujet</label>
      <input class="form-control" id="f-sujet" placeholder="Objet du message">
    </div>
    <div class="form-group"><label class="form-label">Message *</label>
      <textarea class="form-control" id="f-contenu" rows="6" placeholder="Votre message..."></textarea>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="sendMsg()">Envoyer</button>`;
  openModal();
}

async function sendMsg() {
  var dest   = document.getElementById('f-dest').value;
  var contenu = document.getElementById('f-contenu').value.trim();
  if (!dest || !contenu) { showToast('Champs obligatoires manquants', 'warning'); return; }
  var res = await db.sendMessage({ destinataire_id: dest, sujet: document.getElementById('f-sujet').value, contenu: contenu });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Message envoye !', 'success'); loadMessages();
}

// ─────────────────────────────────────────────────────────────
// 15. SANCTIONS
// ─────────────────────────────────────────────────────────────
async function loadSanctions() {
  var el = document.getElementById('page-sanctions');
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Sanctions</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">⚠️ Sanctions & Punitions</div>
        <button class="btn btn-primary btn-sm" onclick="openModalAddSanction()">+ Ajouter</button>
      </div>
      <div id="sanctions-table"></div>
    </div>`;
  renderSanctions();
}

async function renderSanctions() {
  var res = await db.getSanctions();
  var data = res.data;
  var el = document.getElementById('sanctions-table');
  if (!el) return;
  el.innerHTML = `
    <div class="table-container">
      <table><thead><tr>
        <th>Eleve</th><th>Classe</th><th>Type</th><th>Motif</th><th>Date</th><th>Executee</th>
      </tr></thead>
      <tbody>${(data || []).map(function(s) { return `
        <tr>
          <td>${s.profiles ? s.profiles.prenom + ' ' + s.profiles.nom : '-'}</td>
          <td>${s.profiles && s.profiles.classes ? s.profiles.classes.nom : '-'}</td>
          <td><span class="badge badge-orange">${s.type}</span></td>
          <td>${s.motif || '-'}</td>
          <td>${formatDate(s.date)}</td>
          <td>${s.executee ? '✅' : '❌'}</td>
        </tr>`;}).join('')}
      </tbody></table>
    </div>`;
}

async function openModalAddSanction() {
  var res = await db.getProfiles({ role: 'acteur', actif: true });
  var eleves = res.data;
  document.getElementById('modal-title').textContent = 'Ajouter une sanction';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Eleve *</label>
      <select class="form-control" id="f-eleve">
        <option value="">-- Choisir --</option>
        ${(eleves || []).map(function(e) { return '<option value="' + e.id + '">' + e.prenom + ' ' + e.nom + '</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Type de sanction *</label>
      <select class="form-control" id="f-type">
        <option>Avertissement</option>
        <option>Retenue</option>
        <option>Exclusion temporaire</option>
        <option>Convocation parents</option>
        <option>Travail supplementaire</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Motif</label>
      <textarea class="form-control" id="f-motif" rows="3" placeholder="Motif de la sanction..."></textarea>
    </div>
    <div class="form-group"><label class="form-label">Date</label>
      <input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}">
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveSanction()">Enregistrer</button>`;
  openModal();
}

async function saveSanction() {
  var eleve_id = document.getElementById('f-eleve').value;
  if (!eleve_id) { showToast('Eleve requis', 'warning'); return; }
  var res = await db.createSanction({ eleve_id: eleve_id, type: document.getElementById('f-type').value, motif: document.getElementById('f-motif').value, date: document.getElementById('f-date').value });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Sanction enregistree !', 'success'); renderSanctions();
}

// ─────────────────────────────────────────────────────────────
// 16. BULLETINS
// ─────────────────────────────────────────────────────────────
async function loadBulletins() {
  var el = document.getElementById('page-bulletins');
  var res = await db.getProfiles({ role: 'acteur', actif: true });
  var eleves = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Bulletins</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📄 Bulletins scolaires</div>
        <div style="display:flex;gap:8px">
          <select class="form-control" id="bul-eleve" style="width:200px">
            <option value="">-- Choisir un eleve --</option>
            ${(eleves || []).map(function(e) { return '<option value="' + e.id + '">' + e.prenom + ' ' + e.nom + '</option>'; }).join('')}
          </select>
          <select class="form-control" id="bul-periode" style="width:130px">
            <option value="T1">Trimestre 1</option>
            <option value="T2">Trimestre 2</option>
            <option value="T3">Trimestre 3</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="genererBulletin()">Generer</button>
        </div>
      </div>
      <div id="bulletin-content" class="card-body">
        <div class="alert alert-info">Selectionnez un eleve et une periode.</div>
      </div>
    </div>`;
}

async function genererBulletin() {
  var eleveId = document.getElementById('bul-eleve').value;
  var periode = document.getElementById('bul-periode').value;
  if (!eleveId) { showToast('Choisissez un eleve', 'warning'); return; }

  var r1 = await supabase.from('profiles').select('*, classes(nom)').eq('id', eleveId).single();
  var r2 = await db.getNotes({ eleve_id: eleveId, periode: periode });
  var r3 = await db.getAbsences({ eleve_id: eleveId });
  var r4 = await db.getAppreciations({ eleve_id: eleveId, periode: periode });
  var eleve = r1.data; var notes = r2.data; var absences = r3.data; var appreciations = r4.data;

  var parMatiere = {};
  (notes || []).forEach(function(n) {
    var m = n.matieres ? n.matieres.nom : 'Inconnue';
    if (!parMatiere[m]) parMatiere[m] = { notes: [], couleur: n.matieres ? n.matieres.couleur : '#1565C0' };
    parMatiere[m].notes.push(n);
  });

  var rows = Object.entries(parMatiere).map(function(entry) {
    var mat = entry[0]; var obj = entry[1]; var ns = obj.notes; var couleur = obj.couleur;
    var moy = ns.reduce(function(s, n) { return s + (n.valeur / n.sur * 20 * n.coefficient); }, 0) / ns.reduce(function(s, n) { return s + n.coefficient; }, 0);
    var appr = (appreciations || []).find(function(a) { return a.matieres && a.matieres.nom === mat; });
    return { mat: mat, moy: moy, nb: ns.length, appr: appr ? appr.appreciation : '-', couleur: couleur };
  });

  var moyGen = rows.length ? rows.reduce(function(s, r) { return s + r.moy; }, 0) / rows.length : null;
  var nbAbs     = (absences || []).filter(function(a) { return a.type === 'absence'; }).length;
  var nbRetards = (absences || []).filter(function(a) { return a.type === 'retard'; }).length;

  document.getElementById('bulletin-content').innerHTML = `
    <div style="max-width:800px;margin:0 auto;font-family:'Open Sans',sans-serif">
      <div style="background:var(--bleu-pronote);color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <div style="font-family:Raleway,sans-serif;font-size:24px;font-weight:800">M13 STUDIO</div>
        <div style="font-size:13px;opacity:.8">Bulletin scolaire — ${periode === 'T1' ? '1er Trimestre' : periode === 'T2' ? '2eme Trimestre' : '3eme Trimestre'} 2024-2025</div>
      </div>
      <div style="background:#F5F9FF;padding:16px 20px;display:flex;justify-content:space-between;border:1px solid #DDE3EA">
        <div><strong>${eleve ? eleve.prenom + ' ' + eleve.nom : '-'}</strong><br>
          <span class="text-muted text-sm">Classe : ${eleve && eleve.classes ? eleve.classes.nom : '-'}</span>
        </div>
        <div style="text-align:right">
          <span class="badge badge-bleu">Absences : ${nbAbs}</span>&nbsp;
          <span class="badge badge-orange">Retards : ${nbRetards}</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #DDE3EA">
        <thead><tr style="background:#EEF2F7">
          <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Matiere</th>
          <th style="padding:10px 14px;text-align:center">Nb notes</th>
          <th style="padding:10px 14px;text-align:center">Moyenne</th>
          <th style="padding:10px 14px;text-align:left">Appreciation</th>
        </tr></thead>
        <tbody>${rows.map(function(r) { return `
          <tr style="border-bottom:1px solid #F0F4F8">
            <td style="padding:10px 14px;border-left:3px solid ${r.couleur || '#1565C0'}"><strong>${r.mat}</strong></td>
            <td style="padding:10px 14px;text-align:center">${r.nb}</td>
            <td style="padding:10px 14px;text-align:center">
              <span style="font-size:18px;font-weight:700;color:${r.moy >= 14 ? '#2E7D32' : r.moy >= 10 ? '#E65100' : '#C62828'}">${r.moy.toFixed(2)}</span>/20
            </td>
            <td style="padding:10px 14px;font-size:12.5px;color:#546E7A">${r.appr}</td>
          </tr>`;}).join('')}
        </tbody>
      </table>
      ${moyGen !== null ? '<div style="background:#E3F2FD;padding:16px 20px;border:1px solid #DDE3EA;display:flex;justify-content:space-between;align-items:center"><strong style="color:#1565C0">Moyenne generale</strong><span style="font-size:24px;font-weight:800;color:' + (moyGen >= 14 ? '#2E7D32' : moyGen >= 10 ? '#E65100' : '#C62828') + '">' + moyGen.toFixed(2) + '/20</span></div>' : ''}
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// 17. GESTION COMPTES (Realisateur)
// ─────────────────────────────────────────────────────────────
async function loadComptes() {
  var el = document.getElementById('page-comptes');
  var res = await supabase.from('profiles').select('*, classes(nom)').order('role').order('nom');
  var data = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Gestion des comptes</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">👥 Tous les comptes</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="openModalAddEleve()">+ Acteur</button>
          <button class="btn btn-secondary btn-sm" onclick="openModalAddProf()">+ Moderateur</button>
        </div>
      </div>
      <div class="table-container">
        <table><thead><tr>
          <th>Role</th><th>Nom</th><th>Prenom</th><th>Identifiant</th>
          <th>Classe</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>${(data || []).map(function(u) { return `
          <tr>
            <td><span class="badge ${u.role === 'realisateur' ? 'badge-violet' : u.role === 'moderateur' ? 'badge-bleu' : 'badge-vert'}">
              ${u.role === 'realisateur' ? '🎬 Realisateur' : u.role === 'moderateur' ? '🎭 Moderateur' : '🎓 Acteur'}
            </span></td>
            <td><strong>${u.nom}</strong></td>
            <td>${u.prenom}</td>
            <td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">${u.identifiant}</code></td>
            <td>${u.classes ? u.classes.nom : '-'}</td>
            <td><span class="badge ${u.actif ? 'badge-vert' : 'badge-rouge'}">${u.actif ? 'Actif' : 'Inactif'}</span></td>
            <td>
              ${u.role === 'acteur' ? '<button class="btn btn-secondary btn-sm" onclick="editEleve(\'' + u.id + '\')">✏️</button>' : ''}
              ${u.id !== currentUser.id ? '<button class="btn btn-danger btn-sm" onclick="desactiverEleve(\'' + u.id + '\')">🗑️</button>' : ''}
            </td>
          </tr>`;}).join('')}
        </tbody></table>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// 18. MATIERES (Realisateur)
// ─────────────────────────────────────────────────────────────
async function loadMatieres() {
  var el = document.getElementById('page-matieres');
  var res = await db.getMatieres();
  var data = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Matieres</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📚 Matieres</div>
        <button class="btn btn-primary btn-sm" onclick="openModalAddMatiere()">+ Ajouter</button>
      </div>
      <div class="table-container">
        <table><thead><tr>
          <th>Nom</th><th>Code</th><th>Couleur</th><th>Coeff.</th><th>Actions</th>
        </tr></thead>
        <tbody>${(data || []).map(function(m) { return `
          <tr>
            <td><span style="display:inline-flex;align-items:center;gap:8px">
              <span style="width:14px;height:14px;border-radius:3px;background:${m.couleur};display:inline-block"></span>
              <strong>${m.nom}</strong>
            </span></td>
            <td><code>${m.code || '-'}</code></td>
            <td>${m.couleur}</td>
            <td>${m.coefficient}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteMatiere('${m.id}')">🗑️</button></td>
          </tr>`;}).join('')}
        </tbody></table>
      </div>
    </div>`;
}

async function openModalAddMatiere() {
  document.getElementById('modal-title').textContent = 'Ajouter une matiere';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Nom *</label>
      <input class="form-control" id="f-nom" placeholder="Ex: Mathematiques">
    </div>
    <div class="form-group"><label class="form-label">Code</label>
      <input class="form-control" id="f-code" placeholder="Ex: MATH">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Couleur</label>
        <input class="form-control" id="f-couleur" type="color" value="#3B82F6">
      </div>
      <div class="form-group"><label class="form-label">Coefficient</label>
        <input class="form-control" id="f-coeff" type="number" value="1" step="0.5">
      </div>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveMatiere()">Ajouter</button>`;
  openModal();
}

async function saveMatiere() {
  var nom = document.getElementById('f-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'warning'); return; }
  var res = await supabase.from('matieres').insert({ nom: nom, code: document.getElementById('f-code').value, couleur: document.getElementById('f-couleur').value, coefficient: document.getElementById('f-coeff').value });
  if (res.error) { showToast(res.error.message, 'danger'); return; }
  closeModal(); showToast('Matiere creee !', 'success'); loadMatieres();
}

async function deleteMatiere(id) {
  if (!confirm('Supprimer cette matiere ?')) return;
  await supabase.from('matieres').update({ actif: false }).eq('id', id);
  showToast('Matiere supprimee', 'success'); loadMatieres();
}

// ─────────────────────────────────────────────────────────────
// 19. VUE ACTEUR — Mes notes
// ─────────────────────────────────────────────────────────────
async function loadMesNotes() {
  var el = document.getElementById('page-monnotes');
  var res = await db.getNotes({ eleve_id: currentUser.id });
  var notes = res.data;

  var parMatiere = {};
  (notes || []).forEach(function(n) {
    var m = n.matieres ? n.matieres.nom : 'Inconnue';
    if (!parMatiere[m]) parMatiere[m] = { notes: [], couleur: n.matieres ? n.matieres.couleur : '#1565C0' };
    parMatiere[m].notes.push(n);
  });

  el.innerHTML = '<div class="breadcrumb">M13 Studio <span>Mes notes</span></div><div class="dashboard-grid">' +
    Object.entries(parMatiere).map(function(entry) {
      var mat = entry[0]; var ns = entry[1].notes; var couleur = entry[1].couleur;
      var moy = ns.reduce(function(s, n) { return s + (n.valeur / n.sur * 20 * n.coefficient); }, 0) / ns.reduce(function(s, n) { return s + n.coefficient; }, 0);
      return '<div class="card"><div class="card-header"><div class="card-title" style="color:' + couleur + '">' + mat + '</div><span class="note-value ' + noteColor(moy) + '">' + moy.toFixed(2) + '/20</span></div>' +
        '<div class="table-container"><table><thead><tr><th>Note</th><th>Intitule</th><th>Date</th></tr></thead><tbody>' +
        ns.map(function(n) { return '<tr><td><span class="note-value ' + noteColor(n.valeur, n.sur) + '">' + n.valeur + '/' + n.sur + '</span></td><td>' + (n.intitule || '-') + '</td><td>' + formatDate(n.date) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    }).join('') + '</div>';
}

// ─────────────────────────────────────────────────────────────
// 20. VUE ACTEUR — Mes absences
// ─────────────────────────────────────────────────────────────
async function loadMesAbsences() {
  var el = document.getElementById('page-monAbsences');
  var res = await db.getAbsences({ eleve_id: currentUser.id });
  var data = res.data;
  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Mes absences</span></div>
    <div class="card">
      <div class="card-header"><div class="card-title">📋 Mes absences et retards</div></div>
      <div class="table-container">
        <table><thead><tr>
          <th>Date</th><th>Type</th><th>Motif</th><th>Justifiee</th>
        </tr></thead>
        <tbody>${(data || []).map(function(a) { return `
          <tr>
            <td>${formatDate(a.date)}</td>
            <td><span class="badge ${a.type === 'absence' ? 'badge-rouge' : a.type === 'retard' ? 'badge-orange' : 'badge-violet'}">${a.type}</span></td>
            <td>${a.motif || '-'}</td>
            <td>${a.justifiee ? '<span class="badge badge-vert">Oui</span>' : '<span class="badge badge-rouge">Non</span>'}</td>
          </tr>`;}).join('')}
        </tbody></table>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// 21. VUE ACTEUR — Tableau de bord personnel
// ─────────────────────────────────────────────────────────────
async function loadMonDashboard() {
  var el = document.getElementById('page-mondashboard');
  var r1 = await db.getNotes({ eleve_id: currentUser.id });
  var r2 = await db.getAbsences({ eleve_id: currentUser.id });
  var r3 = await supabase.from('cahier_textes').select('*, matieres(nom, couleur)')
    .gte('date_remise', new Date().toISOString().split('T')[0]).order('date_remise').limit(5);

  var notes = r1.data; var absences = r2.data; var devoirs = r3.data;
  var moy      = notes && notes.length ? notes.reduce(function(s, n) { return s + (n.valeur / n.sur * 20); }, 0) / notes.length : null;
  var nbAbs    = (absences || []).filter(function(a) { return a.type === 'absence'; }).length;
  var nbRetards = (absences || []).filter(function(a) { return a.type === 'retard'; }).length;

  el.innerHTML = `
    <div class="breadcrumb">M13 Studio <span>Mon tableau de bord</span></div>
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:#E3F2FD">📝</div>
        <div class="stat-info">
          <div class="stat-value ${moy !== null ? noteColor(moy) : ''}">${moy !== null ? moy.toFixed(2) + '/20' : '-'}</div>
          <div class="stat-label">Moyenne generale</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FFEBEE">📋</div>
        <div class="stat-info">
          <div class="stat-value">${nbAbs}</div>
          <div class="stat-label">Absences</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FFF3E0">⏱️</div>
        <div class="stat-info">
          <div class="stat-value">${nbRetards}</div>
          <div class="stat-label">Retards</div>
        </div>
      </div>
    </div>
    <div class="card mt-3">
      <div class="card-header"><div class="card-title">📚 Prochains devoirs</div></div>
      <div class="card-body">
        ${!(devoirs || []).length ? '<div class="alert alert-success">Aucun devoir a rendre prochainement ! 🎉</div>' :
          (devoirs || []).map(function(d) { return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--gris-border)">' +
            '<div style="width:10px;height:10px;border-radius:50%;background:' + (d.matieres ? d.matieres.couleur : '#1565C0') + ';margin-top:4px;flex-shrink:0"></div>' +
            '<div style="flex:1"><div style="font-weight:600;font-size:13px">' + (d.matieres ? d.matieres.nom : '-') + '</div>' +
            '<div style="font-size:12.5px;color:#546E7A;margin-top:2px">' + d.devoirs + '</div></div>' +
            '<div style="font-size:11.5px;color:var(--rouge);font-weight:600;white-space:nowrap">📅 ' + formatDate(d.date_remise) + '</div>' +
            '</div>'; }).join('')}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// 22. MODALE GENERIQUE
// ─────────────────────────────────────────────────────────────
function openModal()  { document.getElementById('generic-modal').classList.add('open');    }
function closeModal() { document.getElementById('generic-modal').classList.remove('open'); }

// =============================================================
// 23. INIT — point d'entree unique, branche sur DOMContentLoaded
// =============================================================
function init() {

  // ── A. Session existante → aller direct dans l'app ────────
  if (loadSession()) {
    initApp();
    return;
  }

  // ── B. Bouton "Se connecter" via addEventListener ─────────
  var btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', function(e) {
      e.preventDefault();
      login();
    });
  }

  // ── C. Touche Entree dans les champs identifiant / mdp ────
  var inputIdent = document.getElementById('login-ident');
  var inputPwd   = document.getElementById('login-pwd');

  if (inputIdent) {
    inputIdent.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (inputPwd) inputPwd.focus();
      }
    });
  }

  if (inputPwd) {
    inputPwd.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        login();
      }
    });
  }

  // ── D. Fermer la modale en cliquant sur l'overlay ────────
  var overlay = document.getElementById('generic-modal');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
  }

  // ── E. Fermer la modale avec la touche Echap ─────────────
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });
}

// Lancement quand le DOM est completement charge
document.addEventListener('DOMContentLoaded', init);

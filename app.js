// =============================================
// M13 STUDIO - Application principale
// =============================================

// =============================================
// NAVIGATION
// =============================================
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  const p = document.getElementById('page-' + page);
  if (p) p.classList.add('active');
  const nav = document.querySelector(`.sidebar-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
  // Charger le contenu de la page
  const loaders = { 
    dashboard: loadDashboard,
    eleves: loadEleves,
    profs: loadProfs,
    classes: loadClasses,
    edt: loadEDT,
    absences: loadAbsences,
    notes: loadNotes,
    cahier: loadCahier,
    messages: loadMessages,
    sanctions: loadSanctions,
    bulletins: loadBulletins,
    comptes: loadComptes,
    matieres: loadMatieres,
    monnotes: loadMesNotes,
    monAbsences: loadMesAbsences,
    mondashboard: loadMonDashboard,
  };
  if (loaders[page]) loaders[page]();
}

// =============================================
// CONNEXION
// =============================================
async function login() {
  const ident = document.getElementById('login-ident').value.trim();
  const pwd = document.getElementById('login-pwd').value;
  const role = document.getElementById('selected-role').value;

  if (!ident || !pwd || !role) {
    showToast('Veuillez remplir tous les champs et choisir un rôle', 'warning');
    return;
  }

  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'Connexion...';

  const { data, error } = await db.getProfileByIdentifiant(ident);
  
  if (error || !data) {
    showToast('Identifiant introuvable', 'danger');
    btn.disabled = false; btn.textContent = 'Se connecter';
    return;
  }

  if (data.mot_de_passe_hash !== pwd) {
    showToast('Mot de passe incorrect', 'danger');
    btn.disabled = false; btn.textContent = 'Se connecter';
    return;
  }

  if (!data.actif) {
    showToast('Ce compte est désactivé', 'danger');
    btn.disabled = false; btn.textContent = 'Se connecter';
    return;
  }

  // Vérifier cohérence rôle
  const roleMap = { acteur: ['acteur'], moderateur: ['moderateur'], realisateur: ['realisateur'] };
  if (!roleMap[role].includes(data.role)) {
    showToast(`Ce compte est de type "${data.role}", pas "${role}"`, 'danger');
    btn.disabled = false; btn.textContent = 'Se connecter';
    return;
  }

  // Mettre à jour dernière connexion
  await supabase.from('profiles').update({ derniere_connexion: new Date().toISOString() }).eq('id', data.id);

  saveSession(data);
  initApp();
}

function logout() {
  clearSession();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-ident').value = '';
  document.getElementById('login-pwd').value = '';
  document.getElementById('selected-role').value = '';
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
}

// =============================================
// INITIALISATION APP
// =============================================
function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  // Afficher infos utilisateur
  document.getElementById('user-name').textContent = `${currentUser.prenom} ${currentUser.nom}`;
  document.getElementById('user-initials').textContent = getInitials(currentUser.nom, currentUser.prenom);
  document.getElementById('user-role-badge').textContent = 
    currentRole === 'realisateur' ? '🎬 Réalisateur' :
    currentRole === 'moderateur' ? '🎭 Modérateur' : '🎓 Acteur';

  // Construire sidebar selon rôle
  buildSidebar();
  
  // Page par défaut
  if (currentRole === 'acteur') navigate('mondashboard');
  else navigate('dashboard');
}

// =============================================
// SIDEBAR DYNAMIQUE SELON RÔLE
// =============================================
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
        <div class="sidebar-section-title">Scolarité</div>
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
          <span class="icon">🎓</span> Acteurs (Élèves)
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
          <span class="icon">📚</span> Matières
        </a>
      </div>`;
    }
  } else {
    // Acteur (élève / prof)
    html += `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Accueil</div>
        <a class="sidebar-item" data-page="mondashboard" onclick="navigate('mondashboard')">
          <span class="icon">🏠</span> Mon tableau de bord
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Ma scolarité</div>
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

    // Si acteur qui dirige des cours (peut saisir notes/absences)
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

// =============================================
// DASHBOARD ADMIN/MODO
// =============================================
async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Tableau de bord</span></div>
    <div id="stats-grid" class="dashboard-grid"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div id="card-recent-absences"></div>
      <div id="card-recent-notes"></div>
    </div>`;

  // Stats
  const [{ data: eleves }, { data: profs }, { data: classes }, { data: absences }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'acteur').eq('actif', true),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'moderateur').eq('actif', true),
    supabase.from('classes').select('id', { count: 'exact' }).eq('actif', true),
    supabase.from('absences').select('id', { count: 'exact' }).gte('date', new Date().toISOString().split('T')[0])
  ]);

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:#E3F2FD">🎓</div>
      <div class="stat-info">
        <div class="stat-value">${eleves?.length || 0}</div>
        <div class="stat-label">Acteurs (Élèves)</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#E8F5E9">👨‍🏫</div>
      <div class="stat-info">
        <div class="stat-value">${profs?.length || 0}</div>
        <div class="stat-label">Enseignants</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#FFF3E0">🏫</div>
      <div class="stat-info">
        <div class="stat-value">${classes?.length || 0}</div>
        <div class="stat-label">Classes actives</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#FFEBEE">📋</div>
      <div class="stat-info">
        <div class="stat-value">${absences?.length || 0}</div>
        <div class="stat-label">Absences aujourd'hui</div>
      </div>
    </div>`;

  // Dernières absences
  const { data: recAbsences } = await db.getAbsences();
  document.getElementById('card-recent-absences').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">📋 Dernières absences</div></div>
      <div class="table-container">
        <table><thead><tr><th>Élève</th><th>Date</th><th>Type</th><th>Justif.</th></tr></thead>
        <tbody>${(recAbsences||[]).slice(0,8).map(a => `
          <tr>
            <td>${a.profiles?.prenom} ${a.profiles?.nom}</td>
            <td>${formatDate(a.date)}</td>
            <td><span class="badge ${a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet'}">${a.type}</span></td>
            <td>${a.justifiee ? '✅' : '❌'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;

  // Dernières notes
  const { data: recNotes } = await db.getNotes();
  document.getElementById('card-recent-notes').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">📝 Dernières notes</div></div>
      <div class="table-container">
        <table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th><th>Date</th></tr></thead>
        <tbody>${(recNotes||[]).slice(0,8).map(n => `
          <tr>
            <td>${n.profiles?.prenom} ${n.profiles?.nom}</td>
            <td>${n.matieres?.nom}</td>
            <td><span class="note-value ${noteColor(n.valeur, n.sur)}">${n.valeur}/${n.sur}</span></td>
            <td>${formatDate(n.date)}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

// =============================================
// GESTION ÉLÈVES
// =============================================
async function loadEleves() {
  const el = document.getElementById('page-eleves');
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Acteurs (Élèves)</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">🎓 Liste des Acteurs</div>
        <div style="display:flex;gap:8px">
          <input class="form-control" id="search-eleves" placeholder="Rechercher..." style="width:200px" oninput="filterEleves()">
          ${currentRole==='realisateur'?`<button class="btn btn-primary btn-sm" onclick="openModalAddEleve()">+ Ajouter</button>`:''}
        </div>
      </div>
      <div class="table-container" id="table-eleves"></div>
    </div>`;
  
  await renderEleves();
}

async function renderEleves(search = '') {
  const { data } = await db.getProfiles({ role: 'acteur' });
  const filtered = (data || []).filter(e => 
    !search || `${e.prenom} ${e.nom} ${e.identifiant}`.toLowerCase().includes(search.toLowerCase())
  );

  document.getElementById('table-eleves').innerHTML = `
    <table><thead><tr>
      <th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe</th><th>Statut</th>
      ${currentRole==='realisateur'?'<th>Actions</th>':''}
    </tr></thead>
    <tbody>${filtered.map(e => `
      <tr>
        <td><strong>${e.nom}</strong></td>
        <td>${e.prenom}</td>
        <td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">${e.identifiant}</code></td>
        <td>${e.classes?.nom || '-'}</td>
        <td><span class="badge ${e.actif?'badge-vert':'badge-rouge'}">${e.actif?'Actif':'Inactif'}</span></td>
        ${currentRole==='realisateur'?`<td>
          <button class="btn btn-secondary btn-sm" onclick="editEleve('${e.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="desactiverEleve('${e.id}')">🗑️</button>
        </td>`:''}
      </tr>`).join('')}
    </tbody></table>`;
}

function filterEleves() {
  renderEleves(document.getElementById('search-eleves').value);
}

async function openModalAddEleve(id = null) {
  const { data: classes } = await db.getClasses();
  const user = id ? (await supabase.from('profiles').select('*').eq('id', id).single()).data : null;

  document.getElementById('modal-title').textContent = id ? 'Modifier acteur' : 'Ajouter un acteur';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Nom *</label>
      <input class="form-control" id="f-nom" value="${user?.nom||''}" placeholder="Nom de famille">
    </div>
    <div class="form-group">
      <label class="form-label">Prénom *</label>
      <input class="form-control" id="f-prenom" value="${user?.prenom||''}" placeholder="Prénom">
    </div>
    <div class="form-group">
      <label class="form-label">Identifiant *</label>
      <input class="form-control" id="f-ident" value="${user?.identifiant||''}" placeholder="Ex: dupont.thomas">
    </div>
    <div class="form-group">
      <label class="form-label">Mot de passe *</label>
      <input class="form-control" id="f-pwd" type="password" placeholder="${id?'Laisser vide pour ne pas changer':'Mot de passe'}">
    </div>
    <div class="form-group">
      <label class="form-label">Classe</label>
      <select class="form-control" id="f-classe">
        <option value="">-- Aucune --</option>
        ${(classes||[]).map(c => `<option value="${c.id}" ${user?.classe_id===c.id?'selected':''}>${c.nom}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-control" id="f-email" value="${user?.email||''}" placeholder="email@exemple.com">
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="f-dirige" ${user?.dirige_cours?'checked':''}>
      <label for="f-dirige" class="form-label" style="margin:0">Dirige des cours (peut saisir notes/absences)</label>
    </div>`;

  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveEleve('${id||''}')">Enregistrer</button>`;
  openModal();
}

async function saveEleve(id) {
  const nom = document.getElementById('f-nom').value.trim();
  const prenom = document.getElementById('f-prenom').value.trim();
  const identifiant = document.getElementById('f-ident').value.trim();
  const pwd = document.getElementById('f-pwd').value;
  const classe_id = document.getElementById('f-classe').value || null;
  const email = document.getElementById('f-email').value.trim();
  const dirige_cours = document.getElementById('f-dirige').checked;

  if (!nom || !prenom || !identifiant) { showToast('Champs obligatoires manquants', 'warning'); return; }

  const data = { nom, prenom, identifiant, classe_id, email, role: 'acteur', dirige_cours };
  if (pwd) data.mot_de_passe_hash = pwd;

  if (id) {
    const { error } = await db.updateProfile(id, data);
    if (error) { showToast('Erreur: ' + error.message, 'danger'); return; }
  } else {
    if (!pwd) { showToast('Mot de passe requis', 'warning'); return; }
    const { error } = await db.createProfile({ ...data, actif: true });
    if (error) { showToast('Erreur: ' + error.message, 'danger'); return; }
  }

  closeModal(); showToast('Acteur enregistré !', 'success'); loadEleves();
}

async function editEleve(id) { openModalAddEleve(id); }

async function desactiverEleve(id) {
  if (!confirm('Désactiver ce compte ?')) return;
  await db.deleteProfile(id);
  showToast('Compte désactivé', 'success');
  loadEleves();
}

// =============================================
// PROFS
// =============================================
async function loadProfs() {
  const el = document.getElementById('page-profs');
  const { data } = await db.getProfiles({ role: 'moderateur' });
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Enseignants</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">👨‍🏫 Enseignants / Modérateurs</div>
        ${currentRole==='realisateur'?`<button class="btn btn-primary btn-sm" onclick="openModalAddProf()">+ Ajouter</button>`:''}
      </div>
      <div class="table-container">
        <table><thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Statut</th>
        ${currentRole==='realisateur'?'<th>Actions</th>':''}
        </tr></thead>
        <tbody>${(data||[]).map(p => `
          <tr>
            <td><strong>${p.nom}</strong></td><td>${p.prenom}</td>
            <td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">${p.identifiant}</code></td>
            <td><span class="badge ${p.actif?'badge-vert':'badge-rouge'}">${p.actif?'Actif':'Inactif'}</span></td>
            ${currentRole==='realisateur'?`<td>
              <button class="btn btn-danger btn-sm" onclick="desactiverEleve('${p.id}')">🗑️</button>
            </td>`:''}
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

async function openModalAddProf() {
  document.getElementById('modal-title').textContent = 'Ajouter un modérateur';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom" placeholder="Nom"></div>
    <div class="form-group"><label class="form-label">Prénom *</label><input class="form-control" id="f-prenom" placeholder="Prénom"></div>
    <div class="form-group"><label class="form-label">Identifiant *</label><input class="form-control" id="f-ident" placeholder="Identifiant"></div>
    <div class="form-group"><label class="form-label">Mot de passe *</label><input class="form-control" id="f-pwd" type="password" placeholder="Mot de passe"></div>
    <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="f-email" placeholder="email@exemple.com"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveProf()">Enregistrer</button>`;
  openModal();
}

async function saveProf() {
  const nom = document.getElementById('f-nom').value.trim();
  const prenom = document.getElementById('f-prenom').value.trim();
  const identifiant = document.getElementById('f-ident').value.trim();
  const pwd = document.getElementById('f-pwd').value;
  if (!nom || !prenom || !identifiant || !pwd) { showToast('Champs obligatoires manquants', 'warning'); return; }
  const { error } = await db.createProfile({ nom, prenom, identifiant, mot_de_passe_hash: pwd, role: 'moderateur', actif: true });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Modérateur créé !', 'success'); loadProfs();
}

// =============================================
// CLASSES
// =============================================
async function loadClasses() {
  const el = document.getElementById('page-classes');
  const { data } = await db.getClasses();
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Classes</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">🏫 Classes</div>
        ${currentRole!=='acteur'?`<button class="btn btn-primary btn-sm" onclick="openModalAddClasse()">+ Créer une classe</button>`:''}
      </div>
      <div class="table-container">
        <table><thead><tr><th>Nom</th><th>Niveau</th><th>Année</th><th>Statut</th></tr></thead>
        <tbody>${(data||[]).map(c=>`
          <tr>
            <td><strong>${c.nom}</strong></td>
            <td>${c.niveau||'-'}</td>
            <td>${c.annee_scolaire}</td>
            <td><span class="badge badge-vert">Active</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

async function openModalAddClasse() {
  document.getElementById('modal-title').textContent = 'Créer une classe';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Nom de la classe *</label><input class="form-control" id="f-nom" placeholder="Ex: 3ème A, Terminale B..."></div>
    <div class="form-group"><label class="form-label">Niveau</label><input class="form-control" id="f-niveau" placeholder="Ex: 3ème, Terminale..."></div>
    <div class="form-group"><label class="form-label">Année scolaire</label><input class="form-control" id="f-annee" value="2024-2025"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveClasse()">Créer</button>`;
  openModal();
}

async function saveClasse() {
  const nom = document.getElementById('f-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'warning'); return; }
  const { error } = await db.createClasse({ nom, niveau: document.getElementById('f-niveau').value, annee_scolaire: document.getElementById('f-annee').value });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Classe créée !', 'success'); loadClasses();
}

// =============================================
// EMPLOI DU TEMPS
// =============================================
async function loadEDT() {
  const el = document.getElementById('page-edt');
  const { data: classes } = await db.getClasses();
  
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Emploi du temps</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📅 Emploi du temps</div>
        <div style="display:flex;gap:8px;align-items:center">
          <select class="form-control" id="edt-classe" onchange="renderEDT()" style="width:160px">
            <option value="">-- Choisir classe --</option>
            ${(classes||[]).map(c=>`<option value="${c.id}">${c.nom}</option>`).join('')}
          </select>
          ${currentRole!=='acteur'?`<button class="btn btn-primary btn-sm" onclick="openModalAddCreneau()">+ Ajouter</button>`:''}
        </div>
      </div>
      <div class="card-body" id="edt-content">
        <div class="alert alert-info">Sélectionnez une classe pour voir l'emploi du temps.</div>
      </div>
    </div>`;
}

async function renderEDT() {
  const classeId = document.getElementById('edt-classe').value;
  if (!classeId) return;
  
  const { data } = await db.getEDT(classeId);
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const heures = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

  let html = `<div class="edt-grid" style="min-width:700px">
    <div class="edt-header">Horaire</div>
    ${jours.map(j=>`<div class="edt-header">${j}</div>`).join('')}`;

  heures.forEach((h, i) => {
    if (i < heures.length - 1) {
      html += `<div class="edt-time">${h}<br><span style="color:#B0BEC5;font-size:10px">${heures[i+1]}</span></div>`;
      jours.forEach(jour => {
        const cours = (data||[]).filter(c => 
          c.jour === jour && c.heure_debut <= h && c.heure_fin > h
        );
        if (cours.length) {
          const c = cours[0];
          html += `<div class="edt-cell">
            <div class="edt-cours" style="background:${c.matieres?.couleur}22;border-left:3px solid ${c.matieres?.couleur};color:${c.matieres?.couleur}">
              <div>${c.matieres?.nom}</div>
              <div style="font-size:10px;font-weight:400;opacity:0.8">${c.profiles?.prenom||''} ${c.profiles?.nom||''}</div>
              <div style="font-size:10px;font-weight:400">${c.salle||''}</div>
            </div>
          </div>`;
        } else {
          html += `<div class="edt-cell"></div>`;
        }
      });
    }
  });

  html += `</div>`;
  document.getElementById('edt-content').innerHTML = html;
}

async function openModalAddCreneau() {
  const [{ data: classes }, { data: matieres }, { data: profs }] = await Promise.all([
    db.getClasses(), db.getMatieres(),
    supabase.from('profiles').select('*').in('role', ['moderateur', 'acteur']).eq('actif', true).eq('dirige_cours', true)
  ]);

  document.getElementById('modal-title').textContent = 'Ajouter un créneau';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Classe *</label>
      <select class="form-control" id="f-classe">
        ${(classes||[]).map(c=>`<option value="${c.id}">${c.nom}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Matière *</label>
      <select class="form-control" id="f-matiere">
        ${(matieres||[]).map(m=>`<option value="${m.id}">${m.nom}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Enseignant</label>
      <select class="form-control" id="f-prof">
        <option value="">-- Aucun --</option>
        ${(profs||[]).map(p=>`<option value="${p.id}">${p.prenom} ${p.nom}</option>`).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Jour *</label>
        <select class="form-control" id="f-jour">
          ${['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map(j=>`<option value="${j}">${j}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Salle</label>
        <input class="form-control" id="f-salle" placeholder="Salle 101">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Début *</label>
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
  const data = {
    classe_id: document.getElementById('f-classe').value,
    matiere_id: document.getElementById('f-matiere').value,
    professeur_id: document.getElementById('f-prof').value || null,
    jour: document.getElementById('f-jour').value,
    heure_debut: document.getElementById('f-hdebut').value,
    heure_fin: document.getElementById('f-hfin').value,
    salle: document.getElementById('f-salle').value
  };
  const { error } = await db.createCreneauEDT(data);
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Créneau ajouté !', 'success');
  await renderEDT();
}

// =============================================
// ABSENCES
// =============================================
async function loadAbsences() {
  const el = document.getElementById('page-absences');
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Absences / Retards</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Absences & Retards</div>
        <div style="display:flex;gap:8px">
          <input class="form-control" id="abs-date" type="date" value="${new Date().toISOString().split('T')[0]}" onchange="renderAbsences()" style="width:160px">
          <button class="btn btn-primary btn-sm" onclick="openModalAddAbsence()">+ Saisir</button>
        </div>
      </div>
      <div id="abs-table"></div>
    </div>`;
  renderAbsences();
}

async function renderAbsences() {
  const date = document.getElementById('abs-date')?.value;
  const { data } = await db.getAbsences(date ? { date } : {});
  
  document.getElementById('abs-table').innerHTML = `
    <div class="table-container">
      <table><thead><tr><th>Élève</th><th>Classe</th><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th><th>Actions</th></tr></thead>
      <tbody>${(data||[]).map(a=>`
        <tr>
          <td><strong>${a.profiles?.prenom} ${a.profiles?.nom}</strong></td>
          <td>${a.profiles?.classes?.nom||'-'}</td>
          <td>${formatDate(a.date)}</td>
          <td><span class="badge ${a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet'}">${a.type}</span></td>
          <td>${a.motif||'-'}</td>
          <td>
            <button class="btn btn-sm ${a.justifiee?'btn-success':'btn-secondary'}" onclick="toggleJustif('${a.id}',${!a.justifiee})">
              ${a.justifiee?'✅ Oui':'❌ Non'}
            </button>
          </td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteAbsence('${a.id}')">🗑️</button></td>
        </tr>`).join('')}
      </tbody></table>
    </div>`;
}

async function openModalAddAbsence() {
  const { data: eleves } = await db.getProfiles({ role: 'acteur', actif: true });
  document.getElementById('modal-title').textContent = 'Saisir une absence / retard';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Élève *</label>
      <select class="form-control" id="f-eleve">
        <option value="">-- Choisir --</option>
        ${(eleves||[]).map(e=>`<option value="${e.id}">${e.prenom} ${e.nom}</option>`).join('')}
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
      <div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-hdebut" type="time"></div>
      <div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-hfin" type="time"></div>
    </div>
    <div class="form-group"><label class="form-label">Motif</label><textarea class="form-control" id="f-motif" rows="2" placeholder="Motif..."></textarea></div>
    <div class="form-group" style="display:flex;gap:8px;align-items:center">
      <input type="checkbox" id="f-justif">
      <label for="f-justif" class="form-label" style="margin:0">Justifiée</label>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveAbsence()">Enregistrer</button>`;
  openModal();
}

async function saveAbsence() {
  const eleve_id = document.getElementById('f-eleve').value;
  const date = document.getElementById('f-date').value;
  if (!eleve_id || !date) { showToast('Champs obligatoires manquants', 'warning'); return; }
  const { error } = await db.createAbsence({
    eleve_id, date,
    type: document.getElementById('f-type').value,
    heure_debut: document.getElementById('f-hdebut').value || null,
    heure_fin: document.getElementById('f-hfin').value || null,
    motif: document.getElementById('f-motif').value,
    justifiee: document.getElementById('f-justif').checked
  });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Absence enregistrée !', 'success'); renderAbsences();
}

async function toggleJustif(id, val) {
  await db.updateAbsence(id, { justifiee: val });
  renderAbsences();
}

async function deleteAbsence(id) {
  if (!confirm('Supprimer cette absence ?')) return;
  await supabase.from('absences').delete().eq('id', id);
  showToast('Supprimé', 'success'); renderAbsences();
}

// =============================================
// NOTES
// =============================================
async function loadNotes() {
  const el = document.getElementById('page-notes');
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Notes</span></div>
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

async function renderNotes(periode = 'T1') {
  const { data } = await db.getNotes({ periode });
  document.getElementById('notes-table').innerHTML = `
    <div class="table-container">
      <table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th><th>Intitulé</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${(data||[]).map(n=>`
        <tr>
          <td>${n.profiles?.prenom} ${n.profiles?.nom}</td>
          <td><span class="badge" style="background:${n.matieres?.couleur}22;color:${n.matieres?.couleur}">${n.matieres?.nom}</span></td>
          <td><span class="note-value ${noteColor(n.valeur,n.sur)}">${n.valeur}/${n.sur}</span></td>
          <td>${n.intitule||'-'}</td>
          <td>${formatDate(n.date)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteNote('${n.id}')">🗑️</button></td>
        </tr>`).join('')}
      </tbody></table>
    </div>`;
}

function switchPeriode(p, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderNotes(p);
}

async function openModalAddNote() {
  const [{ data: eleves }, { data: matieres }] = await Promise.all([
    db.getProfiles({ role: 'acteur', actif: true }), db.getMatieres()
  ]);
  document.getElementById('modal-title').textContent = 'Ajouter une note';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Élève *</label>
      <select class="form-control" id="f-eleve">
        <option value="">-- Choisir --</option>
        ${(eleves||[]).map(e=>`<option value="${e.id}">${e.prenom} ${e.nom}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Matière *</label>
      <select class="form-control" id="f-matiere">
        ${(matieres||[]).map(m=>`<option value="${m.id}">${m.nom}</option>`).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Note *</label><input class="form-control" id="f-note" type="number" min="0" max="20" step="0.5" value="10"></div>
      <div class="form-group"><label class="form-label">Sur</label><input class="form-control" id="f-sur" type="number" value="20"></div>
      <div class="form-group"><label class="form-label">Coeff.</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div>
    </div>
    <div class="form-group"><label class="form-label">Intitulé</label><input class="form-control" id="f-intitule" placeholder="Ex: Contrôle de mathématiques"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Période</label>
        <select class="form-control" id="f-periode">
          <option value="T1">Trimestre 1</option><option value="T2">Trimestre 2</option><option value="T3">Trimestre 3</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Commentaire</label><textarea class="form-control" id="f-comment" rows="2"></textarea></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveNote()">Enregistrer</button>`;
  openModal();
}

async function saveNote() {
  const eleve_id = document.getElementById('f-eleve').value;
  const matiere_id = document.getElementById('f-matiere').value;
  const valeur = parseFloat(document.getElementById('f-note').value);
  if (!eleve_id || !matiere_id || isNaN(valeur)) { showToast('Champs obligatoires manquants', 'warning'); return; }
  const { error } = await db.createNote({
    eleve_id, matiere_id, valeur,
    sur: parseFloat(document.getElementById('f-sur').value) || 20,
    coefficient: parseFloat(document.getElementById('f-coeff').value) || 1,
    intitule: document.getElementById('f-intitule').value,
    date: document.getElementById('f-date').value,
    periode: document.getElementById('f-periode').value,
    commentaire: document.getElementById('f-comment').value
  });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Note enregistrée !', 'success'); renderNotes();
}

async function deleteNote(id) {
  if (!confirm('Supprimer cette note ?')) return;
  await db.deleteNote(id);
  showToast('Note supprimée', 'success'); renderNotes();
}

// =============================================
// CAHIER DE TEXTES
// =============================================
async function loadCahier() {
  const el = document.getElementById('page-cahier');
  const { data: classes } = await db.getClasses();
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Cahier de textes</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📖 Cahier de textes</div>
        <div style="display:flex;gap:8px">
          <select class="form-control" id="cahier-classe" onchange="renderCahier()" style="width:160px">
            <option value="">-- Toutes classes --</option>
            ${(classes||[]).map(c=>`<option value="${c.id}">${c.nom}</option>`).join('')}
          </select>
          ${currentRole!=='acteur'||currentUser?.dirige_cours?`<button class="btn btn-primary btn-sm" onclick="openModalAddCahier()">+ Ajouter</button>`:''}
        </div>
      </div>
      <div id="cahier-list" class="card-body"></div>
    </div>`;
  renderCahier();
}

async function renderCahier() {
  const classeId = document.getElementById('cahier-classe')?.value;
  const { data } = await db.getCahier(classeId ? { classe_id: classeId } : {});
  document.getElementById('cahier-list').innerHTML = (data||[]).length === 0 ?
    '<div class="alert alert-info">Aucune entrée.</div>' :
    (data||[]).map(e=>`
      <div style="border:1px solid var(--gris-border);border-radius:6px;padding:14px;margin-bottom:12px;border-left:4px solid ${e.matieres?.couleur||'#1565C0'}">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700;color:${e.matieres?.couleur||'#1565C0'}">${e.matieres?.nom||'?'}</span>
          <span class="text-muted text-sm">${formatDate(e.date)} | ${e.classes?.nom||'-'} | ${e.profiles?.prenom||''} ${e.profiles?.nom||''}</span>
        </div>
        ${e.contenu_cours?`<div style="margin-bottom:8px"><strong style="font-size:12px;color:#546E7A">📚 Cours :</strong><div style="margin-top:4px;font-size:13px">${e.contenu_cours}</div></div>`:''}
        ${e.devoirs?`<div><strong style="font-size:12px;color:#546E7A">📝 Devoirs :</strong><div style="margin-top:4px;font-size:13px">${e.devoirs}</div>
        ${e.date_remise?`<div class="text-sm text-muted mt-1">📅 À rendre le ${formatDate(e.date_remise)}</div>`:''}</div>`:''}
      </div>`).join('');
}

async function openModalAddCahier() {
  const [{ data: classes }, { data: matieres }] = await Promise.all([db.getClasses(), db.getMatieres()]);
  document.getElementById('modal-title').textContent = 'Ajouter au cahier de textes';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Classe *</label>
        <select class="form-control" id="f-classe">${(classes||[]).map(c=>`<option value="${c.id}">${c.nom}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Matière *</label>
        <select class="form-control" id="f-matiere">${(matieres||[]).map(m=>`<option value="${m.id}">${m.nom}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    <div class="form-group"><label class="form-label">Contenu du cours</label><textarea class="form-control" id="f-contenu" rows="3" placeholder="Résumé du cours..."></textarea></div>
    <div class="form-group"><label class="form-label">Devoirs</label><textarea class="form-control" id="f-devoirs" rows="3" placeholder="Travail à faire..."></textarea></div>
    <div class="form-group"><label class="form-label">Date de remise</label><input class="form-control" id="f-remise" type="date"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveCahier()">Enregistrer</button>`;
  openModal();
}

async function saveCahier() {
  const { error } = await db.createEntreeCahier({
    classe_id: document.getElementById('f-classe').value,
    matiere_id: document.getElementById('f-matiere').value,
    date: document.getElementById('f-date').value,
    contenu_cours: document.getElementById('f-contenu').value,
    devoirs: document.getElementById('f-devoirs').value,
    date_remise: document.getElementById('f-remise').value || null
  });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Entrée ajoutée !', 'success'); renderCahier();
}

// =============================================
// MESSAGERIE
// =============================================
async function loadMessages() {
  const el = document.getElementById('page-messages');
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Messagerie</span></div>
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
          Sélectionnez un message
        </div>
      </div>
    </div>`;
  
  const { data } = await db.getMessages(currentUser.id);
  document.getElementById('msg-list').innerHTML = (data||[]).map(m=>`
    <div onclick="openMessage('${m.id}')" style="padding:12px 14px;border-bottom:1px solid var(--gris-border);cursor:pointer;
      background:${m.lu?'white':'#F0F7FF'};transition:.15s" onmouseover="this.style.background='#F5F9FF'" onmouseout="this.style.background='${m.lu?'white':'#F0F7FF'}'">
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <strong>${m.profiles?.prenom} ${m.profiles?.nom}</strong>
        <span class="text-muted">${formatDateTime(m.date_envoi)}</span>
      </div>
      <div style="font-size:13px;font-weight:${m.lu?400:700};color:#37474F;margin-top:2px">${m.sujet||'(Sans sujet)'}</div>
      <div style="font-size:11.5px;color:#90A4AE;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${m.contenu?.substring(0,60)}...</div>
    </div>`).join('');
}

async function openMessage(id) {
  const { data } = await supabase.from('messages').select('*, profiles!messages_expediteur_id_fkey(nom, prenom)').eq('id', id).single();
  await db.markMessageRead(id);
  document.getElementById('msg-detail').innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">${data.sujet||'(Sans sujet)'}</div>
        <div class="text-sm text-muted">De : ${data.profiles?.prenom} ${data.profiles?.nom} | ${formatDateTime(data.date_envoi)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openModalMessage('${data.expediteur_id}')">↩ Répondre</button>
    </div>
    <div class="card-body" style="white-space:pre-wrap;line-height:1.6">${data.contenu}</div>`;
  loadMessages();
}

async function openModalMessage(destId = null) {
  const { data: users } = await supabase.from('profiles').select('id, nom, prenom, role').eq('actif', true);
  document.getElementById('modal-title').textContent = 'Nouveau message';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Destinataire *</label>
      <select class="form-control" id="f-dest">
        <option value="">-- Choisir --</option>
        ${(users||[]).filter(u=>u.id!==currentUser.id).map(u=>`<option value="${u.id}" ${u.id===destId?'selected':''}>${u.prenom} ${u.nom} (${u.role})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Sujet</label><input class="form-control" id="f-sujet" placeholder="Objet du message"></div>
    <div class="form-group"><label class="form-label">Message *</label><textarea class="form-control" id="f-contenu" rows="6" placeholder="Votre message..."></textarea></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="sendMsg()">Envoyer</button>`;
  openModal();
}

async function sendMsg() {
  const dest = document.getElementById('f-dest').value;
  const contenu = document.getElementById('f-contenu').value.trim();
  if (!dest || !contenu) { showToast('Champs obligatoires manquants', 'warning'); return; }
  const { error } = await db.sendMessage({
    destinataire_id: dest,
    sujet: document.getElementById('f-sujet').value,
    contenu
  });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Message envoyé !', 'success'); loadMessages();
}

// =============================================
// SANCTIONS
// =============================================
async function loadSanctions() {
  const el = document.getElementById('page-sanctions');
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Sanctions</span></div>
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
  const { data } = await db.getSanctions();
  document.getElementById('sanctions-table').innerHTML = `
    <div class="table-container">
      <table><thead><tr><th>Élève</th><th>Classe</th><th>Type</th><th>Motif</th><th>Date</th><th>Exécutée</th></tr></thead>
      <tbody>${(data||[]).map(s=>`
        <tr>
          <td>${s.profiles?.prenom} ${s.profiles?.nom}</td>
          <td>${s.profiles?.classes?.nom||'-'}</td>
          <td><span class="badge badge-orange">${s.type}</span></td>
          <td>${s.motif||'-'}</td>
          <td>${formatDate(s.date)}</td>
          <td>${s.executee?'✅':'❌'}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>`;
}

async function openModalAddSanction() {
  const { data: eleves } = await db.getProfiles({ role: 'acteur', actif: true });
  document.getElementById('modal-title').textContent = 'Ajouter une sanction';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Élève *</label>
      <select class="form-control" id="f-eleve">
        <option value="">-- Choisir --</option>
        ${(eleves||[]).map(e=>`<option value="${e.id}">${e.prenom} ${e.nom}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Type de sanction *</label>
      <select class="form-control" id="f-type">
        <option>Avertissement</option><option>Retenue</option><option>Exclusion temporaire</option>
        <option>Convocation parents</option><option>Travail supplémentaire</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Motif</label><textarea class="form-control" id="f-motif" rows="3" placeholder="Motif de la sanction..."></textarea></div>
    <div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveSanction()">Enregistrer</button>`;
  openModal();
}

async function saveSanction() {
  const eleve_id = document.getElementById('f-eleve').value;
  if (!eleve_id) { showToast('Élève requis', 'warning'); return; }
  const { error } = await db.createSanction({
    eleve_id, type: document.getElementById('f-type').value,
    motif: document.getElementById('f-motif').value,
    date: document.getElementById('f-date').value
  });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Sanction enregistrée !', 'success'); renderSanctions();
}

// =============================================
// BULLETINS
// =============================================
async function loadBulletins() {
  const el = document.getElementById('page-bulletins');
  const { data: eleves } = await db.getProfiles({ role: 'acteur', actif: true });
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Bulletins</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📄 Bulletins scolaires</div>
        <div style="display:flex;gap:8px">
          <select class="form-control" id="bul-eleve" style="width:200px">
            <option value="">-- Choisir un élève --</option>
            ${(eleves||[]).map(e=>`<option value="${e.id}">${e.prenom} ${e.nom}</option>`).join('')}
          </select>
          <select class="form-control" id="bul-periode" style="width:130px">
            <option value="T1">Trimestre 1</option>
            <option value="T2">Trimestre 2</option>
            <option value="T3">Trimestre 3</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="genererBulletin()">Générer</button>
        </div>
      </div>
      <div id="bulletin-content" class="card-body">
        <div class="alert alert-info">Sélectionnez un élève et une période.</div>
      </div>
    </div>`;
}

async function genererBulletin() {
  const eleveId = document.getElementById('bul-eleve').value;
  const periode = document.getElementById('bul-periode').value;
  if (!eleveId) { showToast('Choisissez un élève', 'warning'); return; }

  const [{ data: eleve }, { data: notes }, { data: absences }, { data: appreciations }] = await Promise.all([
    supabase.from('profiles').select('*, classes(nom)').eq('id', eleveId).single(),
    db.getNotes({ eleve_id: eleveId, periode }),
    db.getAbsences({ eleve_id: eleveId }),
    db.getAppreciations({ eleve_id: eleveId, periode })
  ]);

  // Calculer moyennes par matière
  const parMatiere = {};
  (notes||[]).forEach(n => {
    const m = n.matieres?.nom;
    if (!parMatiere[m]) parMatiere[m] = { notes: [], couleur: n.matieres?.couleur };
    parMatiere[m].notes.push(n);
  });

  const rows = Object.entries(parMatiere).map(([mat, { notes: ns, couleur }]) => {
    const moy = ns.reduce((s, n) => s + (n.valeur / n.sur * 20 * n.coefficient), 0) / ns.reduce((s, n) => s + n.coefficient, 0);
    const appr = appreciations?.find(a => a.matieres?.nom === mat);
    return { mat, moy, nb: ns.length, appr: appr?.appreciation || '-', couleur };
  });

  const moyGen = rows.length ? rows.reduce((s, r) => s + r.moy, 0) / rows.length : null;
  const nbAbs = (absences||[]).filter(a => a.type === 'absence').length;
  const nbRetards = (absences||[]).filter(a => a.type === 'retard').length;

  document.getElementById('bulletin-content').innerHTML = `
    <div style="max-width:800px;margin:0 auto;font-family:'Open Sans',sans-serif">
      <div style="background:var(--bleu-pronote);color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <div style="font-family:Raleway,sans-serif;font-size:24px;font-weight:800">M13 STUDIO</div>
        <div style="font-size:13px;opacity:0.8">Bulletin scolaire — ${periode==='T1'?'1er Trimestre':periode==='T2'?'2ème Trimestre':'3ème Trimestre'} 2024-2025</div>
      </div>
      <div style="background:#F5F9FF;padding:16px 20px;display:flex;justify-content:space-between;border:1px solid #DDE3EA">
        <div><strong>${eleve?.prenom} ${eleve?.nom}</strong><br><span class="text-muted text-sm">Classe : ${eleve?.classes?.nom||'-'}</span></div>
        <div style="text-align:right">
          <span class="badge badge-bleu">Absences : ${nbAbs}</span>&nbsp;
          <span class="badge badge-orange">Retards : ${nbRetards}</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #DDE3EA">
        <thead><tr style="background:#EEF2F7">
          <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Matière</th>
          <th style="padding:10px 14px;text-align:center">Nb notes</th>
          <th style="padding:10px 14px;text-align:center">Moyenne</th>
          <th style="padding:10px 14px;text-align:left">Appréciation</th>
        </tr></thead>
        <tbody>${rows.map(r=>`
          <tr style="border-bottom:1px solid #F0F4F8">
            <td style="padding:10px 14px;border-left:3px solid ${r.couleur||'#1565C0'}"><strong>${r.mat}</strong></td>
            <td style="padding:10px 14px;text-align:center">${r.nb}</td>
            <td style="padding:10px 14px;text-align:center">
              <span style="font-size:18px;font-weight:700;color:${r.moy>=14?'#2E7D32':r.moy>=10?'#E65100':'#C62828'}">${r.moy.toFixed(2)}</span>/20
            </td>
            <td style="padding:10px 14px;font-size:12.5px;color:#546E7A">${r.appr}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${moyGen!==null?`
      <div style="background:#E3F2FD;padding:16px 20px;border:1px solid #DDE3EA;display:flex;justify-content:space-between;align-items:center">
        <strong style="color:#1565C0">Moyenne générale</strong>
        <span style="font-size:24px;font-weight:800;color:${moyGen>=14?'#2E7D32':moyGen>=10?'#E65100':'#C62828'}">${moyGen.toFixed(2)}/20</span>
      </div>`:''}
    </div>`;
}

// =============================================
// GESTION COMPTES (Réalisateur)
// =============================================
async function loadComptes() {
  const el = document.getElementById('page-comptes');
  const { data } = await supabase.from('profiles').select('*, classes(nom)').order('role').order('nom');
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Gestion des comptes</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">👥 Tous les comptes</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="openModalAddEleve()">+ Acteur</button>
          <button class="btn btn-secondary btn-sm" onclick="openModalAddProf()">+ Modérateur</button>
        </div>
      </div>
      <div class="table-container">
        <table><thead><tr><th>Rôle</th><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>${(data||[]).map(u=>`
          <tr>
            <td><span class="badge ${u.role==='realisateur'?'badge-violet':u.role==='moderateur'?'badge-bleu':'badge-vert'}">
              ${u.role==='realisateur'?'🎬 Réalisateur':u.role==='moderateur'?'🎭 Modérateur':'🎓 Acteur'}
            </span></td>
            <td><strong>${u.nom}</strong></td>
            <td>${u.prenom}</td>
            <td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">${u.identifiant}</code></td>
            <td>${u.classes?.nom||'-'}</td>
            <td><span class="badge ${u.actif?'badge-vert':'badge-rouge'}">${u.actif?'Actif':'Inactif'}</span></td>
            <td>
              ${u.role==='acteur'?`<button class="btn btn-secondary btn-sm" onclick="editEleve('${u.id}')">✏️</button>`:''}
              ${u.id!==currentUser.id?`<button class="btn btn-danger btn-sm" onclick="desactiverEleve('${u.id}')">🗑️</button>`:''}
            </td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

// =============================================
// MATIÈRES (Réalisateur)
// =============================================
async function loadMatieres() {
  const el = document.getElementById('page-matieres');
  const { data } = await db.getMatieres();
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Matières</span></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">📚 Matières</div>
        <button class="btn btn-primary btn-sm" onclick="openModalAddMatiere()">+ Ajouter</button>
      </div>
      <div class="table-container">
        <table><thead><tr><th>Nom</th><th>Code</th><th>Couleur</th><th>Coeff.</th><th>Actions</th></tr></thead>
        <tbody>${(data||[]).map(m=>`
          <tr>
            <td><span style="display:inline-flex;align-items:center;gap:8px">
              <span style="width:14px;height:14px;border-radius:3px;background:${m.couleur};display:inline-block"></span>
              <strong>${m.nom}</strong>
            </span></td>
            <td><code>${m.code||'-'}</code></td>
            <td>${m.couleur}</td>
            <td>${m.coefficient}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteMatiere('${m.id}')">🗑️</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

async function openModalAddMatiere() {
  document.getElementById('modal-title').textContent = 'Ajouter une matière';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label class="form-label">Nom *</label><input class="form-control" id="f-nom" placeholder="Ex: Mathématiques"></div>
    <div class="form-group"><label class="form-label">Code</label><input class="form-control" id="f-code" placeholder="Ex: MATH"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Couleur</label><input class="form-control" id="f-couleur" type="color" value="#3B82F6"></div>
      <div class="form-group"><label class="form-label">Coefficient</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveMatiere()">Ajouter</button>`;
  openModal();
}

async function saveMatiere() {
  const nom = document.getElementById('f-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'warning'); return; }
  const { error } = await supabase.from('matieres').insert({ nom, code: document.getElementById('f-code').value, couleur: document.getElementById('f-couleur').value, coefficient: document.getElementById('f-coeff').value });
  if (error) { showToast(error.message, 'danger'); return; }
  closeModal(); showToast('Matière créée !', 'success'); loadMatieres();
}

async function deleteMatiere(id) {
  if (!confirm('Supprimer cette matière ?')) return;
  await supabase.from('matieres').update({ actif: false }).eq('id', id);
  showToast('Matière supprimée', 'success'); loadMatieres();
}

// =============================================
// VUE ÉLÈVE - Mes notes
// =============================================
async function loadMesNotes() {
  const el = document.getElementById('page-monnotes');
  const { data: notes } = await db.getNotes({ eleve_id: currentUser.id });
  
  // Grouper par matière
  const parMatiere = {};
  (notes||[]).forEach(n => {
    const m = n.matieres?.nom;
    if (!parMatiere[m]) parMatiere[m] = { notes: [], couleur: n.matieres?.couleur };
    parMatiere[m].notes.push(n);
  });

  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Mes notes</span></div>
    <div class="dashboard-grid">
      ${Object.entries(parMatiere).map(([mat, { notes: ns, couleur }]) => {
        const moy = ns.reduce((s,n)=>s+(n.valeur/n.sur*20*n.coefficient),0)/ns.reduce((s,n)=>s+n.coefficient,0);
        return `<div class="card">
          <div class="card-header"><div class="card-title" style="color:${couleur}">${mat}</div>
            <span class="note-value ${noteColor(moy)}">${moy.toFixed(2)}/20</span>
          </div>
          <div class="table-container"><table><thead><tr><th>Note</th><th>Intitulé</th><th>Date</th></tr></thead>
          <tbody>${ns.map(n=>`<tr>
            <td><span class="note-value ${noteColor(n.valeur,n.sur)}">${n.valeur}/${n.sur}</span></td>
            <td>${n.intitule||'-'}</td><td>${formatDate(n.date)}</td>
          </tr>`).join('')}</tbody></table></div>
        </div>`;
      }).join('')}
    </div>`;
}

// =============================================
// VUE ÉLÈVE - Mes absences
// =============================================
async function loadMesAbsences() {
  const el = document.getElementById('page-monAbsences');
  const { data } = await db.getAbsences({ eleve_id: currentUser.id });
  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Mes absences</span></div>
    <div class="card">
      <div class="card-header"><div class="card-title">📋 Mes absences et retards</div></div>
      <div class="table-container">
        <table><thead><tr><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th></tr></thead>
        <tbody>${(data||[]).map(a=>`
          <tr>
            <td>${formatDate(a.date)}</td>
            <td><span class="badge ${a.type==='absence'?'badge-rouge':a.type==='retard'?'badge-orange':'badge-violet'}">${a.type}</span></td>
            <td>${a.motif||'-'}</td>
            <td>${a.justifiee?'<span class="badge badge-vert">Oui</span>':'<span class="badge badge-rouge">Non</span>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

// =============================================
// VUE ÉLÈVE - Tableau de bord personnel
// =============================================
async function loadMonDashboard() {
  const el = document.getElementById('page-mondashboard');
  const [{ data: notes }, { data: absences }, { data: devoirs }] = await Promise.all([
    db.getNotes({ eleve_id: currentUser.id }),
    db.getAbsences({ eleve_id: currentUser.id }),
    supabase.from('cahier_textes').select('*, matieres(nom, couleur)').gte('date_remise', new Date().toISOString().split('T')[0]).order('date_remise').limit(5)
  ]);

  const moy = notes?.length ? notes.reduce((s,n)=>s+(n.valeur/n.sur*20),0)/notes.length : null;
  const nbAbs = absences?.filter(a=>a.type==='absence').length || 0;
  const nbRetards = absences?.filter(a=>a.type==='retard').length || 0;

  el.innerHTML = `<div class="breadcrumb">M13 Studio <span>Mon tableau de bord</span></div>
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:#E3F2FD">📝</div>
        <div class="stat-info">
          <div class="stat-value ${moy!==null?noteColor(moy):''}">${moy!==null?moy.toFixed(2)+'/20':'-'}</div>
          <div class="stat-label">Moyenne générale</div>
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
        ${(devoirs||[]).length === 0 ? '<div class="alert alert-success">Aucun devoir à rendre prochainement ! 🎉</div>' :
          devoirs.map(d=>`
            <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--gris-border)">
              <div style="width:10px;height:10px;border-radius:50%;background:${d.matieres?.couleur||'#1565C0'};margin-top:4px;flex-shrink:0"></div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${d.matieres?.nom}</div>
                <div style="font-size:12.5px;color:#546E7A;margin-top:2px">${d.devoirs}</div>
              </div>
              <div style="font-size:11.5px;color:var(--rouge);font-weight:600;white-space:nowrap">📅 ${formatDate(d.date_remise)}</div>
            </div>`).join('')}
      </div>
    </div>`;
}

// =============================================
// MODAL GÉNÉRIQUE
// =============================================
function openModal() {
  document.getElementById('generic-modal').classList.add('open');
}
function closeModal() {
  document.getElementById('generic-modal').classList.remove('open');
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier session existante
  if (loadSession()) {
    initApp();
  }

  // Fermer modal en cliquant dehors
  document.getElementById('generic-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
});

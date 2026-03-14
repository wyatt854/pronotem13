// =============================================
// M13 STUDIO - Configuration Supabase
// =============================================

const SUPABASE_URL = 'https://nlgzunlagcdgsbkzeiin.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZ3p1bmxhZ2NkZ3Nia3plaWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDQyNzksImV4cCI6MjA4MzE4MDI3OX0.4sSfmztjJJkfHaIOBOK6Pv-27QWSpM2B-lxg0b3XC7U';

// Initialisation du client Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// ÉTAT GLOBAL DE L'APPLICATION
// =============================================
let currentUser = null;
let currentRole = null;

// Charger session depuis localStorage
function loadSession() {
  const saved = localStorage.getItem('m13_session');
  if (saved) {
    const session = JSON.parse(saved);
    currentUser = session.user;
    currentRole = session.role;
    return true;
  }
  return false;
}

function saveSession(user) {
  currentUser = user;
  currentRole = user.role;
  localStorage.setItem('m13_session', JSON.stringify({ user, role: user.role }));
}

function clearSession() {
  currentUser = null;
  currentRole = null;
  localStorage.removeItem('m13_session');
}

// =============================================
// HELPERS DB
// =============================================
const db = {
  // Profils
  async getProfiles(filters = {}) {
    let q = supabase.from('profiles').select('*, classes(nom)');
    if (filters.role) q = q.eq('role', filters.role);
    if (filters.actif !== undefined) q = q.eq('actif', filters.actif);
    return q.order('nom');
  },

  async getProfileByIdentifiant(identifiant) {
    return supabase.from('profiles').select('*').eq('identifiant', identifiant).single();
  },

  async createProfile(data) {
    return supabase.from('profiles').insert(data).select().single();
  },

  async updateProfile(id, data) {
    return supabase.from('profiles').update(data).eq('id', id);
  },

  async deleteProfile(id) {
    return supabase.from('profiles').update({ actif: false }).eq('id', id);
  },

  // Classes
  async getClasses() {
    return supabase.from('classes').select('*').eq('actif', true).order('nom');
  },

  async createClasse(data) {
    return supabase.from('classes').insert(data).select().single();
  },

  async updateClasse(id, data) {
    return supabase.from('classes').update(data).eq('id', id);
  },

  // Matières
  async getMatieres() {
    return supabase.from('matieres').select('*').eq('actif', true).order('nom');
  },

  // Emploi du temps
  async getEDT(classeId) {
    return supabase.from('emploi_du_temps')
      .select('*, matieres(nom, couleur), profiles(nom, prenom)')
      .eq('classe_id', classeId)
      .eq('actif', true)
      .order('jour').order('heure_debut');
  },

  async createCreneauEDT(data) {
    return supabase.from('emploi_du_temps').insert(data).select().single();
  },

  async deleteCreneauEDT(id) {
    return supabase.from('emploi_du_temps').update({ actif: false }).eq('id', id);
  },

  // Absences
  async getAbsences(filters = {}) {
    let q = supabase.from('absences')
      .select('*, profiles!absences_eleve_id_fkey(nom, prenom, classes(nom))');
    if (filters.eleve_id) q = q.eq('eleve_id', filters.eleve_id);
    if (filters.date) q = q.eq('date', filters.date);
    return q.order('date', { ascending: false });
  },

  async createAbsence(data) {
    return supabase.from('absences').insert({ ...data, saisie_par: currentUser.id }).select().single();
  },

  async updateAbsence(id, data) {
    return supabase.from('absences').update(data).eq('id', id);
  },

  // Notes
  async getNotes(filters = {}) {
    let q = supabase.from('notes')
      .select('*, profiles!notes_eleve_id_fkey(nom, prenom), matieres(nom, couleur)');
    if (filters.eleve_id) q = q.eq('eleve_id', filters.eleve_id);
    if (filters.matiere_id) q = q.eq('matiere_id', filters.matiere_id);
    if (filters.periode) q = q.eq('periode', filters.periode);
    return q.order('date', { ascending: false });
  },

  async createNote(data) {
    return supabase.from('notes').insert({ ...data, professeur_id: currentUser.id }).select().single();
  },

  async deleteNote(id) {
    return supabase.from('notes').delete().eq('id', id);
  },

  // Cahier de textes
  async getCahier(filters = {}) {
    let q = supabase.from('cahier_textes')
      .select('*, matieres(nom, couleur), classes(nom), profiles(nom, prenom)');
    if (filters.classe_id) q = q.eq('classe_id', filters.classe_id);
    return q.order('date', { ascending: false });
  },

  async createEntreeCahier(data) {
    return supabase.from('cahier_textes').insert({ ...data, professeur_id: currentUser.id }).select().single();
  },

  // Messages
  async getMessages(userId) {
    return supabase.from('messages')
      .select('*, profiles!messages_expediteur_id_fkey(nom, prenom)')
      .eq('destinataire_id', userId)
      .is('parent_id', null)
      .order('date_envoi', { ascending: false });
  },

  async sendMessage(data) {
    return supabase.from('messages').insert({ ...data, expediteur_id: currentUser.id }).select().single();
  },

  async markMessageRead(id) {
    return supabase.from('messages').update({ lu: true }).eq('id', id);
  },

  // Sanctions
  async getSanctions(filters = {}) {
    let q = supabase.from('sanctions')
      .select('*, profiles!sanctions_eleve_id_fkey(nom, prenom, classes(nom))');
    if (filters.eleve_id) q = q.eq('eleve_id', filters.eleve_id);
    return q.order('date', { ascending: false });
  },

  async createSanction(data) {
    return supabase.from('sanctions').insert({ ...data, prononcee_par: currentUser.id }).select().single();
  },

  // Appréciations
  async getAppreciations(filters = {}) {
    let q = supabase.from('appreciations')
      .select('*, matieres(nom), profiles!appreciations_professeur_id_fkey(nom, prenom)');
    if (filters.eleve_id) q = q.eq('eleve_id', filters.eleve_id);
    if (filters.periode) q = q.eq('periode', filters.periode);
    return q;
  },

  async saveApprecia(data) {
    return supabase.from('appreciations').upsert({ ...data, professeur_id: currentUser.id });
  }
};

// =============================================
// UTILS
// =============================================
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getInitials(nom, prenom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
}

function noteColor(val, sur = 20) {
  const pct = val / sur;
  if (pct >= 0.7) return 'note-good';
  if (pct >= 0.5) return 'note-medium';
  return 'note-bad';
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;
    border-radius:8px;color:white;font-size:13px;font-weight:600;
    box-shadow:0 4px 16px rgba(0,0,0,0.2);animation:slideIn .3s ease;
    background:${type==='success'?'#2E7D32':type==='danger'?'#C62828':type==='warning'?'#E65100':'#1565C0'}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

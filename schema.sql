-- M13 STUDIO - Schéma Supabase
-- Exécutez ce SQL dans l'éditeur SQL de votre projet Supabase

-- =============================================
-- EXTENSION UUID
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE UTILISATEURS (gérée par Supabase Auth + profils)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,  -- lié à auth.users si connecté via Auth
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  identifiant VARCHAR(50) UNIQUE NOT NULL,
  mot_de_passe_hash TEXT, -- pour auth custom
  role VARCHAR(20) NOT NULL CHECK (role IN ('acteur', 'moderateur', 'realisateur')),
  classe_id UUID,
  email VARCHAR(200),
  telephone VARCHAR(20),
  date_naissance DATE,
  photo_url TEXT,
  actif BOOLEAN DEFAULT true,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  derniere_connexion TIMESTAMPTZ
);

-- =============================================
-- TABLE CLASSES
-- =============================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(50) NOT NULL,
  niveau VARCHAR(50),
  annee_scolaire VARCHAR(9) DEFAULT '2024-2025',
  actif BOOLEAN DEFAULT true,
  date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE MATIERES
-- =============================================
CREATE TABLE IF NOT EXISTS public.matieres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(10),
  couleur VARCHAR(7) DEFAULT '#3B82F6',
  coefficient DECIMAL(3,1) DEFAULT 1.0,
  actif BOOLEAN DEFAULT true
);

-- =============================================
-- TABLE EMPLOI DU TEMPS (créneaux)
-- =============================================
CREATE TABLE IF NOT EXISTS public.emploi_du_temps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  matiere_id UUID REFERENCES public.matieres(id),
  professeur_id UUID REFERENCES public.profiles(id),
  jour VARCHAR(10) NOT NULL CHECK (jour IN ('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi')),
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  salle VARCHAR(50),
  semaine VARCHAR(10) DEFAULT 'A', -- A, B ou toutes
  actif BOOLEAN DEFAULT true
);

-- =============================================
-- TABLE ABSENCES / RETARDS
-- =============================================
CREATE TABLE IF NOT EXISTS public.absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  type VARCHAR(20) DEFAULT 'absence' CHECK (type IN ('absence','retard','exclusion')),
  motif TEXT,
  justifiee BOOLEAN DEFAULT false,
  cours_id UUID REFERENCES public.emploi_du_temps(id),
  saisie_par UUID REFERENCES public.profiles(id),
  date_saisie TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE NOTES
-- =============================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  matiere_id UUID REFERENCES public.matieres(id),
  professeur_id UUID REFERENCES public.profiles(id),
  valeur DECIMAL(4,2) NOT NULL CHECK (valeur >= 0 AND valeur <= 20),
  sur DECIMAL(4,2) DEFAULT 20,
  coefficient DECIMAL(3,1) DEFAULT 1.0,
  intitule VARCHAR(200),
  date DATE NOT NULL,
  periode VARCHAR(20) DEFAULT 'T1', -- T1, T2, T3
  commentaire TEXT,
  date_saisie TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE CAHIER DE TEXTES / DEVOIRS
-- =============================================
CREATE TABLE IF NOT EXISTS public.cahier_textes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classe_id UUID REFERENCES public.classes(id),
  matiere_id UUID REFERENCES public.matieres(id),
  professeur_id UUID REFERENCES public.profiles(id),
  date DATE NOT NULL,
  contenu_cours TEXT,
  devoirs TEXT,
  date_remise DATE,
  date_saisie TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE MESSAGES / MESSAGERIE
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expediteur_id UUID REFERENCES public.profiles(id),
  destinataire_id UUID REFERENCES public.profiles(id),
  sujet VARCHAR(200),
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,
  date_envoi TIMESTAMPTZ DEFAULT NOW(),
  parent_id UUID REFERENCES public.messages(id)
);

-- =============================================
-- TABLE SANCTIONS / PUNITIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.sanctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID REFERENCES public.profiles(id),
  type VARCHAR(50) NOT NULL,
  motif TEXT,
  date DATE NOT NULL,
  prononcee_par UUID REFERENCES public.profiles(id),
  executee BOOLEAN DEFAULT false,
  date_saisie TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE BULLETINS / APPRECIATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.appreciations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID REFERENCES public.profiles(id),
  matiere_id UUID REFERENCES public.matieres(id),
  professeur_id UUID REFERENCES public.profiles(id),
  periode VARCHAR(20) DEFAULT 'T1',
  appreciation TEXT,
  date_saisie TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DONNÉES INITIALES - Compte Réalisateur
-- =============================================
INSERT INTO public.profiles (nom, prenom, identifiant, mot_de_passe_hash, role, actif)
VALUES ('Admin', 'M13', 'Siroxtag', '11072013Sw@', 'realisateur', true)
ON CONFLICT (identifiant) DO NOTHING;

-- Matières de base
INSERT INTO public.matieres (nom, code, couleur, coefficient) VALUES
('Mathématiques', 'MATH', '#3B82F6', 3.0),
('Français', 'FR', '#EF4444', 3.0),
('Histoire-Géographie', 'HG', '#F59E0B', 2.0),
('Sciences', 'SVT', '#10B981', 2.0),
('Anglais', 'ANG', '#8B5CF6', 2.0),
('Éducation Physique', 'EPS', '#F97316', 1.0),
('Arts Plastiques', 'ART', '#EC4899', 1.0),
('Musique', 'MUS', '#06B6D4', 1.0)
ON CONFLICT DO NOTHING;

-- =============================================
-- RLS (Row Level Security) - Politiques basiques
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut lire les profils (pour la connexion)
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE USING (true);

-- Classes
CREATE POLICY "classes_all" ON public.classes FOR ALL USING (true);

-- Matieres
ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matieres_all" ON public.matieres FOR ALL USING (true);

-- Emploi du temps
ALTER TABLE public.emploi_du_temps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edt_all" ON public.emploi_du_temps FOR ALL USING (true);

-- Notes
CREATE POLICY "notes_all" ON public.notes FOR ALL USING (true);

-- Absences
CREATE POLICY "absences_all" ON public.absences FOR ALL USING (true);

-- Cahier de textes
ALTER TABLE public.cahier_textes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cahier_all" ON public.cahier_textes FOR ALL USING (true);

-- Messages
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update" ON public.messages FOR UPDATE USING (true);

-- Sanctions
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sanctions_all" ON public.sanctions FOR ALL USING (true);

-- Appréciations
ALTER TABLE public.appreciations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appreciations_all" ON public.appreciations FOR ALL USING (true);

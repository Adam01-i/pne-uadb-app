export type Role = 'etudiant' | 'agent' | 'biblio' | 'medecin';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  adresse: string;
  telephone: string;
  role: Role;
}

export interface Classe {
  id: number;
  ufr: string;
  departement: string;
  filiere: string;
  niveau: string;
  annee_academique: string;
}

export interface Etudiant {
  id: number;
  user: User;
  classe: Classe;
  code_permanent: string;
}

export interface AgentScolarite {
  id: number;
  user: User;
}

export interface Bibliothecaire {
  id: number;
  user: User;
}

export interface Medecin {
  id: number;
  user: User;
}

export type Personnel = AgentScolarite | Bibliothecaire | Medecin;

// ── Services ──────────────────────────────────────────────
export interface VisiteMedicale {
  id: number;
  etudiant_nom: string;
  medecin_nom: string;
  date_visite: string;
  resultat: string;
  aptitude: boolean;
}

export interface ValidationBibliotheque {
  id: number;
  etudiant_nom: string;
  bibliothecaire_nom: string;
  date_validation: string;
  en_regle: boolean;
}

export type PaiementStatus = 'pending' | 'processing' | 'success' | 'failed';
export type PaiementMethod = 'orange_money' | 'wave' | 'card' | 'unknown';

export interface Paiement {
  id: number;
  etudiant: number;
  montant: number;
  reference: string;
  status: PaiementStatus;
  method: PaiementMethod;
  paytech_token: string | null;
  created_at: string;
  updated_at: string;
}

// ── Inscriptions ──────────────────────────────────────────
export type StatutDossier = 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

export interface Notification {
  idNotification: number;
  emetteur: string;
  message: string;
  dateEnvoie: string;
  lu: boolean;
  etudiant: number;
}

export interface PaiementDetail {
  id: number;
  etudiant_nom: string;
  etudiant_code: string;
  etudiant_classe: string;
  montant: number;
  reference: string;
  status: PaiementStatus;
  method: PaiementMethod;
  created_at: string;
  updated_at: string;
}

export interface DossierReinscription {
  idDossier: number;
  dateCreation: string;
  statusVisite: StatutDossier;
  statusValidation: StatutDossier;
  statusPaiement: StatutDossier;
  datePaiement: string | null;
  montant: number;
  operateur: string;
  etudiant_nom: string;
  notifications: Notification[] | undefined;
}

export interface CreneauVisite {
  id: number;
  medecin_nom: string;
  ufr: string;
  departement: string;
  filiere: string;
  niveau: string;
  date_debut: string;
  date_fin: string;
  created_at: string;
}
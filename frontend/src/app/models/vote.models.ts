export type Role = 'SUPER_ADMIN' | 'COMMISSION_ELECTORALE' | 'CANDIDAT' | 'ELECTEUR';
export type TypeElecteur = 'ETUDIANT' | 'ENSEIGNANT' | 'PATS';
export type TypeElection = 'DELEGUE' | 'DUFR' | 'VICE_RECTEUR';
export type ElectionStatus = 'CONFIGURATION' | 'CAMPAGNE' | 'VOTE_OUVERT' | 'DEPOUILLEMENT' | 'PUBLICATION' | 'CLOTURE';
export type CandidacyStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ComplaintStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface User {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: Role;
  typeElecteur: TypeElecteur;
  ufr?: string;
  filiere?: string;
  niveau?: string;
  active: boolean;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  typeElecteur: TypeElecteur;
  ufr?: string;
  filiere?: string;
  niveau?: string;
}

export interface Election {
  id: number;
  titre: string;
  description?: string;
  type: TypeElection;
  statut: ElectionStatus;
  dateDebut?: string;
  dateFin?: string;
  targetUfr?: string;
  targetFiliere?: string;
  targetNiveau?: string;
  createdAt?: string;
  eligible?: boolean;
  ineligibilityReason?: string;
}

export interface Candidature {
  id: number;
  nomListe: string;
  photoUrl?: string;
  programmePdf?: string;
  cvUrl?: string;
  statut: CandidacyStatus;
  motifRejet?: string;
  candidatNom?: string;
  candidatPrenom?: string;
  candidatNomComplet?: string;
  candidatMatricule?: string;
  electionId?: number;
  posts?: CampaignPost[];
}

export interface CampaignPost {
  id: number;
  titre: string;
  contenu: string;
  afficheUrl?: string;
  videoEmbedUrl?: string; // Support vidéo YouTube / Vimeo
  createdAt?: string;
  candidatureId?: number;
}

export interface LiveResult {
  candidatureId: number;
  nomListe: string;
  candidatNom: string;
  voteCount: number;
  percentage: number;
}

export interface LiveResultsDto {
  electionId: number;
  electionTitre: string;
  totalVotes: number;
  results: LiveResult[];
  lastUpdated: string;
}

export interface UserImportResult {
  totalSuccess: number;
  totalFailed: number;
  errors: string[];
}

export interface VoterAuditLog {
  id: number;
  votedAt: string;
  electionId: number;
  electionTitre: string;
  ipHash?: string;
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidature, CampaignPost, Election, ElectionStatus, LiveResultsDto, UserImportResult, AuditReportDto } from '../models/vote.models';

@Injectable({
  providedIn: 'root'
})
export class ElectionService {
  private apiUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  getElections(): Observable<Election[]> {
    return this.http.get<Election[]>(`${this.apiUrl}/elections`);
  }

  getElection(id: number): Observable<Election> {
    return this.http.get<Election>(`${this.apiUrl}/elections/${id}`);
  }

  createElection(election: Partial<Election>): Observable<Election> {
    return this.http.post<Election>(`${this.apiUrl}/elections`, election);
  }

  updateElectionStatus(id: number, newStatus: ElectionStatus): Observable<Election> {
    return this.http.put<Election>(`${this.apiUrl}/elections/${id}/status?status=${newStatus}`, {});
  }

  getCandidatures(electionId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidacies/election/${electionId}`);
  }

  getApprovedCandidatures(electionId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidacies/election/${electionId}/approved`);
  }

  getLiveResults(electionId: number): Observable<LiveResultsDto> {
    return this.http.get<LiveResultsDto>(`${this.apiUrl}/results/${electionId}`);
  }

  exportPdfReport(electionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/results/${electionId}/export-pdf`, {
      responseType: 'blob'
    });
  }

  // Audit Cryptographique (UC5)
  getAuditReport(electionId: number): Observable<AuditReportDto> {
    return this.http.get<AuditReportDto>(`${this.apiUrl}/audit/${electionId}`);
  }

  exportAuditCsv(electionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/audit/${electionId}/export-csv`, {
      responseType: 'blob'
    });
  }

  // Espace Candidat
  getMyCandidatures(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidacies/my-candidacies`);
  }

  submitCandidature(electionId: number, photoUrl?: string, programmePdf?: string, cvUrl?: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.apiUrl}/candidacies`, {
      electionId, photoUrl, programmePdf, cvUrl
    });
  }

  // Campagne électorale avec support vidéo (YouTube/Vimeo)
  addCampaignPost(candidatureId: number, titre: string, contenu: string, afficheUrl?: string, videoEmbedUrl?: string): Observable<CampaignPost> {
    return this.http.post<CampaignPost>(`${this.apiUrl}/candidatures/${candidatureId}/posts`, {
      candidatureId, titre, contenu, afficheUrl, videoEmbedUrl
    });
  }

  getCampaignPostsByElection(electionId: number): Observable<CampaignPost[]> {
    return this.http.get<CampaignPost[]>(`${this.apiUrl}/campaigns/election/${electionId}`);
  }

  // Commission Électorale : Validation / Rejet
  updateCandidacyStatus(candidatureId: number, status: 'APPROVED' | 'REJECTED', motifRejet?: string): Observable<Candidature> {
    const isApproved = status === 'APPROVED';
    let url = `${this.apiUrl}/candidacies/${candidatureId}/validate?approved=${isApproved}`;
    if (motifRejet) {
      url += `&motifRejet=${encodeURIComponent(motifRejet)}`;
    }
    return this.http.put<Candidature>(url, {});
  }

  // Admin : Import CSV Électeurs
  importCsvUsers(file: File): Observable<UserImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserImportResult>(`${this.apiUrl}/admin/users/import-csv`, formData);
  }
}

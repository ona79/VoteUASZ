import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidature } from '../models/vote.models';

@Injectable({
  providedIn: 'root'
})
export class CandidacyService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/candidacies';

  submitCandidacy(dto: Partial<Candidature>): Observable<Candidature> {
    return this.http.post<Candidature>(this.apiUrl, dto);
  }

  getMyCandidacies(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/my-candidacies`);
  }

  getCandidaciesByElection(electionId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/election/${electionId}`);
  }

  getApprovedCandidacies(electionId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/election/${electionId}/approved`);
  }

  validateCandidacy(id: number, approved: boolean, motifRejet?: string): Observable<Candidature> {
    let params = new HttpParams().set('approved', approved.toString());
    if (motifRejet) {
      params = params.set('motifRejet', motifRejet);
    }
    return this.http.put<Candidature>(`${this.apiUrl}/${id}/validate`, null, { params });
  }
}

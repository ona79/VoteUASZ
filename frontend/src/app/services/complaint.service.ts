import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComplaintStatus } from '../models/vote.models';

export interface ComplaintRequest {
  electionId: number;
  sujet: string;
  description: string;
}

export interface ComplaintResponse {
  id: number;
  electionId: number;
  electionTitre?: string;
  auteurNomComplet?: string;
  sujet: string;
  description: string;
  statut: ComplaintStatus;
  reponseCommission?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  private readonly apiUrl = '/api/v1/complaints';
  private http = inject(HttpClient);

  submitComplaint(request: ComplaintRequest): Observable<ComplaintResponse> {
    return this.http.post<ComplaintResponse>(this.apiUrl, request);
  }

  getMyComplaints(): Observable<ComplaintResponse[]> {
    return this.http.get<ComplaintResponse[]>(`${this.apiUrl}/my-complaints`);
  }

  getComplaintsByElection(electionId: number): Observable<ComplaintResponse[]> {
    return this.http.get<ComplaintResponse[]>(`${this.apiUrl}/election/${electionId}`);
  }

  resolveComplaint(id: number, status: ComplaintStatus, reponseCommission: string): Observable<ComplaintResponse> {
    return this.http.put<ComplaintResponse>(`${this.apiUrl}/${id}/resolve`, null, {
      params: { status, reponseCommission }
    });
  }
}

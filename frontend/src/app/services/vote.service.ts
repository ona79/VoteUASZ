import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OtpRequest {
  electionId: number;
}

export interface OtpVerifyRequest {
  electionId: number;
  otpCode: string;
}

export interface OtpVerifyResponse {
  voteToken: string;
  expiresAt: string;
}

export interface VoteSubmitRequest {
  voteToken: string;
  electionId: number;
  candidatureId: number;
}

export interface VoteSubmitResponse {
  success: boolean;
  message: string;
  ballotHash: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoteService {
  private apiUrl = '/api/v1/vote';

  constructor(private http: HttpClient) {}

  requestOtp(electionId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/request-otp?electionId=${electionId}`, { electionId });
  }

  verifyOtp(electionId: number, otpCode: string): Observable<OtpVerifyResponse> {
    return this.http.post<OtpVerifyResponse>(`${this.apiUrl}/verify-otp?electionId=${electionId}&otpCode=${encodeURIComponent(otpCode)}`, { electionId, otpCode });
  }

  submitVote(voteToken: string, electionId: number, candidatureId: number): Observable<VoteSubmitResponse> {
    return this.http.post<VoteSubmitResponse>(`${this.apiUrl}/submit`, { voteToken, electionId, candidatureId });
  }
}

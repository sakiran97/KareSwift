import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KycStatusResponse {
  kycStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  kycReviewNotes: string | null;
  kycReviewedAt: string | null;
  shopVerified: boolean;
  shopReviewNotes: string | null;
  govtIdType: string | null;
  shopName: string | null;
  shopAddress: string | null;
  isOnline: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TechnicianKycService {
  private readonly apiUrl = '/api/technician/kyc';

  constructor(private http: HttpClient) {}

  uploadKycDocuments(data: {
    govtIdType: string;
    govtIdNumber: string;
    aadhaarNumber?: string;
    panNumber?: string;
    govtIdFrontUrl?: string;
    govtIdBackUrl?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload`, data);
  }

  uploadFile(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload-file`, formData);
  }

  sendAadhaarOtp(aadhaarNumber: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-aadhaar-otp`, { aadhaarNumber });
  }

  verifyAadhaarOtp(otp: string, aadhaarNumber?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-aadhaar-otp`, { otp, aadhaarNumber });
  }

  getKycStatus(): Observable<KycStatusResponse> {
    return this.http.get<KycStatusResponse>(`${this.apiUrl}/status`);
  }

  uploadShopDetails(data: {
    shopName: string;
    shopAddress: string;
    shopLatitude?: number;
    shopLongitude?: number;
    shopPhotos?: string[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/shop`, data);
  }

  updateLiveLocation(latitude: number, longitude: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/location`, { latitude, longitude });
  }

  toggleOnline(online: boolean): Observable<{ isOnline: boolean }> {
    return this.http.post<{ isOnline: boolean }>(`${this.apiUrl}/toggle-online`, { online });
  }
}

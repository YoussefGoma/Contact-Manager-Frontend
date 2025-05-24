import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = 'http://localhost:3000/api/contacts';

  constructor(private http: HttpClient) {}

  getContacts(page: number = 1, filters: any = {}): Observable<any> {
    let params = new HttpParams().set('page', page.toString());
    
    if (filters.name) params = params.set('name', filters.name);
    if (filters.phone) params = params.set('phone', filters.phone);
    if (filters.address) params = params.set('address', filters.address);

    return this.http.get<any>(this.apiUrl, { params });
  }

  addContact(contact: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, contact);
  }

  updateContact(id: string, contact: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, contact);
  }

  deleteContact(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  lockContact(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/lock`, {});
  }

  unlockContact(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/unlock`, {});
  }
}
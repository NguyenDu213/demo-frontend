import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Role } from '../models/role.model';
import { MOCK_ROLES } from '../data/mock-data';

// Set to true to use mock data instead of real API
const USE_MOCK_DATA = true;

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = 'http://localhost:8080/api'; // Update with your backend URL
  private mockDataKey = 'mock_roles';

  constructor(private http: HttpClient) {
    if (USE_MOCK_DATA) {
      this.initializeMockData();
    }
  }

  private initializeMockData(): void {
    if (!localStorage.getItem(this.mockDataKey)) {
      localStorage.setItem(this.mockDataKey, JSON.stringify(MOCK_ROLES));
    }
  }

  private getMockRoles(): Role[] {
    const data = localStorage.getItem(this.mockDataKey);
    return data ? JSON.parse(data) : [];
  }

  private saveMockRoles(roles: Role[]): void {
    localStorage.setItem(this.mockDataKey, JSON.stringify(roles));
  }

  getRoles(typeRole?: string, schoolId?: number): Observable<Role[]> {
    if (USE_MOCK_DATA) {
      let roles = this.getMockRoles();
      
      if (typeRole) {
        roles = roles.filter(r => r.typeRole === typeRole);
      }
      
      if (schoolId !== undefined) {
        // Include roles with matching schoolId or null schoolId (system roles)
        roles = roles.filter(r => r.schoolId === schoolId || r.schoolId === null);
      }
      
      return of(roles).pipe(delay(300));
    }

    let params = new HttpParams();
    if (typeRole) {
      params = params.set('typeRole', typeRole);
    }
    if (schoolId !== undefined) {
      params = params.set('schoolId', schoolId.toString());
    }
    return this.http.get<Role[]>(`${this.apiUrl}/roles`, { params });
  }

  getRoleById(id: number): Observable<Role> {
    if (USE_MOCK_DATA) {
      const roles = this.getMockRoles();
      const role = roles.find(r => r.id === id);
      if (role) {
        return of(role).pipe(delay(300));
      }
      return new Observable(observer => {
        setTimeout(() => observer.error({ error: { message: 'Không tìm thấy role' } }), 300);
      });
    }
    return this.http.get<Role>(`${this.apiUrl}/roles/${id}`);
  }

  createRole(role: Role): Observable<Role> {
    if (USE_MOCK_DATA) {
      const roles = this.getMockRoles();
      const newId = Math.max(...roles.map(r => r.id || 0), 0) + 1;
      const newRole: Role = {
        ...role,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      roles.push(newRole);
      this.saveMockRoles(roles);
      return of(newRole).pipe(delay(500));
    }
    return this.http.post<Role>(`${this.apiUrl}/roles`, role);
  }

  updateRole(id: number, role: Role): Observable<Role> {
    if (USE_MOCK_DATA) {
      const roles = this.getMockRoles();
      const index = roles.findIndex(r => r.id === id);
      if (index !== -1) {
        roles[index] = {
          ...role,
          id,
          updatedAt: new Date().toISOString()
        };
        this.saveMockRoles(roles);
        return of(roles[index]).pipe(delay(500));
      }
      return new Observable(observer => {
        setTimeout(() => observer.error({ error: { message: 'Không tìm thấy role' } }), 300);
      });
    }
    return this.http.put<Role>(`${this.apiUrl}/roles/${id}`, role);
  }

  deleteRole(id: number): Observable<void> {
    if (USE_MOCK_DATA) {
      const roles = this.getMockRoles();
      const filtered = roles.filter(r => r.id !== id);
      this.saveMockRoles(filtered);
      return of(void 0).pipe(delay(500));
    }
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}`);
  }
}


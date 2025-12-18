import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { User } from '../models/user.model';
import { MOCK_USERS } from '../data/mock-data';

// Set to true to use mock data instead of real API
const USE_MOCK_DATA = true;

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api'; // Update with your backend URL
  private mockDataKey = 'mock_users';

  constructor(private http: HttpClient) {
    if (USE_MOCK_DATA) {
      this.initializeMockData();
    }
  }

  private initializeMockData(): void {
    if (!localStorage.getItem(this.mockDataKey)) {
      localStorage.setItem(this.mockDataKey, JSON.stringify(MOCK_USERS));
    }
  }

  private getMockUsers(): User[] {
    const data = localStorage.getItem(this.mockDataKey);
    return data ? JSON.parse(data) : [];
  }

  private saveMockUsers(users: User[]): void {
    localStorage.setItem(this.mockDataKey, JSON.stringify(users));
  }

  getUsers(scope?: string, schoolId?: number): Observable<User[]> {
    if (USE_MOCK_DATA) {
      let users = this.getMockUsers();
      
      if (scope) {
        users = users.filter(u => u.scope === scope);
      }
      
      if (schoolId !== undefined) {
        users = users.filter(u => u.schoolId === schoolId);
      }
      
      return of(users).pipe(delay(300));
    }

    let params = new HttpParams();
    if (scope) {
      params = params.set('scope', scope);
    }
    if (schoolId !== undefined) {
      params = params.set('schoolId', schoolId.toString());
    }
    return this.http.get<User[]>(`${this.apiUrl}/users`, { params });
  }

  getUserById(id: number): Observable<User> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      const user = users.find(u => u.id === id);
      if (user) {
        return of(user).pipe(delay(300));
      }
      return new Observable(observer => {
        setTimeout(() => observer.error({ error: { message: 'Không tìm thấy người dùng' } }), 300);
      });
    }
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  createUser(user: User): Observable<User> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      const newId = Math.max(...users.map(u => u.id || 0), 0) + 1;
      const newUser: User = {
        ...user,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      users.push(newUser);
      this.saveMockUsers(users);
      return of(newUser).pipe(delay(500));
    }
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }

  updateUser(id: number, user: User): Observable<User> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        users[index] = {
          ...user,
          id,
          updatedAt: new Date().toISOString()
        };
        this.saveMockUsers(users);
        return of(users[index]).pipe(delay(500));
      }
      return new Observable(observer => {
        setTimeout(() => observer.error({ error: { message: 'Không tìm thấy người dùng' } }), 300);
      });
    }
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      const filtered = users.filter(u => u.id !== id);
      this.saveMockUsers(filtered);
      return of(void 0).pipe(delay(500));
    }
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }
}


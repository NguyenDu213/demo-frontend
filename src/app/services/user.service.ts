import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, delay, tap, map } from 'rxjs';
import { User } from '../models/user.model';
import { MOCK_USERS } from '../data/mock-data';
import { ApiResponse } from '../models/auth.model';

// Set to true to use mock data instead of real API
const USE_MOCK_DATA = true;

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users'; // Update with your backend URL
  private mockDataKey = 'mock_users';

  constructor(private http: HttpClient) {
    if (USE_MOCK_DATA) {
      this.initializeMockData();
    }
    
  }
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
    // lấy ds user
    getAllUsers(): Observable<User[]> {
      console.log('[API Request] GET /users');
      return this.http.get<ApiResponse<User[]>>(this.apiUrl, { headers: this.getHeaders() })
        .pipe(
          tap(response => console.log('[API Response] GET /users:', response)),
          map(response => response.data) // Bóc tách lấy data thật
        );
    }

      // Tìm kiếm user
      searchUsers(name: string): Observable<User[]> {
        const params = new HttpParams().set('name', name);
        console.log('[API Request] GET /users/search param:', name);
        return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/search?keyword=` + name, {
          headers: this.getHeaders(),
          params: params
        }).pipe(
          tap(response => console.log('[API Response] Search:', response)),
          map(response => response.data)
        );
      }
       // Tạo mới user
        createUser(user: User): Observable<User> {
          console.log('[API Request] POST /users Payload:', user);
          return this.http.post<ApiResponse<User>>(this.apiUrl, user, { headers: this.getHeaders() })
            .pipe(
              tap(response => console.log('[API Response] POST /schools:', response)),
              map(response => response.data)
            );
        }
      
  
  private initializeMockData(): void {
    // Kiểm tra version để tự động reset khi có thay đổi mock data
    const MOCK_DATA_VERSION = '1.1'; // Tăng version này khi cập nhật mock data
    const storedVersion = localStorage.getItem('mock_users_version');
    
    if (!localStorage.getItem(this.mockDataKey) || storedVersion !== MOCK_DATA_VERSION) {
      localStorage.setItem(this.mockDataKey, JSON.stringify(MOCK_USERS));
      localStorage.setItem('mock_users_version', MOCK_DATA_VERSION);
    }
  }

  /**
   * Reset mock data về dữ liệu mặc định từ mock-data.ts
   */
  resetMockData(): void {
    localStorage.setItem(this.mockDataKey, JSON.stringify(MOCK_USERS));
    localStorage.setItem('mock_users_version', '1.1');
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

  create1User(user: User): Observable<User> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      const newId = Math.max(...users.map(u => u.id || 0), 0) + 1;
      const newUser: User = {
        ...user,
        id: newId,
        roleId: user.roleId != null ? Number(user.roleId) : user.roleId, // Đảm bảo roleId là number
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
          roleId: user.roleId != null ? Number(user.roleId) : user.roleId, // Đảm bảo roleId là number
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

  /**
   * Kiểm tra xem role có đang được sử dụng bởi user nào không
   */
  isRoleInUse(roleId: number): Observable<boolean> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      // Đảm bảo so sánh đúng kiểu dữ liệu (number)
      const isInUse = users.some(u => u.roleId != null && Number(u.roleId) === Number(roleId));
      return of(isInUse).pipe(delay(100));
    }
    return this.http.get<boolean>(`${this.apiUrl}/users/check-role/${roleId}`);
  }

  /**
   * Lấy số lượng user đang sử dụng role
   */
  getUsersByRoleId(roleId: number): Observable<User[]> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      // Đảm bảo so sánh đúng kiểu dữ liệu (number)
      const usersWithRole = users.filter(u => u.roleId != null && Number(u.roleId) === Number(roleId));
      return of(usersWithRole).pipe(delay(100));
    }
    return this.http.get<User[]>(`${this.apiUrl}/users?roleId=${roleId}`);
  }

  /**
   * Gán role mới cho tất cả users đang sử dụng role cũ
   */
  reassignRole(oldRoleId: number, newRoleId: number): Observable<{ success: boolean; message?: string; updatedCount?: number }> {
    if (USE_MOCK_DATA) {
      const users = this.getMockUsers();
      // Đảm bảo so sánh đúng kiểu dữ liệu (number)
      const usersToUpdate = users.filter(u => u.roleId != null && Number(u.roleId) === Number(oldRoleId));
      
      if (usersToUpdate.length === 0) {
        return of({ success: false, message: 'Không tìm thấy user nào đang sử dụng role này.' });
      }

      // Cập nhật roleId cho tất cả users
      usersToUpdate.forEach(user => {
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          users[index] = {
            ...users[index],
            roleId: Number(newRoleId), // Đảm bảo roleId là number
            updatedAt: new Date().toISOString()
          };
        }
      });

      this.saveMockUsers(users);
      return of({ 
        success: true, 
        updatedCount: usersToUpdate.length,
        message: `Đã gán role mới cho ${usersToUpdate.length} người dùng.`
      }).pipe(delay(500));
    }
    return this.http.put<{ success: boolean; message?: string; updatedCount?: number }>(
      `${this.apiUrl}/users/reassign-role`,
      { oldRoleId, newRoleId }
    );
  }
}


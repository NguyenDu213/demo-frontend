import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { ApiResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) { }

  // Hàm lấy Header có chứa Token
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

  // Lấy danh sách users
  getUsers(scope?: string, schoolId?: number): Observable<User[]> {
    console.log('[API Request] GET /users');
    return this.http.get<ApiResponse<User[]>>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('[API Response] GET /users:', response)),
        map(response => response.data)
      );
  }

  // Tìm kiếm users
  searchUsers(keyword?: string, schoolId?: number): Observable<User[]> {
    let params = new HttpParams();
    if (keyword) {
      params = params.set('keyword', keyword);
    }
    console.log('[API Request] GET /users/search keyword:', keyword);
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/search`, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      tap(response => console.log('[API Response] Search:', response)),
      map(response => response.data)
    );
  }

  // Lấy user theo ID
  getUserById(id: number): Observable<User> {
    console.log(`[API Request] GET /users/${id}`);
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] GET /users/${id}:`, response)),
        map(response => response.data)
      );
  }

  // Tạo user mới
  createUser(user: User): Observable<User> {
    // Convert User to backend format (remove id, createdAt, updatedAt, createBy, updateBy)
    const { id, createdAt, updatedAt, createBy, updateBy, ...userRequest } = user;

    // Convert birthYear từ "yyyy-MM-dd" sang "yyyy-MM-ddTHH:mm:ss" format cho LocalDateTime
    const requestBody = {
      ...userRequest,
      birthYear: userRequest.birthYear && userRequest.birthYear.length === 10
        ? userRequest.birthYear + 'T00:00:00'
        : userRequest.birthYear
    };

    console.log('[API Request] POST /users Payload:', requestBody);
    return this.http.post<ApiResponse<User>>(this.apiUrl, requestBody, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('[API Response] POST /users:', response)),
        map(response => response.data)
      );
  }

  // Cập nhật user
  updateUser(id: number, user: User): Observable<User> {
    // Convert User to backend format (remove id, createdAt, updatedAt, createBy)
    const { id: userId, createdAt, updatedAt, createBy, ...userRequest } = user;

    // Convert birthYear từ "yyyy-MM-dd" sang "yyyy-MM-ddTHH:mm:ss" format cho LocalDateTime
    const requestBody = {
      ...userRequest,
      birthYear: userRequest.birthYear && userRequest.birthYear.length === 10
        ? userRequest.birthYear + 'T00:00:00'
        : userRequest.birthYear
    };

    console.log(`[API Request] PUT /users/${id} Payload:`, requestBody);
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, requestBody, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] PUT /users/${id}:`, response)),
        map(response => response.data)
      );
  }

  // Xóa user
  deleteUser(id: number): Observable<void> {
    console.log(`[API Request] DELETE /users/${id}`);
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] DELETE /users/${id}:`, response)),
        map(() => void 0)
      );
  }

  // Kiểm tra xem role có đang được sử dụng bởi user nào không
  isRoleInUse(roleId: number): Observable<boolean> {
    console.log(`[API Request] GET /users/role-in-use/${roleId}`);
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/role-in-use/${roleId}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] Role in use:`, response)),
        map(response => response.data)
      );
  }

  // Lấy danh sách user đang sử dụng role
  getUsersByRoleId(roleId: number): Observable<User[]> {
    console.log(`[API Request] GET /users/by-role/${roleId}`);
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/by-role/${roleId}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] Users by role:`, response)),
        map(response => response.data)
      );
  }

  // Gán role mới cho tất cả users đang sử dụng role cũ
  reassignRole(oldRoleId: number, newRoleId: number): Observable<{ success: boolean; message?: string; updatedCount?: number }> {
    const params = new HttpParams()
      .set('oldRoleId', oldRoleId.toString())
      .set('newRoleId', newRoleId.toString());

    console.log(`[API Request] PUT /users/reassign-role?oldRoleId=${oldRoleId}&newRoleId=${newRoleId}`);
    return this.http.put<ApiResponse<string>>(`${this.apiUrl}/reassign-role`, null, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(response => console.log('[API Response] Reassign role:', response)),
      map(response => {
        const updatedCount = response.data ? parseInt(response.data, 10) : 0;
        return {
          success: true,
          message: response.message || `Đã gán role mới cho ${updatedCount} người dùng`,
          updatedCount: updatedCount
        };
      })
    );
  }
}

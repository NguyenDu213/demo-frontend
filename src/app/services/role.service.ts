import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { Role } from '../models/role.model';
import { ApiResponse } from '../models/auth.model';
import { PageResponse } from '../models/page-response.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) { }

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

  /**
   * Lấy danh sách roles (backward compatibility - không pagination)
   * Sử dụng pagination với size lớn để lấy tất cả
   */
  getRoles(typeRole?: string, schoolId?: number): Observable<Role[]> {
    // Sử dụng pagination với size lớn để lấy tất cả roles
    return this.getRolesPaginated(typeRole, 0, 1000).pipe(
      map(pageData => pageData.data)
    );
  }

  /**
   * Lấy danh sách roles với pagination
   * Backend expects: GET /api/roles?typeRole=SCHOOL&page=1&size=10
   * Note: Backend nhận page bắt đầu từ 1, nhưng frontend dùng 0-based, nên cần +1
   */
  getRolesPaginated(typeRole?: string, page: number = 0, size: number = 10): Observable<PageResponse<Role>> {
    let params = new HttpParams()
      .set('page', (page + 1).toString()) // Backend nhận page từ 1
      .set('size', size.toString());

    if (typeRole) {
      params = params.set('typeRole', typeRole);
    }

    console.log('[API Request] GET /roles (paginated)', typeRole ? `typeRole=${typeRole}` : '', `page=${page + 1}, size=${size}`);
    return this.http.get<ApiResponse<PageResponse<Role>>>(`${this.apiUrl}/roles`, { params, headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('[API Response] GET /roles (paginated):', response)),
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi lấy danh sách role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          console.error('[API Error] GET /roles (paginated):', error);
          const errorMessage = error.error?.message || error.message || 'Lỗi khi lấy danh sách role';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Tìm kiếm roles (backward compatibility - không pagination)
   * Sử dụng pagination với size lớn để lấy tất cả
   */
  searchRoles(keyword?: string, schoolId?: number, typeRole?: string): Observable<Role[]> {
    // Sử dụng pagination với size lớn để lấy tất cả roles
    return this.searchRolesPaginated(keyword, schoolId, typeRole, 0, 1000).pipe(
      map(pageData => pageData.data)
    );
  }

  /**
   * Tìm kiếm roles với pagination
   * Backend expects: GET /api/roles/search?keyword=xxx&schoolId=1&typeRole=SCHOOL&page=1&size=10
   * Note: Backend nhận page bắt đầu từ 1, nhưng frontend dùng 0-based, nên cần +1
   */
  searchRolesPaginated(keyword?: string, schoolId?: number, typeRole?: string, page: number = 0, size: number = 10): Observable<PageResponse<Role>> {
    let params = new HttpParams()
      .set('page', (page + 1).toString()) // Backend nhận page từ 1
      .set('size', size.toString());

    if (keyword && keyword.trim()) {
      params = params.set('keyword', keyword.trim());
    }
    if (schoolId !== undefined) {
      params = params.set('schoolId', schoolId.toString());
    }
    if (typeRole) {
      params = params.set('typeRole', typeRole);
    }

    console.log('[API Request] GET /roles/search (paginated)', keyword ? `keyword=${keyword}` : '', schoolId ? `schoolId=${schoolId}` : '', typeRole ? `typeRole=${typeRole}` : '', `page=${page + 1}, size=${size}`);
    return this.http.get<ApiResponse<PageResponse<Role>>>(`${this.apiUrl}/roles/search`, { params, headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('[API Response] GET /roles/search (paginated):', response)),
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi tìm kiếm role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          console.error('[API Error] GET /roles/search (paginated):', error);
          const errorMessage = error.error?.message || error.message || 'Lỗi khi tìm kiếm role';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Lấy role theo ID
   * Backend expects: GET /api/roles/{id}
   */
  getRoleById(id: number): Observable<Role> {
    console.log(`[API Request] GET /roles/${id}`);
    return this.http.get<ApiResponse<Role>>(`${this.apiUrl}/roles/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] GET /roles/${id}:`, response)),
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Không tìm thấy role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          console.error(`[API Error] GET /roles/${id}:`, error);
          const errorMessage = error.error?.message || error.message || 'Không tìm thấy role';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Tạo role mới
   * Backend expects: POST /api/roles
   */
  createRole(role: Role): Observable<Role> {
    // Convert Role to backend format (remove id, createdAt, updatedAt, userCount, schoolName)
    const { id, createdAt, updatedAt, userCount, schoolName, ...roleRequest } = role as any;

    console.log('[API Request] POST /roles Payload:', roleRequest);
    return this.http.post<ApiResponse<Role>>(`${this.apiUrl}/roles`, roleRequest, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('[API Response] POST /roles:', response)),
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi tạo role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          console.error('[API Error] POST /roles:', error);
          const errorMessage = error.error?.message || error.message || 'Lỗi khi tạo role';
          throw { error: { message: errorMessage, data: error.error?.data } };
        })
      );
  }

  /**
   * Cập nhật role
   * Backend expects: PUT /api/roles/{id}
   */
  updateRole(id: number, role: Role): Observable<Role> {
    // Convert Role to backend format (remove id, createdAt, updatedAt, userCount, schoolName)
    const { id: roleId, createdAt, updatedAt, userCount, schoolName, ...roleRequest } = role as any;

    console.log(`[API Request] PUT /roles/${id} Payload:`, roleRequest);
    return this.http.put<ApiResponse<Role>>(`${this.apiUrl}/roles/${id}`, roleRequest, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] PUT /roles/${id}:`, response)),
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi cập nhật role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          console.error(`[API Error] PUT /roles/${id}:`, error);
          const errorMessage = error.error?.message || error.message || 'Lỗi khi cập nhật role';
          throw { error: { message: errorMessage, data: error.error?.data } };
        })
      );
  }

  /**
   * Xóa role
   * Backend expects: DELETE /api/roles/{id}
   * Backend will return error if role is in use
   */
  deleteRole(id: number): Observable<{ success: boolean; message?: string }> {
    console.log(`[API Request] DELETE /roles/${id}`);
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/roles/${id}`, { headers: this.getHeaders() }).pipe(
      tap(response => console.log(`[API Response] DELETE /roles/${id}:`, response)),
      map(apiResponse => {
        if (!apiResponse.status) {
          throw new Error(apiResponse.message || 'Lỗi khi xóa role');
        }
        return { success: true, message: apiResponse.data || apiResponse.message };
      }),
      catchError((error) => {
        console.error(`[API Error] DELETE /roles/${id}:`, error);
        // Backend sẽ trả về lỗi nếu role đang được sử dụng
        const message = error.error?.message || error.message || 'Không thể xóa role này.';
        const statusCode = error.status;
        return new Observable<{ success: boolean; message?: string; statusCode?: number }>(observer => {
          observer.next({ success: false, message, statusCode });
          observer.complete();
        });
      })
    );
  }

  /**
   * Gán role mới cho users và xóa role cũ
   * Backend expects: POST /api/roles/{oldRoleId}/reassign-and-delete?newRoleId={newRoleId}
   */
  reassignRoleAndDelete(oldRoleId: number, newRoleId: number): Observable<{ success: boolean; message?: string }> {
    const params = new HttpParams().set('newRoleId', newRoleId.toString());
    console.log(`[API Request] POST /roles/${oldRoleId}/reassign-and-delete?newRoleId=${newRoleId}`);
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/roles/${oldRoleId}/reassign-and-delete`, null, {
      params,
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log(`[API Response] POST /roles/${oldRoleId}/reassign-and-delete:`, response)),
      map(apiResponse => {
        if (!apiResponse.status) {
          throw new Error(apiResponse.message || 'Lỗi khi gán role mới và xóa role cũ');
        }
        return { success: true, message: apiResponse.data || apiResponse.message };
      }),
      catchError((error) => {
        console.error(`[API Error] POST /roles/${oldRoleId}/reassign-and-delete:`, error);
        const message = error.error?.message || error.message || 'Không thể gán role mới và xóa role cũ.';
        throw { error: { message } };
      })
    );
  }
}

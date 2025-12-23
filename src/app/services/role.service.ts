import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Role } from '../models/role.model';
import { ApiResponse } from '../models/auth.model';
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

  /**
   * Lấy danh sách roles
   * Backend expects: GET /api/roles?typeRole=PROVIDER hoặc /api/roles?typeRole=SCHOOL&schoolId=1
   */
  getRoles(typeRole?: string, schoolId?: number): Observable<Role[]> {
    let params = new HttpParams();
    if (typeRole) {
      params = params.set('typeRole', typeRole);
    }
    if (schoolId !== undefined) {
      params = params.set('schoolId', schoolId.toString());
    }

    return this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/roles`, { params })
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi lấy danh sách role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi lấy danh sách role';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Tìm kiếm roles theo keyword (chỉ tìm trong roleName)
   * Backend expects: GET /api/roles/search?keyword=xxx&typeRole=PROVIDER&schoolId=1
   */
  searchRoles(keyword: string, typeRole?: string, schoolId?: number): Observable<Role[]> {
    let params = new HttpParams();

    if (keyword && keyword.trim()) {
      params = params.set('keyword', keyword.trim());
    }
    if (typeRole) {
      params = params.set('typeRole', typeRole);
    }
    if (schoolId !== undefined) {
      params = params.set('schoolId', schoolId.toString());
    }

    return this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/roles/search`, { params })
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi tìm kiếm role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
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
    return this.http.get<ApiResponse<Role>>(`${this.apiUrl}/roles/${id}`)
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Không tìm thấy role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
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
    // Convert Role to backend format (remove id, createdAt, updatedAt, createBy, updateBy, userCount, schoolName)
    const { id, createdAt, updatedAt, createBy, updateBy, userCount, schoolName, ...roleRequest } = role as any;

    return this.http.post<ApiResponse<Role>>(`${this.apiUrl}/roles`, roleRequest)
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi tạo role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi tạo role';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Cập nhật role
   * Backend expects: PUT /api/roles/{id}
   */
  updateRole(id: number, role: Role): Observable<Role> {
    // Convert Role to backend format (remove id, createdAt, updatedAt, createBy, updateBy, userCount, schoolName)
    const { id: roleId, createdAt, updatedAt, createBy, updateBy, userCount, schoolName, ...roleRequest } = role as any;

    return this.http.put<ApiResponse<Role>>(`${this.apiUrl}/roles/${id}`, roleRequest)
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi cập nhật role');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi cập nhật role';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Xóa role
   * Backend expects: DELETE /api/roles/{id}
   * Backend will return error if role is in use
   */
  deleteRole(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/roles/${id}`).pipe(
      map(apiResponse => {
        if (!apiResponse.status) {
          throw new Error(apiResponse.message || 'Lỗi khi xóa role');
        }
        return { success: true };
      }),
      catchError((error) => {
        // Backend sẽ trả về lỗi nếu role đang được sử dụng
        const message = error.error?.message || error.message || 'Không thể xóa role này.';
        return new Observable<{ success: boolean; message?: string }>(observer => {
          observer.next({ success: false, message });
          observer.complete();
        });
      })
    );
  }
}

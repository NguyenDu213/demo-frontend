import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { ApiResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Lấy danh sách users
   * Backend expects: GET /api/users
   * Backend lấy userId từ JWT token trong header
   */
  getUsers(scope?: string, schoolId?: number): Observable<User[]> {
    // Note: Backend lấy currentUserId từ JWT token trong Authorization header
    // Backend filters based on current user's permissions
    // scope and schoolId parameters are kept for compatibility but backend handles filtering

    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`)
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi lấy danh sách người dùng');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi lấy danh sách người dùng';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Tìm kiếm users
   * Backend expects: GET /api/users/search?keyword=xxx
   * Backend lấy userId từ JWT token trong header
   */
  searchUsers(keyword?: string, schoolId?: number): Observable<User[]> {
    let params = new HttpParams();

    if (keyword) {
      params = params.set('keyword', keyword);
    }
    // Note: schoolId parameter kept for compatibility but backend handles filtering based on user's permissions

    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users/search`, { params })
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi tìm kiếm người dùng');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi tìm kiếm người dùng';
          throw { error: { message: errorMessage } };
        })
      );
  }

  getUserById(id: number): Observable<User> {
    // Backend doesn't have a direct getUserById endpoint, use search or get all and filter
    return this.getUsers().pipe(
      map(users => {
        const user = users.find(u => u.id === id);
        if (!user) {
          throw new Error('Không tìm thấy người dùng');
        }
        return user;
      }),
      catchError(error => {
        const errorMessage = error.error?.message || error.message || 'Không tìm thấy người dùng';
        throw { error: { message: errorMessage } };
      })
    );
  }

  /**
   * Tạo user mới
   * Backend expects: POST /api/users
   * Backend lấy userId từ JWT token trong header
   */
  createUser(user: User): Observable<User> {
    // Convert User to backend format (remove id, createdAt, updatedAt, createBy, updateBy)
    // Backend không mong đợi createBy và updateBy vì nó lấy từ JWT token
    const { id, createdAt, updatedAt, createBy, updateBy, ...userRequest } = user;

    // Convert birthYear từ "yyyy-MM-dd" sang "yyyy-MM-ddTHH:mm:ss" format cho LocalDateTime
    const requestBody = {
      ...userRequest,
      birthYear: userRequest.birthYear && userRequest.birthYear.length === 10
        ? userRequest.birthYear + 'T00:00:00'
        : userRequest.birthYear
    };

    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/users`, requestBody)
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi tạo người dùng');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi tạo người dùng';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Cập nhật user
   * Backend expects: PUT /api/users/{id}
   * Backend lấy userId từ JWT token trong header
   */
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

    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/users/${id}`, requestBody)
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Lỗi khi cập nhật người dùng');
          }
          return apiResponse.data;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi cập nhật người dùng';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Xóa user
   * Backend expects: DELETE /api/users/{id}
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/users/${id}`)
      .pipe(
        map(apiResponse => {
          if (!apiResponse.status) {
            throw new Error(apiResponse.message || 'Lỗi khi xóa người dùng');
          }
          return void 0;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.message || 'Lỗi khi xóa người dùng';
          throw { error: { message: errorMessage } };
        })
      );
  }

  /**
   * Kiểm tra xem role có đang được sử dụng bởi user nào không
   * GET /api/users/role-in-use/{roleId}
   */
  isRoleInUse(roleId: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/users/role-in-use/${roleId}`).pipe(
      map(apiResponse => {
        if (!apiResponse.status || apiResponse.data === undefined) {
          // If error, assume role is in use to be safe
          return true;
        }
        return apiResponse.data;
      }),
      catchError(() => {
        // If error, assume role is in use to be safe
        return new Observable<boolean>(observer => {
          observer.next(true);
          observer.complete();
        });
      })
    );
  }

  /**
   * Lấy danh sách user đang sử dụng role
   * GET /api/users/by-role/{roleId}
   */
  getUsersByRoleId(roleId: number): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users/by-role/${roleId}`).pipe(
      map(apiResponse => {
        if (!apiResponse.status || !apiResponse.data) {
          throw new Error(apiResponse.message || 'Lỗi khi lấy danh sách users');
        }
        return apiResponse.data;
      }),
      catchError(error => {
        const errorMessage = error.error?.message || error.message || 'Lỗi khi lấy danh sách users';
        throw { error: { message: errorMessage } };
      })
    );
  }

  /**
   * Gán role mới cho tất cả users đang sử dụng role cũ
   * PUT /api/users/reassign-role?oldRoleId={oldRoleId}&newRoleId={newRoleId}
   */
  reassignRole(oldRoleId: number, newRoleId: number): Observable<{ success: boolean; message?: string; updatedCount?: number }> {
    const params = new HttpParams()
      .set('oldRoleId', oldRoleId.toString())
      .set('newRoleId', newRoleId.toString());

    return this.http.put<ApiResponse<string>>(`${this.apiUrl}/users/reassign-role`, null, { params }).pipe(
      map(apiResponse => {
        if (!apiResponse.status) {
          return {
            success: false,
            message: apiResponse.message || 'Không thể gán role mới'
          };
        }
        const updatedCount = apiResponse.data ? parseInt(apiResponse.data, 10) : 0;
        return {
          success: true,
          message: apiResponse.message || `Đã gán role mới cho ${updatedCount} người dùng`,
          updatedCount: updatedCount
        };
      }),
      catchError(error => {
        const errorMessage = error.error?.message || error.message || 'Lỗi khi gán role mới';
        return new Observable<{ success: boolean; message?: string; updatedCount?: number }>(observer => {
          observer.next({ success: false, message: errorMessage });
          observer.complete();
        });
      })
    );
  }
}

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';

/**
 * Service để quản lý context của user hiện tại và các helper methods
 * Đảm bảo tương thích với cả mock data và real API
 */
@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  private currentUserRoleCache: Map<number, Role> = new Map();

  constructor(
    private authService: AuthService,
    private roleService: RoleService
  ) {}

  /**
   * Lấy ID của user hiện tại
   * Fallback về 1 nếu không có user (cho mock data)
   */
  getCurrentUserId(): number {
    const user = this.authService.getCurrentUser();
    return user?.id || 1; // Fallback cho mock data
  }

  /**
   * Lấy user hiện tại
   */
  getCurrentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  /**
   * Lấy role của user hiện tại (có cache)
   */
  getCurrentUserRole(): Observable<Role | null> {
    const user = this.authService.getCurrentUser();
    if (!user || !user.roleId) {
      return of(null);
    }

    // Check cache
    if (this.currentUserRoleCache.has(user.roleId)) {
      return of(this.currentUserRoleCache.get(user.roleId)!);
    }

    // Load role từ service và cache lại
    return this.roleService.getRoleById(user.roleId).pipe(
      map(role => {
        if (role) {
          this.currentUserRoleCache.set(user.roleId!, role);
        }
        return role;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Kiểm tra user hiện tại có role name cụ thể không
   */
  hasRoleName(roleName: string): Observable<boolean> {
    return this.getCurrentUserRole().pipe(
      map(role => role?.roleName === roleName || false),
      catchError(() => of(false))
    );
  }

  /**
   * Kiểm tra user hiện tại có phải System Admin không
   * Dựa trên roleName thay vì roleId để tương thích với cả mock và real API
   */
  isSystemAdmin(): Observable<boolean> {
    return this.hasRoleName('SYSTEM_ADMIN');
  }

  /**
   * Kiểm tra user hiện tại có phải School Admin không
   */
  isSchoolAdmin(): Observable<boolean> {
    return this.hasRoleName('SCHOOL_ADMIN');
  }

  /**
   * Kiểm tra user có thể edit email/password không
   * Chỉ System Admin và School Admin mới có quyền này
   */
  canEditEmailPassword(): Observable<boolean> {
    return this.getCurrentUserRole().pipe(
      map(role => {
        if (!role) return false;
        return role.roleName === 'SYSTEM_ADMIN' || role.roleName === 'SCHOOL_ADMIN';
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Kiểm tra role có phải System Admin không (dựa trên roleName)
   */
  isSystemAdminRole(role: Role | null): boolean {
    return role?.roleName === 'SYSTEM_ADMIN' || false;
  }

  /**
   * Kiểm tra role có phải School Admin không (dựa trên roleName)
   */
  isSchoolAdminRole(role: Role | null): boolean {
    return role?.roleName === 'SCHOOL_ADMIN' || false;
  }

  /**
   * Clear cache khi cần (ví dụ khi logout hoặc update role)
   */
  clearCache(): void {
    this.currentUserRoleCache.clear();
  }
}


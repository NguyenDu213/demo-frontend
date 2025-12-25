import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { LoginRequest, LoginResponse, ApiResponse } from '../models/auth.model';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { RoleService } from './role.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:8080/api'; // Update with your backend URL
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    private currentUserRoleCache: Role | null = null;
    private roleService?: RoleService;

    constructor(
        private http: HttpClient,
        private injector: Injector
    ) {
        // Load user from localStorage on init
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            this.currentUserSubject.next(user);
            this.loadCurrentUserRole();
        }
    }

    private getRoleService(): RoleService {
        if (!this.roleService) {
            this.roleService = this.injector.get(RoleService);
        }
        return this.roleService;
    }

    /**
     * Load và cache role của user hiện tại
     * Cache trong memory và localStorage để đảm bảo luôn có sẵn
     */
    private loadCurrentUserRole(): void {
        const user = this.getCurrentUser();
        if (!user || !user.roleId) {
            this.currentUserRoleCache = null;
            localStorage.removeItem('currentUserRole');
            return;
        }

        // Kiểm tra cache trong localStorage trước
        const cachedRole = localStorage.getItem('currentUserRole');
        if (cachedRole) {
            try {
                const role = JSON.parse(cachedRole);
                // Verify role ID matches current user's roleId
                if (role.id === user.roleId) {
                    this.currentUserRoleCache = role;
                    return;
                }
            } catch (e) {
                // Invalid cache, continue to load from service
            }
        }

        // Load role từ service và cache lại
        this.getRoleService().getRoleById(user.roleId).subscribe({
            next: (role) => {
                this.currentUserRoleCache = role;
                // Cache vào localStorage để dùng cho lần sau
                if (role) {
                    localStorage.setItem('currentUserRole', JSON.stringify(role));
                }
            },
            error: () => {
                this.currentUserRoleCache = null;
                localStorage.removeItem('currentUserRole');
            }
        });
    }

    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, credentials)
            .pipe(
                map(apiResponse => {
                    // Extract data từ ApiResponse wrapper
                    if (!apiResponse.status || !apiResponse.data) {
                        throw new Error(apiResponse.message || 'Đăng nhập thất bại');
                    }
                    return apiResponse.data;
                }),
                switchMap(response => {
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                    this.currentUserSubject.next(response.user as any);

                    // Load role từ API và đợi load xong trước khi return
                    return this.getRoleService().getRoleById(response.user.roleId).pipe(
                        tap(role => {
                            if (role) {
                                this.currentUserRoleCache = role;
                                localStorage.setItem('currentUserRole', JSON.stringify(role));
                            }
                        }),
                        catchError(() => {
                            // Nếu load role fail, vẫn cho login nhưng clear cache
                            this.currentUserRoleCache = null;
                            localStorage.removeItem('currentUserRole');
                            return of(null);
                        }),
                        map(() => response) // Return login response sau khi load role xong
                    );
                }),
                catchError(error => {
                    // Xử lý error từ backend (GlobalExceptionHandler)
                    const errorMessage = error.error?.message || error.message || 'Đăng nhập thất bại';
                    throw { error: { message: errorMessage } };
                })
            );
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserRole');
        this.currentUserSubject.next(null);
        // Clear role cache khi logout
        this.currentUserRoleCache = null;
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    isProvider(): boolean {
        const user = this.getCurrentUser();
        // Backend trả về "PROVIDER", normalize để match
        return user?.scope?.toUpperCase() === 'PROVIDER';
    }

    isSchool(): boolean {
        const user = this.getCurrentUser();
        // Backend trả về "SCHOOL", normalize để match
        return user?.scope?.toUpperCase() === 'SCHOOL';
    }

    /**
     * Kiểm tra user hiện tại có phải School Admin không
     * Dựa trên roleName
     * Role được cache khi login và load từ localStorage nếu cần
     */
    isSchoolAdmin(): boolean {
        const user = this.getCurrentUser();
        // Backend trả về "SCHOOL", normalize để check
        if (!user || user.scope?.toUpperCase() !== 'SCHOOL') {
            return false;
        }

        // Nếu chưa có cache trong memory, thử load từ localStorage
        if (!this.currentUserRoleCache) {
            const cachedRole = localStorage.getItem('currentUserRole');
            if (cachedRole) {
                try {
                    const role = JSON.parse(cachedRole);
                    if (role.id === user.roleId) {
                        this.currentUserRoleCache = role;
                    }
                } catch (e) {
                    // Invalid cache, try to load
                }
            }

            // Nếu vẫn chưa có cache, load từ service (async)
            if (!this.currentUserRoleCache) {
                this.loadCurrentUserRole();
                return false;
            }
        }

        // Check từ cache dựa trên roleName
        return this.currentUserRoleCache?.roleName === 'SCHOOL_ADMIN' || false;
    }

    /**
     * Kiểm tra user hiện tại có phải Provider Admin (System Admin) không
     * Dựa trên roleName
     * Role được cache khi login và load từ localStorage nếu cần
     */
    isProviderAdmin(): boolean {
        const user = this.getCurrentUser();
        // Backend trả về "PROVIDER", normalize để check
        if (!user || user.scope?.toUpperCase() !== 'PROVIDER') {
            return false;
        }

        // Nếu chưa có cache trong memory, thử load từ localStorage
        if (!this.currentUserRoleCache) {
            const cachedRole = localStorage.getItem('currentUserRole');
            if (cachedRole) {
                try {
                    const role = JSON.parse(cachedRole);
                    if (role.id === user.roleId) {
                        this.currentUserRoleCache = role;
                    }
                } catch (e) {
                    // Invalid cache, try to load
                }
            }

            // Nếu vẫn chưa có cache, load từ service (async)
            if (!this.currentUserRoleCache) {
                this.loadCurrentUserRole();
                return false;
            }
        }

        // Check từ cache dựa trên roleName
        const isAdmin = this.currentUserRoleCache?.roleName === 'SYSTEM_ADMIN' || false;
        return isAdmin;
    }

    /**
     * Lấy ID của user hiện tại
     */
    getCurrentUserId(): number {
        const user = this.getCurrentUser();
        return user?.id || 0;
    }
}


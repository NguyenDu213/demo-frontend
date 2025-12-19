import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, delay, firstValueFrom } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { LoginRequest, LoginResponse, ApiResponse } from '../models/auth.model';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { MOCK_USERS, MOCK_LOGIN_CREDENTIALS, MOCK_ROLES } from '../data/mock-data';
import { RoleService } from './role.service';

// Set to true to use mock data instead of real API
const USE_MOCK_DATA = false;

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
            
            // Load role ngay lập tức (synchronous với mock data)
            // Đảm bảo role có sẵn khi guard check
            // Với mock data, load trực tiếp từ MOCK_ROLES để có sẵn ngay
            if (USE_MOCK_DATA && user.roleId) {
                const role = MOCK_ROLES.find(r => r.id === user.roleId);
                if (role) {
                    this.currentUserRoleCache = role;
                    // Chỉ cache vào localStorage nếu chưa có
                    if (!localStorage.getItem('currentUserRole')) {
                        localStorage.setItem('currentUserRole', JSON.stringify(role));
                    }
                } else {
                    this.loadCurrentUserRole();
                }
            } else {
                this.loadCurrentUserRole();
            }
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
     * Với mock data, load ngay từ MOCK_ROLES để đảm bảo có sẵn ngay lập tức
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

        // Với mock data, load ngay từ MOCK_ROLES để có sẵn ngay lập tức
        if (USE_MOCK_DATA) {
            const role = MOCK_ROLES.find(r => r.id === user.roleId);
            if (role) {
                this.currentUserRoleCache = role;
                localStorage.setItem('currentUserRole', JSON.stringify(role));
                return;
            }
        }

        // Load role từ service và cache lại (cho real API)
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
        if (USE_MOCK_DATA) {
            // Tìm user trực tiếp trong MOCK_USERS thay vì dùng MOCK_LOGIN_CREDENTIALS
            const user = MOCK_USERS.find(
                u => u.email === credentials.email && u.password === credentials.password && u.isActive === true
            );

            if (user) {
                const response: LoginResponse = {
                    token: 'mock-jwt-token-' + Date.now(),
                    user: {
                        id: user.id!,
                        email: user.email,
                        fullName: user.fullName,
                        scope: user.scope,
                        schoolId: user.schoolId ?? undefined,
                        roleId: user.roleId
                    }
                };

                localStorage.setItem('token', response.token);
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                this.currentUserSubject.next(response.user as any);
                
                // Load và cache role ngay lập tức từ MOCK_ROLES (synchronous)
                // Đảm bảo role có sẵn khi guard check
                // Với mock data, load trực tiếp từ MOCK_ROLES để có sẵn ngay
                if (USE_MOCK_DATA && user.roleId) {
                    const role = MOCK_ROLES.find(r => r.id === user.roleId);
                    if (role) {
                        this.currentUserRoleCache = role;
                        localStorage.setItem('currentUserRole', JSON.stringify(role));
                    }
                } else {
                    this.loadCurrentUserRole();
                }

                return of(response).pipe(delay(500)); // Simulate network delay
            }

            // Return error
            return new Observable(observer => {
                setTimeout(() => {
                    observer.error({ error: { message: 'Email hoặc mật khẩu không đúng' } });
                }, 500);
            });
        }

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
     * Dựa trên roleName thay vì roleId để tương thích với cả mock và real API
     * Role được cache khi login và load từ localStorage nếu cần
     */
    isSchoolAdmin(): boolean {
        const user = this.getCurrentUser();
        // Backend trả về "SCHOOL", normalize để check
        if (!user || user.scope?.toUpperCase() !== 'SCHOOL') {
            return false;
        }

        // Nếu chưa có cache trong memory, thử load từ localStorage hoặc MOCK_ROLES
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
            
            // Nếu vẫn chưa có cache và đang dùng mock data, load ngay từ MOCK_ROLES
            if (!this.currentUserRoleCache && USE_MOCK_DATA && user.roleId) {
                const role = MOCK_ROLES.find(r => r.id === user.roleId);
                if (role) {
                    this.currentUserRoleCache = role;
                    localStorage.setItem('currentUserRole', JSON.stringify(role));
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
     * Dựa trên roleName thay vì roleId để tương thích với cả mock và real API
     * Role được cache khi login và load từ localStorage nếu cần
     */
    isProviderAdmin(): boolean {
        const user = this.getCurrentUser();
        // Backend trả về "PROVIDER", normalize để check
        if (!user || user.scope?.toUpperCase() !== 'PROVIDER') {
            return false;
        }

        // Nếu chưa có cache trong memory, thử load từ localStorage hoặc MOCK_ROLES
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
            
            // Nếu vẫn chưa có cache và đang dùng mock data, load ngay từ MOCK_ROLES
            // Đây là fallback quan trọng để đảm bảo role luôn có sẵn
            if (!this.currentUserRoleCache && USE_MOCK_DATA && user.roleId) {
                const role = MOCK_ROLES.find(r => r.id === user.roleId);
                if (role) {
                    this.currentUserRoleCache = role;
                    localStorage.setItem('currentUserRole', JSON.stringify(role));
                }
            }
            
            // Nếu vẫn chưa có cache, load từ service (async)
            // Nhưng với mock data, điều này không nên xảy ra
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
     * Fallback về 1 nếu không có user (cho mock data)
     */
    getCurrentUserId(): number {
        const user = this.getCurrentUser();
        return user?.id || 1;
    }
}


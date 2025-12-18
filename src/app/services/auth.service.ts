import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, delay } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { User } from '../models/user.model';
import { MOCK_USERS, MOCK_LOGIN_CREDENTIALS } from '../data/mock-data';

// Set to true to use mock data instead of real API
const USE_MOCK_DATA = true;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:8080/api'; // Update with your backend URL
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        // Load user from localStorage on init
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUserSubject.next(JSON.parse(savedUser));
        }
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

                return of(response).pipe(delay(500)); // Simulate network delay
            }

            // Return error
            return new Observable(observer => {
                setTimeout(() => {
                    observer.error({ error: { message: 'Email hoặc mật khẩu không đúng' } });
                }, 500);
            });
        }

        return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
            .pipe(
                tap(response => {
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                    this.currentUserSubject.next(response.user as any);
                })
            );
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
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
        return user?.scope === 'Provider';
    }

    isSchool(): boolean {
        const user = this.getCurrentUser();
        return user?.scope === 'School';
    }

    isSchoolAdmin(): boolean {
        const user = this.getCurrentUser();
        if (!user || user.scope !== 'School') {
            return false;
        }
        // roleId 3 là School Admin theo mock data
        // Trong thực tế cần call API để lấy role name
        return user.roleId === 3;
    }

    isProviderAdmin(): boolean {
        const user = this.getCurrentUser();
        if (!user || user.scope !== 'Provider') {
            return false;
        }
        // roleId 1 là System Admin theo mock data
        return user.roleId === 1;
    }
}


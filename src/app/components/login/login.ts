import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/auth.model';

@Component({
    selector: 'app-login',
    templateUrl: './login.html',
    styleUrls: ['./login.scss'],
    standalone: false
})
export class LoginComponent {
    email: string = '';
    password: string = '';
    isLoading: boolean = false;
    errorMessage: string = '';

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    onSubmit(): void {
        if (!this.email || !this.password) {
            this.errorMessage = 'Vui lòng nhập đầy đủ thông tin';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const credentials: LoginRequest = {
            email: this.email,
            password: this.password
        };

        this.authService.login(credentials).subscribe({
            next: (response) => {
                this.isLoading = false;
                const user = response.user;
                
                console.log('Login successful:', user);
                
                // Đợi một chút để đảm bảo role được cache
                setTimeout(() => {
                    // Backend trả về "PROVIDER" hoặc "SCHOOL", normalize để check
                    const scope = user.scope?.toUpperCase();
                    console.log('Navigating with scope:', scope);
                    
                    if (scope === 'PROVIDER') {
                        this.router.navigate(['/provider/home']).catch(err => {
                            console.error('Navigation error:', err);
                            this.errorMessage = 'Không thể chuyển đến trang quản lý';
                        });
                    } else if (scope === 'SCHOOL') {
                        this.router.navigate(['/school/home']).catch(err => {
                            console.error('Navigation error:', err);
                            this.errorMessage = 'Không thể chuyển đến trang quản lý';
                        });
                    } else {
                        console.warn('Unknown scope:', scope);
                        this.router.navigate(['/']);
                    }
                }, 200); // Đợi 200ms để đảm bảo role được cache và guards có thể check
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
            }
        });
    }
}


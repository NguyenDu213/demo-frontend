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
                
                // Đợi một chút để đảm bảo role được cache (đặc biệt với mock data)
                setTimeout(() => {
                    if (user.scope === 'Provider') {
                        this.router.navigate(['/provider/home']);
                    } else if (user.scope === 'School') {
                        this.router.navigate(['/school/home']);
                    } else {
                        this.router.navigate(['/']);
                    }
                }, 100); // Đợi 100ms để đảm bảo role được cache
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
            }
        });
    }
}


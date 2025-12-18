import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProviderAdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // Đảm bảo role được load trước khi check
    // Với mock data, role sẽ được load ngay lập tức trong isProviderAdmin()
    const isAdmin = this.authService.isProviderAdmin();
    
    if (isAdmin) {
      return true;
    }
    
    // Redirect về trang chủ nếu không phải admin
    this.router.navigate(['/provider/home']);
    return false;
  }
}


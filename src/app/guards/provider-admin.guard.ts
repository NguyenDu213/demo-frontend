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
    if (this.authService.isProviderAdmin()) {
      return true;
    }
    
    // Redirect về trang chủ nếu không phải admin
    this.router.navigate(['/provider/home']);
    return false;
  }
}


import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SchoolAdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isSchoolAdmin()) {
      return true;
    }
    
    // Redirect về trang chủ nếu không phải admin
    this.router.navigate(['/school/home']);
    return false;
  }
}


import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
  standalone: false
})
export class LayoutComponent implements OnInit {
  currentUser: User | null = null;
  isSidebarOpen: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isProvider(): boolean {
    return this.authService.isProvider();
  }

  isSchool(): boolean {
    return this.authService.isSchool();
  }

  isSchoolAdmin(): boolean {
    return this.authService.isSchoolAdmin();
  }

  isProviderAdmin(): boolean {
    return this.authService.isProviderAdmin();
  }
}


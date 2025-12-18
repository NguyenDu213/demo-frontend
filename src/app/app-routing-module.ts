import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { LayoutComponent } from './components/layout/layout';
import { ProviderHomeComponent } from './pages/provider/home/home';
import { ProviderSchoolsComponent } from './pages/provider/schools/schools';
import { ProviderUsersComponent } from './pages/provider/users/users';
import { ProviderRolesComponent } from './pages/provider/roles/roles';
import { SchoolHomeComponent } from './pages/school/home/home';
import { SchoolUsersComponent } from './pages/school/users/users';
import { SchoolRolesComponent } from './pages/school/roles/roles';
import { AuthGuard } from './guards/auth.guard';
import { ProviderGuard } from './guards/provider.guard';
import { SchoolGuard } from './guards/school.guard';
import { SchoolAdminGuard } from './guards/school-admin.guard';
import { ProviderAdminGuard } from './guards/provider-admin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'provider',
    component: LayoutComponent,
    canActivate: [AuthGuard, ProviderGuard],
    children: [
      { path: 'home', component: ProviderHomeComponent },
      { path: 'schools', component: ProviderSchoolsComponent, canActivate: [ProviderAdminGuard] },
      { path: 'users', component: ProviderUsersComponent, canActivate: [ProviderAdminGuard] },
      { path: 'roles', component: ProviderRolesComponent, canActivate: [ProviderAdminGuard] },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  {
    path: 'school',
    component: LayoutComponent,
    canActivate: [AuthGuard, SchoolGuard],
    children: [
      { path: 'home', component: SchoolHomeComponent },
      { path: 'users', component: SchoolUsersComponent, canActivate: [SchoolAdminGuard] },
      { path: 'roles', component: SchoolRolesComponent, canActivate: [SchoolAdminGuard] },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

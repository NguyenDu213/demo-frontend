import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

import { App } from './app';
import { AppRoutingModule } from './app-routing-module';

// Login & Layout Components
import { LoginComponent } from './components/login/login';
import { LayoutComponent } from './components/layout/layout';

// Provider Pages
import { ProviderHomeComponent } from './pages/provider/home/home';
import { ProviderSchoolsComponent } from './pages/provider/schools/schools';
import { ProviderUsersComponent } from './pages/provider/users/users';
import { ProviderRolesComponent } from './pages/provider/roles/roles';

// School Pages
import { SchoolHomeComponent } from './pages/school/home/home';
import { SchoolUsersComponent } from './pages/school/users/users';
import { SchoolRolesComponent } from './pages/school/roles/roles';

// Đăng ký locale tiếng Anh cho Angular
registerLocaleData(en);

@NgModule({
  declarations: [
    App,
    // Login & Layout
    LoginComponent,
    LayoutComponent,
    // Provider Pages
    ProviderHomeComponent,
    ProviderSchoolsComponent,
    ProviderUsersComponent,
    ProviderRolesComponent,
    // School Pages
    SchoolHomeComponent,
    SchoolUsersComponent,
    SchoolRolesComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    provideHttpClient(),
    provideAnimationsAsync()
  ],
  bootstrap: [App]
})
export class AppModule { }
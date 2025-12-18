import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, switchMap } from 'rxjs';
import { School } from '../models/school.model';
import { User, Gender, Scope } from '../models/user.model';
import { MOCK_SCHOOLS } from '../data/mock-data';
import { UserService } from './user.service';
import { RoleService } from './role.service';

// Set to true to use mock data instead of real API
const USE_MOCK_DATA = true;

@Injectable({
  providedIn: 'root'
})
export class SchoolService {
  private apiUrl = 'http://localhost:8080/api'; // Update with your backend URL
  private mockDataKey = 'mock_schools';
  private userService?: UserService;
  private roleService?: RoleService;

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    if (USE_MOCK_DATA) {
      this.initializeMockData();
    }
  }

  private getUserService(): UserService {
    if (!this.userService) {
      this.userService = this.injector.get(UserService);
    }
    return this.userService;
  }

  private getRoleService(): RoleService {
    if (!this.roleService) {
      this.roleService = this.injector.get(RoleService);
    }
    return this.roleService;
  }

  private initializeMockData(): void {
    if (!localStorage.getItem(this.mockDataKey)) {
      localStorage.setItem(this.mockDataKey, JSON.stringify(MOCK_SCHOOLS));
    }
  }

  private getMockSchools(): School[] {
    const data = localStorage.getItem(this.mockDataKey);
    return data ? JSON.parse(data) : [];
  }

  private saveMockSchools(schools: School[]): void {
    localStorage.setItem(this.mockDataKey, JSON.stringify(schools));
  }

  getAllSchools(): Observable<School[]> {
    if (USE_MOCK_DATA) {
      return of(this.getMockSchools()).pipe(delay(300));
    }
    return this.http.get<School[]>(`${this.apiUrl}/schools`);
  }

  getSchoolById(id: number): Observable<School> {
    if (USE_MOCK_DATA) {
      const schools = this.getMockSchools();
      const school = schools.find(s => s.id === id);
      if (school) {
        return of(school).pipe(delay(300));
      }
      return new Observable(observer => {
        setTimeout(() => observer.error({ error: { message: 'Không tìm thấy trường học' } }), 300);
      });
    }
    return this.http.get<School>(`${this.apiUrl}/schools/${id}`);
  }

  createSchool(school: School): Observable<School> {
    if (USE_MOCK_DATA) {
      const schools = this.getMockSchools();
      const newId = Math.max(...schools.map(s => s.id || 0), 0) + 1;
      const newSchool: School = {
        ...school,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      schools.push(newSchool);
      this.saveMockSchools(schools);

      // Tự động tạo tài khoản admin school cho trường mới
      this.createSchoolAdmin(newSchool).subscribe({
        next: () => {
          console.log('Đã tạo tài khoản admin school cho trường:', newSchool.name);
        },
        error: (error) => {
          console.error('Lỗi khi tạo tài khoản admin school:', error);
        }
      });

      return of(newSchool).pipe(delay(500));
    }
    return this.http.post<School>(`${this.apiUrl}/schools`, school);
  }

  private createSchoolAdmin(school: School): Observable<User> {
    const userService = this.getUserService();
    const roleService = this.getRoleService();

    // Tìm role School Admin (roleId = 3)
    return roleService.getRoles('SCHOOL').pipe(
      switchMap(roles => {
        const schoolAdminRole = roles.find(r => r.roleName === 'School Admin' && r.schoolId === null);

        if (!schoolAdminRole) {
          throw new Error('Không tìm thấy role School Admin');
        }

        // Tạo admin user với email là email của trường và password mặc định là 12345678
        const adminUser: User = {
          fullName: school.principalName || `Admin ${school.name}`,
          gender: Gender.MALE,
          birthYear: '1980-01-01',
          address: school.address,
          phoneNumber: school.hotline,
          email: school.email, // Email là email của trường
          password: '12345678', // Mật khẩu mặc định
          isActive: true,
          scope: Scope.SCHOOL,
          schoolId: school.id!,
          roleId: schoolAdminRole.id!,
          createBy: 1, // System admin
          updateBy: 1
        };

        return userService.createUser(adminUser);
      })
    );
  }

  updateSchool(id: number, school: School): Observable<School> {
    if (USE_MOCK_DATA) {
      const schools = this.getMockSchools();
      const index = schools.findIndex(s => s.id === id);
      if (index !== -1) {
        schools[index] = {
          ...school,
          id,
          updatedAt: new Date().toISOString()
        };
        this.saveMockSchools(schools);
        return of(schools[index]).pipe(delay(500));
      }
      return new Observable(observer => {
        setTimeout(() => observer.error({ error: { message: 'Không tìm thấy trường học' } }), 300);
      });
    }
    return this.http.put<School>(`${this.apiUrl}/schools/${id}`, school);
  }

  deleteSchool(id: number): Observable<void> {
    if (USE_MOCK_DATA) {
      const schools = this.getMockSchools();
      const filtered = schools.filter(s => s.id !== id);
      this.saveMockSchools(filtered);
      return of(void 0).pipe(delay(500));
    }
    return this.http.delete<void>(`${this.apiUrl}/schools/${id}`);
  }
}


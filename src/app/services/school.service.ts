import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, switchMap } from 'rxjs';
import { School } from '../models/school.model';
import { User, Gender, Scope } from '../models/user.model';
import { MOCK_SCHOOLS } from '../data/mock-data';
import { UserService } from './user.service';
import { RoleService } from './role.service';
import { UserContextService } from './user-context.service';

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

  private userContextService?: UserContextService;

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    if (USE_MOCK_DATA) {
      this.initializeMockData();
    }
  }

  private getUserContextService(): UserContextService {
    if (!this.userContextService) {
      this.userContextService = this.injector.get(UserContextService);
    }
    return this.userContextService;
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
    // Kiểm tra version để tự động reset khi có thay đổi mock data
    const MOCK_DATA_VERSION = '1.1'; // Tăng version này khi cập nhật mock data
    const storedVersion = localStorage.getItem('mock_schools_version');

    if (!localStorage.getItem(this.mockDataKey) || storedVersion !== MOCK_DATA_VERSION) {
      localStorage.setItem(this.mockDataKey, JSON.stringify(MOCK_SCHOOLS));
      localStorage.setItem('mock_schools_version', MOCK_DATA_VERSION);
    }
  }

  /**
   * Reset mock data về dữ liệu mặc định từ mock-data.ts
   */
  resetMockData(): void {
    localStorage.setItem(this.mockDataKey, JSON.stringify(MOCK_SCHOOLS));
    localStorage.setItem('mock_schools_version', '1.1');
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

    // Tìm role SCHOOL_ADMIN (roleId = 3)
    return roleService.getRoles('SCHOOL').pipe(
      switchMap(roles => {
        const schoolAdminRole = roles.find(r => r.roleName === 'SCHOOL_ADMIN' && r.schoolId === null);

        if (!schoolAdminRole) {
          throw new Error('Không tìm thấy role SCHOOL_ADMIN');
        }

        // Tạo admin user với email là email của trường và password mặc định là 12345678
        const userContextService = this.getUserContextService();
        const currentUserId = userContextService.getCurrentUserId();

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
          createBy: currentUserId,
          updateBy: currentUserId
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

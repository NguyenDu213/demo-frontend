import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { RoleService } from '../../../services/role.service';
import { SchoolService } from '../../../services/school.service';
import { AuthService } from '../../../services/auth.service';
import { UserContextService } from '../../../services/user-context.service';
import { User, Gender, Scope } from '../../../models/user.model';
import { Role } from '../../../models/role.model';
import { School } from '../../../models/school.model';

@Component({
  selector: 'app-provider-users',
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
  standalone: false
})
export class ProviderUsersComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  allRoles: Role[] = []; // Tất cả roles để hiển thị role name
  schools: School[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedUser: User = this.getEmptyUser();
  originalEmail: string = ''; // Lưu email gốc khi edit
  searchTerm: string = '';
  genders = Object.values(Gender);
  scopes = Object.values(Scope);
  isSaving: boolean = false;

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private schoolService: SchoolService,
    private authService: AuthService,
    private userContextService: UserContextService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Khởi tạo selectedUser sau khi service đã được inject
    this.selectedUser = this.getEmptyUser();
    this.loadUsers();
    this.loadRoles();
    this.loadAllRoles(); // Load tất cả roles để hiển thị role name
    this.loadSchools();
  }

  loadSchools(): void {
    this.schoolService.getAllSchools().subscribe({
      next: (data) => {
        this.schools = data;
        this.cdr.detectChanges();
      }
    });
  }

  getSchoolName(schoolId: number | null | undefined): string {
    if (!schoolId) return 'N/A';
    const school = this.schools.find(s => s.id === schoolId);
    return school ? school.name : 'N/A';
  }

  isSchoolAdmin(): boolean {
    // Check dựa trên roleName thay vì roleId
    const role = this.allRoles.find(r => r.id === this.selectedUser.roleId);
    return role?.roleName === 'SCHOOL_ADMIN' || false;
  }

  showPassword: boolean = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loadUsers(): void {
    this.isLoading = true;
    // Lấy tất cả users
    this.userService.getUsers().subscribe({
      next: (data) => {
        // Load tất cả roles để check roleName
        this.roleService.getRoles('PROVIDER').subscribe({
          next: (providerRoles) => {
            this.roleService.getRoles('SCHOOL').subscribe({
              next: (schoolRoles) => {
                const allRoles = [...providerRoles, ...schoolRoles];
                
                // Filter users dựa trên roleName thay vì roleId
                this.users = data.filter(user => {
                  const userRole = allRoles.find(r => r.id === user.roleId);
                  if (!userRole) return false;
                  
                  // Chỉ hiển thị:
                  // 1. Tài khoản hệ thống (scope = Provider, không phải SYSTEM_ADMIN)
                  // 2. Tài khoản admin school (SCHOOL_ADMIN)
                  return (user.scope === 'Provider' && userRole.roleName !== 'SYSTEM_ADMIN') 
                      || userRole.roleName === 'SCHOOL_ADMIN';
                });
                
                this.isLoading = false;
                this.cdr.detectChanges();
              }
            });
          }
        });
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadRoles(): void {
    // Chỉ lấy PROVIDER roles để tạo tài khoản hệ thống
    this.roleService.getRoles('PROVIDER').subscribe({
      next: (providerRoles) => {
        // Filter bỏ role "SYSTEM_ADMIN" - không cho phép chọn khi thêm user
        this.roles = providerRoles.filter(role => role.roleName !== 'SYSTEM_ADMIN');
        this.cdr.detectChanges();
      }
    });
  }

  loadAllRoles(): void {
    // Load tất cả roles (PROVIDER và SCHOOL) để hiển thị role name
    this.roleService.getRoles('PROVIDER').subscribe({
      next: (providerRoles) => {
        this.allRoles = [...providerRoles];
        // Load thêm SCHOOL roles
        this.roleService.getRoles('SCHOOL').subscribe({
          next: (schoolRoles) => {
            // Thêm SCHOOL_ADMIN role vào allRoles
            const schoolAdminRole = schoolRoles.find(r => r.roleName === 'SCHOOL_ADMIN' && r.schoolId === null);
            if (schoolAdminRole && !this.allRoles.find(r => r.id === schoolAdminRole.id)) {
              this.allRoles.push(schoolAdminRole);
            }
            this.cdr.detectChanges();
          }
        });
      }
    });
  }


  getEmptyUser(): User {
    // Sử dụng fallback nếu userContextService chưa được inject (trong property initializer)
    const currentUserId = this.userContextService?.getCurrentUserId() || 1;
    return {
      fullName: '',
      gender: Gender.MALE,
      birthYear: '',
      address: '',
      phoneNumber: '',
      email: '',
      password: '',
      isActive: false,
      scope: Scope.PROVIDER,
      roleId: 0,
      createBy: currentUserId,
      updateBy: currentUserId
    };
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedUser = this.getEmptyUser();
    this.isModalOpen = true;
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.selectedUser = { ...user };
    this.originalEmail = user.email; // Lưu email gốc

    // Nếu là admin trường, load thêm SCHOOL_ADMIN role vào danh sách
    const userRole = this.allRoles.find(r => r.id === user.roleId);
    if (userRole?.roleName === 'SCHOOL_ADMIN') {
      this.roleService.getRoles('SCHOOL').subscribe({
        next: (schoolRoles) => {
          const schoolAdminRole = schoolRoles.find(r => r.roleName === 'SCHOOL_ADMIN' && r.schoolId === null);
          if (schoolAdminRole && !this.roles.find(r => r.id === schoolAdminRole.id)) {
            this.roles = [...this.roles, schoolAdminRole];
          }
        }
      });
    }

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedUser = this.getEmptyUser();
    this.originalEmail = '';
    this.showPassword = false;
    this.isSaving = false;
    // Reset roles về chỉ PROVIDER roles khi đóng modal
    this.loadRoles();
  }

  saveUser(): void {
    // Prevent double submission
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    const currentUserId = this.userContextService.getCurrentUserId();

    if (this.isEditMode && this.selectedUser.id) {
      // Update updateBy với current user ID
      this.selectedUser.updateBy = currentUserId;
      
      // Kiểm tra xem user có phải admin hệ thống hoặc admin trường không (dựa trên roleName)
      const userRole = this.allRoles.find(r => r.id === this.selectedUser.roleId);
      const isSystemAdmin = userRole?.roleName === 'SYSTEM_ADMIN';
      const isSchoolAdmin = userRole?.roleName === 'SCHOOL_ADMIN';

      // Admin hệ thống và admin trường có thể sửa email và password
      // Các user khác không được sửa email và password
      if (!isSystemAdmin && !isSchoolAdmin) {
        this.selectedUser.email = this.originalEmail;
        // Không gửi password khi update (để giữ nguyên password hiện tại)
        const userToUpdate = { ...this.selectedUser };
        delete userToUpdate.password;

        this.userService.updateUser(this.selectedUser.id, userToUpdate).subscribe({
          next: () => {
            this.isSaving = false;
            this.loadUsers();
            this.closeModal();
          },
          error: () => {
            this.isSaving = false;
          }
        });
      } else {
        // Admin hệ thống và admin trường có thể sửa tất cả
        this.userService.updateUser(this.selectedUser.id, this.selectedUser).subscribe({
          next: () => {
            this.isSaving = false;
            this.loadUsers();
            this.closeModal();
          },
          error: () => {
            this.isSaving = false;
          }
        });
      }
    } else {
      // Set createBy và updateBy khi tạo mới
      this.selectedUser.createBy = currentUserId;
      this.selectedUser.updateBy = currentUserId;
      
      this.userService.createUser(this.selectedUser).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadUsers();
          this.closeModal();
        },
        error: () => {
          this.isSaving = false;
        }
      });
    }
  }

  deleteUser(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.loadUsers();
        }
      });
    }
  }

  get filteredUsers(): User[] {
    // Users đã được filter trong loadUsers(), chỉ cần filter theo search term
    if (!this.searchTerm) {
      return this.users;
    }

    const term = this.searchTerm.toLowerCase();
    return this.users.filter(user =>
      user.fullName.toLowerCase().includes(term)
    );
  }

  isAdminUser(): boolean {
    // Kiểm tra xem user đang edit có phải admin hệ thống hoặc admin trường không (dựa trên roleName)
    const role = this.allRoles.find(r => r.id === this.selectedUser.roleId);
    return role?.roleName === 'SYSTEM_ADMIN' || role?.roleName === 'SCHOOL_ADMIN' || false;
  }

  getRoleName(roleId: number): string {
    // Tìm trong allRoles để bao gồm cả PROVIDER và SCHOOL roles
    const role = this.allRoles.find(r => r.id === roleId);
    return role ? role.roleName : 'N/A';
  }
}


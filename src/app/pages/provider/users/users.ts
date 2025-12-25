import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
  standalone: false,
})
export class ProviderUsersComponent implements OnInit, OnDestroy {
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
  private searchSubject = new Subject<string>();
  genders = Object.values(Gender);
  scopes = Object.values(Scope);
  isSaving: boolean = false;

  // Biến lưu danh sách lỗi validation từ server: { "field_name": "error_message" }
  fieldErrors: { [key: string]: string } = {};

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

    // Setup debounce cho search
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => {
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }


  getSchoolName(schoolId: number | null | undefined): string {
    if (!schoolId) return 'N/A';
    const school = this.schools.find((s) => s.id === schoolId);
    return school ? school.name : 'N/A';
  }

  isSchoolAdmin(): boolean {
    // Check dựa trên roleName thay vì roleId
    const role = this.allRoles.find((r) => r.id === this.selectedUser.roleId);
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
        // Load PROVIDER roles
        this.roleService.getRoles('PROVIDER').subscribe({
          next: (providerRoles) => {
            // Chỉ load SCHOOL roles nếu user hiện tại là School Admin, không phải System Admin
            this.userContextService.isSystemAdmin().subscribe({
              next: (isSystemAdmin) => {
                if (isSystemAdmin) {
                  // System Admin: chỉ dùng PROVIDER roles để filter
                  const allRoles = [...providerRoles];

                  // Filter users dựa trên roleName thay vì roleId
                  let filteredUsers = data.filter((user) => {
                    const userRole = allRoles.find((r) => r.id === user.roleId);
                    if (!userRole) return false;

                    // Chỉ hiển thị tài khoản hệ thống (scope = PROVIDER, không phải SYSTEM_ADMIN)
                    return user.scope === 'PROVIDER' && userRole.roleName !== 'SYSTEM_ADMIN';
                  });

                  // Filter theo search term nếu có
                  if (this.searchTerm && this.searchTerm.trim()) {
                    const term = this.searchTerm.toLowerCase();
                    filteredUsers = filteredUsers.filter(
                      (user) =>
                        user.fullName.toLowerCase().includes(term) ||
                        user.email.toLowerCase().includes(term) ||
                        user.phoneNumber?.toLowerCase().includes(term)
                    );
                  }

                  this.users = filteredUsers;
                  this.isLoading = false;
                  this.cdr.detectChanges();
                } else {
                  // School Admin: load cả SCHOOL roles
                  this.roleService.getRoles('SCHOOL').subscribe({
                    next: (schoolRoles) => {
                      const allRoles = [...providerRoles, ...schoolRoles];

                      // Filter users dựa trên roleName thay vì roleId
                      let filteredUsers = data.filter((user) => {
                        const userRole = allRoles.find((r) => r.id === user.roleId);
                        if (!userRole) return false;

                        // Chỉ hiển thị:
                        // 1. Tài khoản hệ thống (scope = PROVIDER, không phải SYSTEM_ADMIN)
                        // 2. Tài khoản admin school (SCHOOL_ADMIN)
                        return (
                          (user.scope === 'PROVIDER' && userRole.roleName !== 'SYSTEM_ADMIN') ||
                          userRole.roleName === 'SCHOOL_ADMIN'
                        );
                      });

                      // Filter theo search term nếu có
                      if (this.searchTerm && this.searchTerm.trim()) {
                        const term = this.searchTerm.toLowerCase();
                        filteredUsers = filteredUsers.filter(
                          (user) =>
                            user.fullName.toLowerCase().includes(term) ||
                            user.email.toLowerCase().includes(term) ||
                            user.phoneNumber?.toLowerCase().includes(term)
                        );
                      }

                      this.users = filteredUsers;
                      this.isLoading = false;
                      this.cdr.detectChanges();
                    },
                    error: () => {
                      this.isLoading = false;
                      this.cdr.detectChanges();
                    }
                  });
                }
              },
              error: () => {
                // Nếu không check được, fallback về chỉ dùng PROVIDER roles
                const allRoles = [...providerRoles];
                let filteredUsers = data.filter((user) => {
                  const userRole = allRoles.find((r) => r.id === user.roleId);
                  if (!userRole) return false;
                  return user.scope === 'PROVIDER' && userRole.roleName !== 'SYSTEM_ADMIN';
                });

                if (this.searchTerm && this.searchTerm.trim()) {
                  const term = this.searchTerm.toLowerCase();
                  filteredUsers = filteredUsers.filter(
                    (user) =>
                      user.fullName.toLowerCase().includes(term) ||
                      user.email.toLowerCase().includes(term) ||
                      user.phoneNumber?.toLowerCase().includes(term)
                  );
                }

                this.users = filteredUsers;
                this.isLoading = false;
                this.cdr.detectChanges();
              }
            });
          },
        });
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadRoles(): void {
    // Chỉ lấy PROVIDER roles để tạo tài khoản hệ thống
    this.roleService.getRoles('PROVIDER').subscribe({
      next: (providerRoles) => {
        // Filter bỏ role "SYSTEM_ADMIN" - không cho phép chọn khi thêm user
        this.roles = providerRoles.filter((role) => role.roleName !== 'SYSTEM_ADMIN');
        this.cdr.detectChanges();
      },
    });
  }

  loadAllRoles(): void {
    // Load PROVIDER roles
    this.roleService.getRoles('PROVIDER').subscribe({
      next: (providerRoles) => {
        this.allRoles = [...providerRoles];

        // Chỉ load SCHOOL roles nếu user hiện tại là School Admin, không phải System Admin
        this.userContextService.isSystemAdmin().subscribe({
          next: (isSystemAdmin) => {
            if (!isSystemAdmin) {
              // School Admin: load thêm SCHOOL roles
              this.roleService.getRoles('SCHOOL').subscribe({
                next: (schoolRoles) => {
                  // Thêm SCHOOL_ADMIN role vào allRoles
                  const schoolAdminRole = schoolRoles.find(
                    (r) => r.roleName === 'SCHOOL_ADMIN' && r.schoolId === null
                  );
                  if (schoolAdminRole && !this.allRoles.find((r) => r.id === schoolAdminRole.id)) {
                    this.allRoles.push(schoolAdminRole);
                  }
                  this.cdr.detectChanges();
                },
                error: () => {
                  // Nếu load SCHOOL roles fail, vẫn giữ PROVIDER roles
                  this.cdr.detectChanges();
                }
              });
            } else {
              // System Admin: chỉ dùng PROVIDER roles
              this.cdr.detectChanges();
            }
          },
          error: () => {
            // Nếu không check được, chỉ dùng PROVIDER roles
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.cdr.detectChanges();
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
      updateBy: currentUserId,
    };
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedUser = this.getEmptyUser();
    this.fieldErrors = {}; // Reset lỗi cũ
    this.isModalOpen = true;
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.selectedUser = { ...user };
    if (this.selectedUser.birthYear) {
      const date = new Date(this.selectedUser.birthYear);
      this.selectedUser.birthYear = date.toISOString().split('T')[0];
    }
    this.originalEmail = user.email; // Lưu email gốc
    this.fieldErrors = {}; // Reset lỗi cũ

    // Nếu là admin trường, load thêm SCHOOL_ADMIN role vào danh sách
    // Chỉ load nếu user hiện tại không phải System Admin
    const userRole = this.allRoles.find((r) => r.id === user.roleId);
    if (userRole?.roleName === 'SCHOOL_ADMIN') {
      this.userContextService.isSystemAdmin().subscribe({
        next: (isSystemAdmin) => {
          if (!isSystemAdmin) {
            // Chỉ School Admin mới được load SCHOOL roles
            this.roleService.getRoles('SCHOOL').subscribe({
              next: (schoolRoles) => {
                const schoolAdminRole = schoolRoles.find(
                  (r) => r.roleName === 'SCHOOL_ADMIN' && r.schoolId === null
                );
                if (schoolAdminRole && !this.roles.find((r) => r.id === schoolAdminRole.id)) {
                  this.roles = [...this.roles, schoolAdminRole];
                }
              },
            });
          }
        },
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
    this.fieldErrors = {};
    // Reset roles về chỉ PROVIDER roles khi đóng modal
    this.loadRoles();
  }

  clearError(field: string): void {
    if (this.fieldErrors[field]) {
      delete this.fieldErrors[field];
    }
  }

  saveUser(): void {
    // Prevent double submission
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.fieldErrors = {};
    const currentUserId = this.userContextService.getCurrentUserId();

    if (this.isEditMode && this.selectedUser.id) {
      // Update updateBy với current user ID
      this.selectedUser.updateBy = currentUserId;

      // Kiểm tra xem user có phải admin hệ thống hoặc admin trường không (dựa trên roleName)
      const userRole = this.allRoles.find((r) => r.id === this.selectedUser.roleId);
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
            alert('Cập nhật người dùng thành công!');
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Lỗi khi cập nhật người dùng:', err);
            this.handleBackendError(err);
            this.cdr.detectChanges();
          },
        });
      } else {
        // Admin hệ thống và admin trường có thể sửa tất cả
        this.userService.updateUser(this.selectedUser.id, this.selectedUser).subscribe({
          next: () => {
            this.isSaving = false;
            this.loadUsers();
            this.closeModal();
            alert('Cập nhật người dùng thành công!');
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Lỗi khi cập nhật người dùng:', err);
            this.handleBackendError(err);
            this.cdr.detectChanges();
          },
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
          alert('Thêm người dùng mới thành công!');
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Lỗi khi tạo người dùng:', err);
          this.handleBackendError(err);
          this.validateRoleFrontend();
          this.cdr.detectChanges();
        },
      });
    }
  }

  deleteUser(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.loadUsers();
        },
      });
    }
  }

  get filteredUsers(): User[] {
    // Users đã được filter trong loadUsers()
    return this.users;
  }

  /**
   * Gọi khi search term thay đổi
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  isAdminUser(): boolean {
    // Kiểm tra xem user đang edit có phải admin hệ thống hoặc admin trường không (dựa trên roleName)
    const role = this.allRoles.find((r) => r.id === this.selectedUser.roleId);
    return role?.roleName === 'SYSTEM_ADMIN' || role?.roleName === 'SCHOOL_ADMIN' || false;
  }

  getRoleName(roleId: number): string {
    // Tìm trong allRoles để bao gồm cả PROVIDER và SCHOOL roles
    const role = this.allRoles.find((r) => r.id === roleId);
    return role ? role.roleName : 'N/A';
  }

  private handleBackendError(err: any): void {
    const errorBody = err.error;
    if (
      errorBody &&
      errorBody.data &&
      typeof errorBody.data === 'object' &&
      !Array.isArray(errorBody.data)
    ) {
      this.fieldErrors = {
        ...this.fieldErrors, // giữ lỗi frontend (role)
        ...errorBody.data, // thêm lỗi backend
      };
      console.log('Phát hiện lỗi Validation:', this.fieldErrors);
    } else if (errorBody && errorBody.message) {
      alert(errorBody.message);
    } else {
      alert('Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    }
  }

  validateRoleFrontend(): void {
    if (!this.selectedUser.roleId || this.selectedUser.roleId === 0) {
      this.fieldErrors['roleId'] = 'Role phải được chọn';
    } else {
      delete this.fieldErrors['roleId'];
    }
  }
}

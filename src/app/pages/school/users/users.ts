import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { User, Gender, Scope } from '../../../models/user.model';
import { Role } from '../../../models/role.model';

@Component({
  selector: 'app-school-users',
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
  standalone: false,
})
export class SchoolUsersComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  allRoles: Role[] = []; // Tất cả roles để hiển thị role name (bao gồm SCHOOL_ADMIN)
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedUser: User = this.getEmptyUser();
  originalEmail: string = ''; // Lưu email gốc khi edit
  searchTerm: string = '';
  // searchTerm is used when user presses Enter or clicks Search
  genders = Object.values(Gender);
  currentUser: User | null = null;
  isSaving: boolean = false;

  // Biến lưu danh sách lỗi validation từ server: { "field_name": "error_message" }
  fieldErrors: { [key: string]: string } = {};

  // Pagination
  pageSizes: number[] = [3, 5, 10];
  pageSize: number = 5;
  currentPage: number = 1;
  totalItems: number = 0;
  totalPages: number = 1;

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadUsers();
    this.loadRoles();
  }

  isGender(gender: string) {
    return gender === "MALE" ? "Nam" : "Nữ";  
  }

  loadUsers(): void {
    this.isLoading = true;
    const schoolId = this.currentUser?.schoolId ?? undefined;

    if (schoolId !== undefined) {
      this.userService.getUsers('School', schoolId).subscribe({
        next: (data) => {
              // Load roles để check roleName thay vì roleId
              this.roleService.getRoles('SCHOOL', schoolId).subscribe({
                next: (roles) => {
                  // Lưu tất cả roles để hiển thị role name
                  this.allRoles = roles;
                  // Filter bỏ các tài khoản admin trường (dựa trên roleName)
                  let filteredUsers = data.filter((user) => {
                    const userRole = roles.find((r) => r.id === user.roleId);
                    return userRole?.roleName !== 'SCHOOL_ADMIN';
                  });

              // Filter theo tên nếu có
              if (this.searchTerm && this.searchTerm.trim()) {
                const term = this.searchTerm.toLowerCase();
                filteredUsers = filteredUsers.filter((user) =>
                  user.fullName.toLowerCase().includes(term)
                );
              }

              this.users = filteredUsers;
              // pagination
              this.totalItems = filteredUsers.length;
              this.recomputePagination();
              this.isLoading = false;
              this.cdr.detectChanges();
            },
          });
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  loadRoles(): void {
    const schoolId = this.currentUser?.schoolId ?? undefined;
    this.roleService.getRoles('SCHOOL', schoolId).subscribe({
      next: (data) => {
        // Lưu tất cả roles để hiển thị role name
        this.allRoles = data;
        // Filter bỏ role "SCHOOL_ADMIN" - không cho phép chọn khi thêm user
        this.roles = data.filter((role) => role.roleName !== 'SCHOOL_ADMIN');
        this.cdr.detectChanges();
      },
    });
  }

  getEmptyUser(): User {
    return {
      fullName: '',
      gender: Gender.MALE,
      birthYear: '',
      address: '',
      phoneNumber: '',
      email: '',
      password: '',
      isActive: false,
      scope: Scope.SCHOOL,
      schoolId: this.currentUser?.schoolId || null,
      roleId: 0,
      createBy: this.currentUser?.id || 1,
      updateBy: this.currentUser?.id || 1,
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
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedUser = this.getEmptyUser();
    this.originalEmail = '';
    this.isSaving = false;
    this.fieldErrors = {};
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

    // Reset lỗi trước khi validate
    this.fieldErrors = {};

    this.isSaving = true;
    const currentUserId = this.currentUser?.id || 1;

    if (this.isEditMode && this.selectedUser.id) {
      // Update updateBy với current user ID
      this.selectedUser.updateBy = currentUserId;

      // Khi sửa, không cho phép thay đổi email và password
      // Giữ nguyên email gốc
      this.selectedUser.email = this.originalEmail;
      // Không gửi password khi update (để giữ nguyên password hiện tại)
      const userToUpdate = { ...this.selectedUser };
      delete userToUpdate.password;

      this.userService.updateUser(this.selectedUser.id, userToUpdate).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadUsers();
          this.closeModal();
          alert('Cập nhật tài khoản thành công!');
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Lỗi khi cập nhật tài khoản:', err);
          this.handleBackendError(err);
          this.cdr.detectChanges();
        },
      });
    } else {
      // Set createBy và updateBy khi tạo mới
      this.selectedUser.createBy = currentUserId;
      this.selectedUser.updateBy = currentUserId;

      this.userService.createUser(this.selectedUser).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadUsers();
          this.closeModal();
          alert('Thêm tài khoản mới thành công!');
        },
        error: (err) => {
          this.isSaving = false;
          this.validateRoleFrontend();
          console.error('Lỗi khi tạo tài khoản:', err);
          this.handleBackendError(err);
          this.cdr.detectChanges();
        },
      });
    }
  }

  /**
   * Xử lý chi tiết các lỗi từ backend
   * Tương tự như handleBackendError trong roles component
   */
  private handleBackendError(err: any): void {
    console.log('handleBackendError called with:', err);
    
    const errorBody = err.error || {};
    const statusCode = err.status || errorBody.statusCode || 500;
    const errorMessage = errorBody.message || err.message || 'Đã xảy ra lỗi không xác định';
    
    console.log('Error details:', {
      statusCode,
      message: errorMessage,
      errorBody,
      fullError: err
    });

    // ============================================================
    // 1. XỬ LÝ VALIDATION ERRORS (400) - Field-level errors
    // ============================================================
    if (errorBody.data && typeof errorBody.data === 'object' && !Array.isArray(errorBody.data)) {
      const dataKeys = Object.keys(errorBody.data);
      
      const hasFieldErrors = dataKeys.some(key => {
        const value = errorBody.data[key];
        return key !== 'message' && typeof value === 'string' && value.trim().length > 0;
      });

      if (hasFieldErrors) {
        const fieldErrorsMap: { [key: string]: string } = {};
        dataKeys.forEach(key => {
          const value = errorBody.data[key];
          if (key !== 'message' && typeof value === 'string' && value.trim().length > 0) {
            fieldErrorsMap[key] = value;
          }
        });

        if (Object.keys(fieldErrorsMap).length > 0) {
          this.fieldErrors = {
            ...this.fieldErrors, // giữ lỗi frontend (role)
            ...fieldErrorsMap, // thêm lỗi backend
          };
          console.log('Phát hiện lỗi Validation (field-level):', this.fieldErrors);
          return;
        }
      }
    }

    // ============================================================
    // 2. XỬ LÝ CÁC LOẠI LỖI BUSINESS LOGIC THEO STATUS CODE
    // ============================================================
    
    if (statusCode === 401) {
      const message = this.extractErrorMessage(errorMessage, [
        'Vui lòng đăng nhập',
        'Authentication Error',
        'Token không hợp lệ',
        'Token đã hết hạn'
      ]);
      alert(message);
      return;
    }

    if (statusCode === 403) {
      const message = this.extractErrorMessage(errorMessage, [
        'Bạn không có quyền',
        'Truy cập bị từ chối',
        'Forbidden'
      ]);
      alert(`❌ Lỗi quyền truy cập:\n${message}`);
      return;
    }

    if (statusCode === 404) {
      const message = this.extractErrorMessage(errorMessage, [
        'Không tìm thấy',
        'Resource Not Found'
      ]);
      alert(`⚠️ Không tìm thấy:\n${message}`);
      return;
    }

    if (statusCode === 409) {
      const message = this.extractErrorMessage(errorMessage, [
        'Dữ liệu đã tồn tại',
        'Vi phạm ràng buộc',
        'Data Integrity Violation',
        'Conflict'
      ]);
      alert(`⚠️ Xung đột dữ liệu:\n${message}`);
      return;
    }

    if (statusCode === 400) {
      const message = this.extractErrorMessage(errorMessage, [
        'Bad Request',
        'Dữ liệu không hợp lệ'
      ]);
      alert(`⚠️ Lỗi dữ liệu:\n${message}`);
      return;
    }

    if (statusCode >= 500) {
      console.error('Server error:', errorMessage);
      alert(`❌ Lỗi máy chủ:\nĐã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.\n\nChi tiết: ${errorMessage}`);
      return;
    }

    // ============================================================
    // 3. FALLBACK: Xử lý các lỗi khác
    // ============================================================
    if (errorBody.message) {
      console.log('Hiển thị alert với message từ backend:', errorBody.message);
      alert(`⚠️ ${errorBody.message}`);
    } else if (errorMessage) {
      console.log('Hiển thị alert với error message:', errorMessage);
      alert(`⚠️ ${errorMessage}`);
    } else {
      console.log('Lỗi không xác định');
      alert('❌ Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    }
  }

  /**
   * Trích xuất thông điệp lỗi từ error message
   */
  private extractErrorMessage(message: string, keywords: string[]): string {
    if (!message) {
      return 'Đã xảy ra lỗi không xác định';
    }

    for (const keyword of keywords) {
      if (message.toLowerCase().includes(keyword.toLowerCase())) {
        return message;
      }
    }

    return message;
  }

  validateRoleFrontend(): void {
    if (!this.selectedUser.roleId || this.selectedUser.roleId === 0) {
      this.fieldErrors['roleId'] = 'Role phải được chọn';
    } else {
      delete this.fieldErrors['roleId'];
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
    // Filter đã được thực hiện trong loadUsers(); apply pagination here
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.users.slice(start, end);
  }

  /**
   * Gọi khi search term thay đổi
   */
  onSearchChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.recomputePagination();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  private recomputePagination(): void {
    this.totalItems = this.users.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  // Helper to surface backend validation errors in modal
  hasBackendErrors(): boolean {
    return Object.keys(this.fieldErrors || {}).length > 0;
  }

  backendErrorList(): string[] {
    return Object.values(this.fieldErrors || {});
  }

  getRoleName(roleId: number): string {
    // Tìm trong allRoles để bao gồm cả SCHOOL_ADMIN (đã bị filter khỏi roles)
    const role = this.allRoles.find((r) => r.id === roleId);
    return role ? role.roleName : 'N/A';
  }
}

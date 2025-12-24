import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UserService } from '../../../services/user.service';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { User, Gender, Scope } from '../../../models/user.model';
import { Role } from '../../../models/role.model';

@Component({
  selector: 'app-school-users',
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
  standalone: false
})
export class SchoolUsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  roles: Role[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedUser: User = this.getEmptyUser();
  originalEmail: string = ''; // Lưu email gốc khi edit
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  genders = Object.values(Gender);
  currentUser: User | null = null;
  isSaving: boolean = false;

  // Biến lưu danh sách lỗi validation từ server: { "field_name": "error_message" }
  fieldErrors: { [key: string]: string } = {};

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

    // Setup debounce cho search
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
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
              // Filter bỏ các tài khoản admin trường (dựa trên roleName)
              let filteredUsers = data.filter(user => {
                const userRole = roles.find(r => r.id === user.roleId);
                return userRole?.roleName !== 'SCHOOL_ADMIN';
              });

              // Filter theo search term nếu có
              if (this.searchTerm && this.searchTerm.trim()) {
                const term = this.searchTerm.toLowerCase();
                filteredUsers = filteredUsers.filter(user =>
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
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
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
        // Filter bỏ role "SCHOOL_ADMIN" - không cho phép chọn khi thêm user
        this.roles = data.filter(role => role.roleName !== 'SCHOOL_ADMIN');
        this.cdr.detectChanges();
      }
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
      updateBy: this.currentUser?.id || 1
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
        }
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
          console.error('Lỗi khi tạo tài khoản:', err);
          this.handleBackendError(err);
          this.cdr.detectChanges();
        }
      });
    }
  }

  private handleBackendError(err: any): void {
    const errorBody = err.error;
    if (errorBody && errorBody.data && typeof errorBody.data === 'object' && !Array.isArray(errorBody.data)) {
      this.fieldErrors = errorBody.data;
      console.log('Phát hiện lỗi Validation:', this.fieldErrors);
      // Không hiển thị alert khi có validation errors, chỉ hiển thị trên form
      return;
    }

    // Nếu không phải validation errors, hiển thị message
    if (errorBody && errorBody.message) {
      alert(errorBody.message);
    } else {
      alert('Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
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
    // Filter đã được thực hiện trong loadUsers()
    return this.users;
  }

  /**
   * Gọi khi search term thay đổi
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.roleName : 'N/A';
  }
}


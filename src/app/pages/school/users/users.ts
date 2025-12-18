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
  standalone: false
})
export class SchoolUsersComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedUser: User = this.getEmptyUser();
  originalEmail: string = ''; // Lưu email gốc khi edit
  searchTerm: string = '';
  genders = Object.values(Gender);
  currentUser: User | null = null;
  isSaving: boolean = false;

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
              this.users = data.filter(user => {
                const userRole = roles.find(r => r.id === user.roleId);
                return userRole?.roleName !== 'SCHOOL_ADMIN';
              });
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
    this.isModalOpen = true;
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.selectedUser = { ...user };
    this.originalEmail = user.email; // Lưu email gốc
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedUser = this.getEmptyUser();
    this.originalEmail = '';
    this.isSaving = false;
  }

  saveUser(): void {
    // Prevent double submission
    if (this.isSaving) {
      return;
    }

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
        },
        error: () => {
          this.isSaving = false;
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
    // Filter đã được thực hiện trong loadUsers() dựa trên roleName
    // Chỉ cần filter theo search term ở đây
    if (!this.searchTerm) {
      return this.users;
    }
    
    const term = this.searchTerm.toLowerCase();
    return this.users.filter(user =>
      user.fullName.toLowerCase().includes(term)
    );
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.roleName : 'N/A';
  }
}


import { Component, OnInit } from '@angular/core';
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

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private authService: AuthService
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
          // Filter bỏ các tài khoản admin trường (roleId = 3 là School Admin)
          this.users = data.filter(user => user.roleId !== 3);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  loadRoles(): void {
    const schoolId = this.currentUser?.schoolId ?? undefined;
    this.roleService.getRoles('SCHOOL', schoolId).subscribe({
      next: (data) => {
        // Filter bỏ role "School Admin" - không cho phép chọn khi thêm user
        this.roles = data.filter(role => role.roleName !== 'School Admin');
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
  }

  saveUser(): void {
    if (this.isEditMode && this.selectedUser.id) {
      // Khi sửa, không cho phép thay đổi email và password
      // Giữ nguyên email gốc
      this.selectedUser.email = this.originalEmail;
      // Không gửi password khi update (để giữ nguyên password hiện tại)
      const userToUpdate = { ...this.selectedUser };
      delete userToUpdate.password;
      
      this.userService.updateUser(this.selectedUser.id, userToUpdate).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        }
      });
    } else {
      this.userService.createUser(this.selectedUser).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
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
    // Đảm bảo không hiển thị admin trường (roleId = 3)
    let filtered = this.users.filter(user => user.roleId !== 3);
    
    if (!this.searchTerm) {
      return filtered;
    }
    
    const term = this.searchTerm.toLowerCase();
    return filtered.filter(user =>
      user.fullName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.phoneNumber.toLowerCase().includes(term)
    );
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.roleName : 'N/A';
  }
}


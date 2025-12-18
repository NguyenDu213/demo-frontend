import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { RoleService } from '../../../services/role.service';
import { SchoolService } from '../../../services/school.service';
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
  schools: School[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedUser: User = this.getEmptyUser();
  originalEmail: string = ''; // Lưu email gốc khi edit
  searchTerm: string = '';
  genders = Object.values(Gender);
  scopes = Object.values(Scope);

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private schoolService: SchoolService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadSchools();
  }

  loadSchools(): void {
    this.schoolService.getAllSchools().subscribe({
      next: (data) => {
        this.schools = data;
      }
    });
  }

  getSchoolName(schoolId: number | null | undefined): string {
    if (!schoolId) return 'N/A';
    const school = this.schools.find(s => s.id === schoolId);
    return school ? school.name : 'N/A';
  }

  isSchoolAdmin(): boolean {
    return this.selectedUser.roleId === 3;
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
        // Chỉ hiển thị:
        // 1. Tài khoản hệ thống (scope = Provider, roleId != 1 để loại System Admin)
        // 2. Tài khoản admin school (roleId = 3)
        this.users = data.filter(user =>
          (user.scope === 'Provider' && user.roleId !== 1) || user.roleId === 3
        );
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadRoles(): void {
    // Chỉ lấy PROVIDER roles để tạo tài khoản hệ thống
    this.roleService.getRoles('PROVIDER').subscribe({
      next: (providerRoles) => {
        // Filter bỏ role "System Admin" - không cho phép chọn khi thêm user
        this.roles = providerRoles.filter(role => role.roleName !== 'System Admin');
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
      scope: Scope.PROVIDER,
      roleId: 0,
      createBy: 1,
      updateBy: 1
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

    // Nếu là admin trường, load thêm School Admin role vào danh sách
    if (user.roleId === 3) {
      this.roleService.getRoles('SCHOOL').subscribe({
        next: (schoolRoles) => {
          const schoolAdminRole = schoolRoles.find(r => r.roleName === 'School Admin' && r.schoolId === null);
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
    // Reset roles về chỉ PROVIDER roles khi đóng modal
    this.loadRoles();
  }

  saveUser(): void {
    if (this.isEditMode && this.selectedUser.id) {
      // Kiểm tra xem user có phải admin hệ thống (roleId = 1) hoặc admin trường (roleId = 3) không
      const isSystemAdmin = this.selectedUser.roleId === 1;
      const isSchoolAdmin = this.selectedUser.roleId === 3;

      // Admin hệ thống và admin trường có thể sửa email và password
      // Các user khác không được sửa email và password
      if (!isSystemAdmin && !isSchoolAdmin) {
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
        // Admin hệ thống và admin trường có thể sửa tất cả
        this.userService.updateUser(this.selectedUser.id, this.selectedUser).subscribe({
          next: () => {
            this.loadUsers();
            this.closeModal();
          }
        });
      }
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
    // Users đã được filter trong loadUsers(), chỉ cần filter theo search term
    if (!this.searchTerm) {
      return this.users;
    }

    const term = this.searchTerm.toLowerCase();
    return this.users.filter(user =>
      user.fullName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.phoneNumber.toLowerCase().includes(term)
    );
  }

  isAdminUser(): boolean {
    // Kiểm tra xem user đang edit có phải admin hệ thống (roleId = 1) hoặc admin trường (roleId = 3) không
    // Cả hai đều có thể sửa email và password
    return this.selectedUser.roleId === 1 || this.selectedUser.roleId === 3;
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.roleName : 'N/A';
  }
}


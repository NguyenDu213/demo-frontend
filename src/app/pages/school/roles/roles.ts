import { Component, OnInit } from '@angular/core';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { Role, TypeRole } from '../../../models/role.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-school-roles',
  templateUrl: './roles.html',
  styleUrls: ['./roles.scss'],
  standalone: false
})
export class SchoolRolesComponent implements OnInit {
  roles: Role[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedRole: Role = this.getEmptyRole();
  searchTerm: string = '';
  currentUser: User | null = null;

  constructor(
    private roleService: RoleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading = true;
    const schoolId = this.currentUser?.schoolId ?? undefined;
    
    this.roleService.getRoles('SCHOOL', schoolId).subscribe({
      next: (data) => {
        // Filter bỏ role "School Admin" - không hiển thị trong danh sách
        this.roles = data.filter(role => role.roleName !== 'School Admin');
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  getEmptyRole(): Role {
    return {
      roleName: '',
      typeRole: TypeRole.SCHOOL,
      description: '',
      schoolId: this.currentUser?.schoolId || null,
      createBy: this.currentUser?.id || 1,
      updateBy: this.currentUser?.id || 1
    };
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedRole = this.getEmptyRole();
    this.isModalOpen = true;
  }

  openEditModal(role: Role): void {
    this.isEditMode = true;
    this.selectedRole = { 
      ...role,
      typeRole: TypeRole.SCHOOL, // Đảm bảo typeRole luôn là SCHOOL
      schoolId: this.currentUser?.schoolId || null // Đảm bảo schoolId đúng
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedRole = this.getEmptyRole();
  }

  saveRole(): void {
    // Đảm bảo typeRole luôn là SCHOOL cho school admin
    this.selectedRole.typeRole = TypeRole.SCHOOL;
    // Đảm bảo schoolId được set từ current user
    this.selectedRole.schoolId = this.currentUser?.schoolId || null;
    
    if (this.isEditMode && this.selectedRole.id) {
      this.roleService.updateRole(this.selectedRole.id, this.selectedRole).subscribe({
        next: () => {
          this.loadRoles();
          this.closeModal();
        }
      });
    } else {
      this.roleService.createRole(this.selectedRole).subscribe({
        next: () => {
          this.loadRoles();
          this.closeModal();
        }
      });
    }
  }

  deleteRole(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa role này?')) {
      this.roleService.deleteRole(id).subscribe({
        next: () => {
          this.loadRoles();
        }
      });
    }
  }

  get filteredRoles(): Role[] {
    if (!this.searchTerm) {
      return this.roles;
    }
    const term = this.searchTerm.toLowerCase();
    return this.roles.filter(role =>
      role.roleName.toLowerCase().includes(term)
    );
  }
}


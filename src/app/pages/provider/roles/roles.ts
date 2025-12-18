import { Component, OnInit } from '@angular/core';
import { RoleService } from '../../../services/role.service';
import { Role, TypeRole } from '../../../models/role.model';

@Component({
  selector: 'app-provider-roles',
  templateUrl: './roles.html',
  styleUrls: ['./roles.scss'],
  standalone: false
})
export class ProviderRolesComponent implements OnInit {
  roles: Role[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedRole: Role = this.getEmptyRole();
  searchTerm: string = '';
  typeRoles = Object.values(TypeRole);

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getRoles('PROVIDER').subscribe({
      next: (data) => {
        // Ẩn role "System Admin" (id = 1 hoặc roleName = "System Admin")
        this.roles = data.filter(role => role.id !== 1 && role.roleName !== 'System Admin');
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
      typeRole: TypeRole.PROVIDER,
      description: '',
      createBy: 1,
      updateBy: 1
    };
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedRole = this.getEmptyRole();
    this.isModalOpen = true;
  }

  openEditModal(role: Role): void {
    this.isEditMode = true;
    this.selectedRole = { ...role };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedRole = this.getEmptyRole();
  }

  saveRole(): void {
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
    // Đảm bảo không hiển thị role "System Admin" trong kết quả search
    let filtered = this.roles.filter(role => role.id !== 1 && role.roleName !== 'System Admin');
    
    if (!this.searchTerm) {
      return filtered;
    }
    const term = this.searchTerm.toLowerCase();
    return filtered.filter(role =>
      role.roleName.toLowerCase().includes(term)
    );
  }
}


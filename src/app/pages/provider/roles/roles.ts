import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RoleService } from '../../../services/role.service';
import { UserService } from '../../../services/user.service';
import { UserContextService } from '../../../services/user-context.service';
import { Role, TypeRole } from '../../../models/role.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-provider-roles',
  templateUrl: './roles.html',
  styleUrls: ['./roles.scss'],
  standalone: false
})
export class ProviderRolesComponent implements OnInit, OnDestroy {
  roles: Role[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedRole: Role = this.getEmptyRole();
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  typeRoles = Object.values(TypeRole);
  isSaving: boolean = false;

  // Modal gán role mới
  isReassignModalOpen: boolean = false;
  roleToDelete: Role | null = null;
  usersWithRole: User[] = [];
  alternativeRoles: Role[] = [];
  selectedNewRoleId: number | null = null;
  isReassigning: boolean = false;

  constructor(
    private roleService: RoleService,
    private userService: UserService,
    private userContextService: UserContextService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Khởi tạo selectedRole sau khi service đã được inject
    this.selectedRole = this.getEmptyRole();
    this.loadRoles();
    
    // Setup debounce cho search
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadRoles();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  loadRoles(): void {
    this.isLoading = true;
    // Nếu có searchTerm, gọi API search, nếu không thì gọi getAllRoles
    const searchObservable = this.searchTerm.trim() 
      ? this.roleService.searchRoles(this.searchTerm, 'PROVIDER')
      : this.roleService.getRoles('PROVIDER');
    
    searchObservable.subscribe({
      next: (data) => {
        // Ẩn role "SYSTEM_ADMIN" dựa trên roleName (không dùng id vì có thể khác nhau giữa mock và real API)
        this.roles = data.filter(role => role.roleName !== 'SYSTEM_ADMIN');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getEmptyRole(): Role {
    // Sử dụng fallback nếu userContextService chưa được inject (trong property initializer)
    const currentUserId = this.userContextService?.getCurrentUserId() || 1;
    return {
      roleName: '',
      typeRole: TypeRole.PROVIDER,
      description: '',
      createBy: currentUserId,
      updateBy: currentUserId
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
    this.isSaving = false;
  }

  saveRole(): void {
    // Prevent double submission
    if (this.isSaving) {
      return;
    }

    // Chuẩn hóa tên role trước khi lưu
    const normalizedName = this.normalizeRoleName(this.selectedRole.roleName);
    
    if (!normalizedName || normalizedName.length === 0) {
      alert('Tên role không hợp lệ. Vui lòng nhập tên role.');
      return;
    }

    if (!this.isValidRoleName(normalizedName)) {
      alert('Tên role chỉ được chứa chữ hoa, số và dấu gạch dưới (_).');
      return;
    }

    // Cập nhật tên role đã chuẩn hóa
    this.selectedRole.roleName = normalizedName;
    const currentUserId = this.userContextService.getCurrentUserId();

    this.isSaving = true;

    if (this.isEditMode && this.selectedRole.id) {
      // Update updateBy với current user ID
      this.selectedRole.updateBy = currentUserId;
      
      this.roleService.updateRole(this.selectedRole.id, this.selectedRole).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadRoles();
          this.closeModal();
        },
        error: () => {
          this.isSaving = false;
        }
      });
    } else {
      // Set createBy và updateBy khi tạo mới
      this.selectedRole.createBy = currentUserId;
      this.selectedRole.updateBy = currentUserId;
      
      this.roleService.createRole(this.selectedRole).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadRoles();
          this.closeModal();
        },
        error: () => {
          this.isSaving = false;
        }
      });
    }
  }

  deleteRole(id: number): void {
    const role = this.roles.find(r => r.id === id);
    if (!role) return;

    // Mở modal ngay lập tức và load dữ liệu sau để tránh phải click 2 lần
    this.openReassignModal(role);

    // Kiểm tra xem role có đang được sử dụng không
    this.userService.isRoleInUse(id).subscribe({
      next: (isInUse) => {
        if (!isInUse) {
          // Nếu không có user sử dụng, đóng modal và xóa trực tiếp
          this.closeReassignModal();
          this.roleService.deleteRole(id).subscribe({
            next: (result) => {
              if (result.success) {
                this.loadRoles();
              } else {
                alert(result.message || 'Không thể xóa role này.');
              }
            },
            error: (error) => {
              alert('Có lỗi xảy ra khi xóa role: ' + (error.message || 'Lỗi không xác định'));
            }
          });
        }
        // Nếu có user sử dụng, modal đã được mở và dữ liệu đang được load
      },
      error: () => {
        this.closeReassignModal();
        alert('Có lỗi xảy ra khi kiểm tra role.');
      }
    });
  }

  openReassignModal(role: Role): void {
    this.roleToDelete = role;
    this.selectedNewRoleId = null;
    this.isReassignModalOpen = true;
    this.cdr.detectChanges(); // Đảm bảo modal hiển thị ngay lập tức

    // Load danh sách users đang sử dụng role này
    this.userService.getUsersByRoleId(role.id!).subscribe({
      next: (users) => {
        this.usersWithRole = users;
        this.cdr.detectChanges();
      }
    });

        // Load danh sách role khác cùng typeRole (trừ role đang xóa)
    this.roleService.getRoles(role.typeRole).subscribe({
      next: (roles) => {
        // Filter dựa trên roleName thay vì id
        this.alternativeRoles = roles.filter(r => r.id !== role.id && r.roleName !== 'SYSTEM_ADMIN');
        this.cdr.detectChanges();
      }
    });
  }

  closeReassignModal(): void {
    this.isReassignModalOpen = false;
    this.roleToDelete = null;
    this.usersWithRole = [];
    this.alternativeRoles = [];
    this.selectedNewRoleId = null;
  }

  reassignAndDelete(): void {
    if (!this.roleToDelete || !this.selectedNewRoleId) {
      alert('Vui lòng chọn role mới để gán cho các người dùng.');
      return;
    }

    if (this.alternativeRoles.length === 0) {
      alert('Không có role nào khác để gán. Vui lòng tạo role mới trước.');
      return;
    }

    this.isReassigning = true;
    this.userService.reassignRole(this.roleToDelete.id!, this.selectedNewRoleId).subscribe({
      next: (result) => {
        if (result.success) {
          // Sau khi gán xong, xóa role cũ
          this.roleService.deleteRole(this.roleToDelete!.id!).subscribe({
            next: (deleteResult) => {
              this.isReassigning = false;
              if (deleteResult.success) {
                alert(result.message || `Đã gán role mới cho ${result.updatedCount || this.usersWithRole.length} người dùng và xóa role cũ thành công.`);
                this.closeReassignModal();
                this.loadRoles();
              } else {
                alert('Đã gán role mới nhưng không thể xóa role cũ: ' + (deleteResult.message || ''));
                this.closeReassignModal();
                this.loadRoles();
              }
            },
            error: () => {
              this.isReassigning = false;
              alert('Đã gán role mới nhưng có lỗi khi xóa role cũ.');
              this.closeReassignModal();
              this.loadRoles();
            }
          });
        } else {
          this.isReassigning = false;
          alert(result.message || 'Không thể gán role mới.');
        }
      },
      error: (error) => {
        this.isReassigning = false;
        alert('Có lỗi xảy ra khi gán role: ' + (error.message || 'Lỗi không xác định'));
      }
    });
  }

  get filteredRoles(): Role[] {
    // Roles đã được filter từ API search, chỉ cần ẩn SYSTEM_ADMIN
    // Không cần filter thêm vì đã được xử lý trong loadRoles()
    return this.roles.filter(role => role.roleName !== 'SYSTEM_ADMIN');
  }

  /**
   * Gọi khi search term thay đổi
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Chuẩn hóa tên role theo quy tắc: viết hoa, không dấu, không khoảng trắng, chỉ dùng dấu gạch dưới
   */
  normalizeRoleName(name: string): string {
    // Loại bỏ dấu tiếng Việt
    const withoutAccents = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
    
    // Chuyển thành chữ hoa và thay khoảng trắng bằng dấu gạch dưới
    let normalized = withoutAccents
      .toUpperCase()
      .replace(/\s+/g, '_');
    
    // Loại bỏ các ký tự đặc biệt trừ dấu gạch dưới và chữ cái, số
    normalized = normalized.replace(/[^A-Z0-9_]/g, '');
    
    // Loại bỏ nhiều dấu gạch dưới liên tiếp
    normalized = normalized.replace(/_+/g, '_');
    
    // Loại bỏ dấu gạch dưới ở đầu và cuối
    normalized = normalized.replace(/^_+|_+$/g, '');
    
    return normalized;
  }

  /**
   * Kiểm tra tên role có hợp lệ không
   */
  isValidRoleName(name: string): boolean {
    if (!name || name.trim().length === 0) {
      return false;
    }
    // Chỉ cho phép chữ hoa, số và dấu gạch dưới
    return /^[A-Z0-9_]+$/.test(name);
  }
}


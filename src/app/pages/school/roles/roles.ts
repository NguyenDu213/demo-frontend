import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RoleService } from '../../../services/role.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { Role, TypeRole } from '../../../models/role.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-school-roles',
  templateUrl: './roles.html',
  styleUrls: ['./roles.scss'],
  standalone: false
})
export class SchoolRolesComponent implements OnInit, OnDestroy {
  roles: Role[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedRole: Role = this.getEmptyRole();
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  currentUser: User | null = null;
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
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
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
    const schoolId = this.currentUser?.schoolId ?? undefined;

    // Nếu có searchTerm, gọi API search, nếu không thì gọi getAllRoles
    const searchObservable = this.searchTerm.trim()
      ? this.roleService.searchRoles(this.searchTerm, schoolId, 'SCHOOL')
      : this.roleService.getRoles('SCHOOL', schoolId);

    searchObservable.subscribe({
      next: (data) => {
        // Filter bỏ role "SCHOOL_ADMIN" - không hiển thị trong danh sách
        this.roles = data.filter(role => role.roleName !== 'SCHOOL_ADMIN');
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

    // Đảm bảo typeRole luôn là SCHOOL cho school admin
    this.selectedRole.typeRole = TypeRole.SCHOOL;
    // Đảm bảo schoolId được set từ current user
    this.selectedRole.schoolId = this.currentUser?.schoolId || null;

    const currentUserId = this.currentUser?.id || 1;
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

  deleteRole(id: number): void {
    const role = this.roles.find(r => r.id === id);
    if (!role) return;

    // Xóa trực tiếp, backend sẽ trả về lỗi nếu role đang được sử dụng
    if (confirm(`Bạn có chắc chắn muốn xóa role "${role.roleName}"?`)) {
      this.roleService.deleteRole(id).subscribe({
        next: (result) => {
          if (result.success) {
            this.loadRoles();
            alert('Xóa role thành công!');
          } else {
            // Nếu có lỗi, kiểm tra xem có phải do role đang được sử dụng không
            const message = result.message || '';
            const statusCode = (result as any).statusCode;

            // Kiểm tra HTTP status code 409 (Conflict) hoặc message chứa "người dùng sử dụng"
            if (statusCode === 409 || message.includes('người dùng sử dụng') || message.includes('Conflict')) {
              // Mở modal reassign
              this.openReassignModal(role);
            } else {
              alert(result.message || 'Không thể xóa role này.');
            }
          }
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || 'Lỗi không xác định';
          const statusCode = error.status;

          // Kiểm tra HTTP status code 409 (Conflict) hoặc message chứa "người dùng sử dụng"
          if (statusCode === 409 || errorMessage.includes('người dùng sử dụng') || errorMessage.includes('Conflict')) {
            // Mở modal reassign
            this.openReassignModal(role);
          } else {
            alert('Có lỗi xảy ra khi xóa role: ' + errorMessage);
          }
        }
      });
    }
  }

  openReassignModal(role: Role): void {
    this.roleToDelete = role;
    this.selectedNewRoleId = null;
    this.isReassignModalOpen = true;
    this.alternativeRoles = [];
    this.cdr.detectChanges(); // Đảm bảo modal hiển thị ngay lập tức

    // Load lại role để có userCount mới nhất
    if (role.id) {
      this.roleService.getRoleById(role.id).subscribe({
        next: (updatedRole) => {
          this.roleToDelete = updatedRole;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading role details:', error);
        }
      });
    }

    // Load danh sách role khác cùng typeRole (trừ role đang xóa)
    const schoolId = this.currentUser?.schoolId ?? undefined;
    this.roleService.getRoles(role.typeRole, schoolId).subscribe({
      next: (roles) => {
        this.alternativeRoles = roles.filter(r =>
          r.id !== role.id &&
          r.roleName !== 'SCHOOL_ADMIN' &&
          (r.schoolId === schoolId || r.schoolId === null)
        );
        console.log('Alternative roles loaded:', this.alternativeRoles);
        console.log('Role to delete:', this.roleToDelete);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading alternative roles:', error);
        this.alternativeRoles = [];
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
    // Gọi API reassign và delete trong một lần
    this.roleService.reassignRoleAndDelete(this.roleToDelete.id!, this.selectedNewRoleId).subscribe({
      next: (result) => {
        this.isReassigning = false;
        if (result.success) {
          alert(result.message || 'Đã gán role mới và xóa role cũ thành công.');
          this.closeReassignModal();
          this.loadRoles();
        } else {
          alert(result.message || 'Không thể gán role mới và xóa role cũ.');
        }
      },
      error: (error) => {
        this.isReassigning = false;
        const errorMessage = error.error?.message || error.message || 'Lỗi không xác định';
        alert('Có lỗi xảy ra: ' + errorMessage);
      }
    });
  }

  get filteredRoles(): Role[] {
    // Roles đã được filter từ API search, chỉ cần trả về danh sách
    // Không cần filter thêm vì đã được xử lý trong loadRoles()
    return this.roles;
  }

  /**
   * Gọi khi search term thay đổi
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }
}


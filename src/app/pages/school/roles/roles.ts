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

  // Pagination
  currentPage: number = 0;
  pageSize: number = 3;
  totalElements: number = 0;
  totalPages: number = 0;

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

    // Nếu có searchTerm, gọi API search với pagination, nếu không thì gọi getAllRoles với pagination
    const searchObservable = this.searchTerm.trim()
      ? this.roleService.searchRolesPaginated(this.searchTerm, schoolId, 'SCHOOL', this.currentPage, this.pageSize)
      : this.roleService.getRolesPaginated('SCHOOL', this.currentPage, this.pageSize);

    searchObservable.subscribe({
      next: (pageData) => {
        // Filter bỏ role "SCHOOL_ADMIN" - không hiển thị trong danh sách
        this.roles = pageData.data.filter(role => role.roleName !== 'SCHOOL_ADMIN');
        this.totalElements = pageData.totalElements;
        this.totalPages = pageData.totalPages;

        // Đảm bảo currentPage không vượt quá totalPages
        if (this.totalPages > 0 && this.currentPage >= this.totalPages) {
          this.currentPage = this.totalPages - 1;
          // Reload với page mới
          this.loadRoles();
          return;
        }

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
          // Reset về trang đầu khi thêm mới
          this.currentPage = 0;
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
            // Nếu xóa item cuối cùng trên trang và không phải trang đầu, chuyển về trang trước
            if (this.roles.length === 1 && this.currentPage > 0) {
              this.currentPage--;
            }
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
    // Dùng pagination với size lớn để lấy tất cả roles
    const schoolId = this.currentUser?.schoolId ?? undefined;
    this.roleService.getRolesPaginated(role.typeRole, 0, 100).subscribe({
      next: (pageData) => {
        this.alternativeRoles = pageData.data.filter(r =>
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
          // Nếu xóa item cuối cùng trên trang và không phải trang đầu, chuyển về trang trước
          if (this.roles.length === 1 && this.currentPage > 0) {
            this.currentPage--;
          }
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
    // Roles đã được filter và pagination trong loadRoles()
    return this.roles;
  }

  /**
   * Gọi khi search term thay đổi
   */
  onSearchChange(): void {
    this.currentPage = 0; // Reset về trang đầu khi search
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Chuyển trang
   */
  changePage(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.currentPage = newPage;
      this.loadRoles();
    }
  }

  /**
   * Thay đổi số lượng items mỗi trang
   */
  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadRoles();
  }

  /**
   * Tạo mảng số trang để hiển thị
   */
  get pagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i);
  }
}


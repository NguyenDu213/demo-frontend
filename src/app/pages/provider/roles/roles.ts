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

  // Pagination
  currentPage: number = 0;
  pageSize: number = 3;
  totalElements: number = 0;
  totalPages: number = 0;

  // Biến lưu danh sách lỗi validation từ server: { "field_name": "error_message" }
  fieldErrors: { [key: string]: string } = {};

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
  ) { }

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
    // Nếu có searchTerm, gọi API search với pagination, nếu không thì gọi getAllRoles với pagination
    const searchObservable = this.searchTerm.trim()
      ? this.roleService.searchRolesPaginated(this.searchTerm, undefined, 'PROVIDER', this.currentPage, this.pageSize)
      : this.roleService.getRolesPaginated('PROVIDER', this.currentPage, this.pageSize);

    searchObservable.subscribe({
      next: (pageData) => {
        // Ẩn role "SYSTEM_ADMIN" dựa trên roleName
        this.roles = pageData.data.filter(role => role.roleName !== 'SYSTEM_ADMIN');
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
      typeRole: TypeRole.PROVIDER,
      description: ''
    };
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedRole = this.getEmptyRole();
    this.fieldErrors = {}; // Reset lỗi cũ
    this.isModalOpen = true;
  }

  openEditModal(role: Role): void {
    this.isEditMode = true;
    this.selectedRole = { ...role };
    this.fieldErrors = {}; // Reset lỗi cũ
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedRole = this.getEmptyRole();
    this.fieldErrors = {};
    this.isSaving = false;
  }

  clearError(field: string): void {
    if (this.fieldErrors[field]) {
      delete this.fieldErrors[field];
    }
  }

  saveRole(): void {
    // Prevent double submission
    if (this.isSaving) {
      return;
    }

    // Reset lỗi trước khi validate
    this.fieldErrors = {};

    // Chuẩn hóa tên role trước khi lưu
    const normalizedName = this.normalizeRoleName(this.selectedRole.roleName);

    if (!normalizedName || normalizedName.length === 0) {
      this.fieldErrors['roleName'] = 'Tên role không hợp lệ. Vui lòng nhập tên role.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isValidRoleName(normalizedName)) {
      this.fieldErrors['roleName'] = 'Tên role chỉ được chứa chữ hoa, số và dấu gạch dưới (_).';
      this.cdr.detectChanges();
      return;
    }

    // Cập nhật tên role đã chuẩn hóa
    this.selectedRole.roleName = normalizedName;

    this.isSaving = true;

    if (this.isEditMode && this.selectedRole.id) {
      this.roleService.updateRole(this.selectedRole.id, this.selectedRole).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadRoles();
          this.closeModal();
          alert('Cập nhật role thành công!');
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Lỗi khi cập nhật role:', err);
          console.error('Error structure:', JSON.stringify(err, null, 2));
          this.handleBackendError(err);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.roleService.createRole(this.selectedRole).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadRoles();
          this.closeModal();
          alert('Thêm role mới thành công!');
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Lỗi khi tạo role:', err);
          console.error('Error structure:', JSON.stringify(err, null, 2));
          this.handleBackendError(err);
          this.cdr.detectChanges();
        }
      });
    }
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
    this.roleService.getRolesPaginated(role.typeRole, 0, 100).subscribe({
      next: (pageData) => {
        // Filter dựa trên roleName thay vì id - loại bỏ role đang xóa và SYSTEM_ADMIN
        this.alternativeRoles = pageData.data.filter(r =>
          r.id !== role.id &&
          r.roleName !== 'SYSTEM_ADMIN'
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
    // Roles đã được filter từ API search, chỉ cần ẩn SYSTEM_ADMIN
    // Không cần filter thêm vì đã được xử lý trong loadRoles()
    return this.roles.filter(role => role.roleName !== 'SYSTEM_ADMIN');
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

  private handleBackendError(err: any): void {
    console.log('handleBackendError called with:', err);
    const errorBody = err.error;
    console.log('errorBody:', errorBody);

    // Kiểm tra validation errors (field errors) - có thể ở data hoặc trực tiếp trong errorBody
    if (errorBody && errorBody.data && typeof errorBody.data === 'object' && !Array.isArray(errorBody.data)) {
      // Kiểm tra xem data có chứa field errors không (ví dụ: { roleName: "error message" })
      const hasFieldErrors = Object.keys(errorBody.data).some(key =>
        typeof errorBody.data[key] === 'string' && key !== 'message'
      );

      if (hasFieldErrors) {
        this.fieldErrors = errorBody.data;
        console.log('Phát hiện lỗi Validation:', this.fieldErrors);
        // Không hiển thị alert khi có validation errors, chỉ hiển thị trên form
        return;
      }
    }

    // Nếu không phải validation errors, hiển thị message
    if (errorBody && errorBody.message) {
      console.log('Hiển thị alert với message:', errorBody.message);
      alert(errorBody.message);
    } else {
      console.log('Lỗi không xác định');
      alert('Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    }
  }
}


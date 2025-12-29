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
      error: (error) => {
        this.isLoading = false;
        console.error('Lỗi khi tải danh sách roles:', error);

        // Xử lý lỗi chi tiết
        const errorBody = error.error || {};
        const statusCode = error.status || errorBody.statusCode || 500;
        const errorMessage = errorBody.message || error.message || 'Lỗi không xác định';

        // Chỉ hiển thị alert cho các lỗi quan trọng, không hiển thị cho lỗi 401 (sẽ được xử lý bởi interceptor)
        if (statusCode === 401) {
          // Authentication error - có thể được xử lý bởi auth interceptor
          console.log('Authentication error - may be handled by interceptor');
        } else if (statusCode === 403) {
          alert(`❌ Lỗi quyền truy cập:\n${errorMessage}\n\nBạn không có quyền xem danh sách roles.`);
        } else if (statusCode === 500) {
          alert(`❌ Lỗi máy chủ:\nKhông thể tải danh sách roles. Vui lòng thử lại sau.\n\nChi tiết: ${errorMessage}`);
        } else {
          // Các lỗi khác
          alert(`⚠️ Không thể tải danh sách roles:\n${errorMessage}`);
        }

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
          // Nếu không load được role details, vẫn dùng role hiện tại
          // Chỉ log lỗi, không hiển thị alert vì đây là thao tác phụ
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

        // Hiển thị thông báo lỗi nếu cần
        const errorBody = error.error || {};
        const statusCode = error.status || errorBody.statusCode || 500;
        const errorMessage = errorBody.message || error.message || 'Lỗi không xác định';

        if (statusCode === 403) {
          alert(`❌ Lỗi quyền truy cập:\n${errorMessage}\n\nKhông thể tải danh sách roles thay thế.`);
        } else if (statusCode >= 500) {
          console.error('Server error when loading alternative roles');
          // Không hiển thị alert vì đây là thao tác phụ, chỉ log
        }

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
      alert('⚠️ Vui lòng chọn role mới để gán cho các người dùng.');
      return;
    }

    if (this.alternativeRoles.length === 0) {
      alert('⚠️ Không có role nào khác để gán. Vui lòng tạo role mới trước.');
      return;
    }

    this.isReassigning = true;
    // Gọi API reassign và delete trong một lần
    this.roleService.reassignRoleAndDelete(this.roleToDelete.id!, this.selectedNewRoleId).subscribe({
      next: (result) => {
        this.isReassigning = false;
        if (result.success) {
          alert('✅ ' + (result.message || 'Đã gán role mới và xóa role cũ thành công.'));
          this.closeReassignModal();
          // Nếu xóa item cuối cùng trên trang và không phải trang đầu, chuyển về trang trước
          if (this.roles.length === 1 && this.currentPage > 0) {
            this.currentPage--;
          }
          this.loadRoles();
        } else {
          // Xử lý lỗi từ response (nếu có)
          const errorMessage = result.message || 'Không thể gán role mới và xóa role cũ.';
          alert('⚠️ ' + errorMessage);
        }
      },
      error: (error) => {
        this.isReassigning = false;
        console.error('Lỗi khi gán role mới và xóa role cũ:', error);

        // Sử dụng handleBackendError để xử lý lỗi chi tiết
        const errorBody = error.error || {};
        const statusCode = error.status || errorBody.statusCode || 500;
        const errorMessage = errorBody.message || error.message || 'Lỗi không xác định';

        // Xử lý các trường hợp lỗi cụ thể cho reassign
        if (statusCode === 400) {
          // Bad Request: Role mới phải cùng loại, role mới phải thuộc cùng một trường
          if (errorMessage.includes('cùng loại') || errorMessage.includes('cùng một trường')) {
            alert(`⚠️ Lỗi dữ liệu:\n${errorMessage}\n\nVui lòng chọn role mới cùng loại và cùng phạm vi với role cũ.`);
          } else {
            alert(`⚠️ Lỗi dữ liệu:\n${errorMessage}`);
          }
        } else if (statusCode === 404) {
          alert(`⚠️ Không tìm thấy:\n${errorMessage}\n\nVui lòng kiểm tra lại role đã chọn.`);
        } else if (statusCode === 403) {
          alert(`❌ Lỗi quyền truy cập:\n${errorMessage}`);
        } else {
          // Sử dụng handleBackendError cho các lỗi khác
          this.handleBackendError(error);
        }

        this.cdr.detectChanges();
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

  /**
   * Xử lý chi tiết các lỗi từ backend
   * Hỗ trợ các loại lỗi:
   * - Validation errors (400): Field-level errors từ MethodArgumentNotValidException hoặc ValidationException
   * - Business logic errors: ResourceNotFound, Forbidden, BadRequest, Conflict, Authentication
   * - Database errors: DataIntegrityViolationException
   * - Server errors: 500 Internal Server Error
   */
  private handleBackendError(err: any): void {
    console.log('handleBackendError called with:', err);

    const errorBody = err.error || {};
    const statusCode = err.status || errorBody.statusCode || 500;
    const errorMessage = errorBody.message || err.message || 'Đã xảy ra lỗi không xác định';

    console.log('Error details:', {
      statusCode,
      message: errorMessage,
      errorBody,
      fullError: err
    });

    // ============================================================
    // 1. XỬ LÝ VALIDATION ERRORS (400) - Field-level errors
    // ============================================================
    // Backend trả về validation errors trong errorBody.data dưới dạng Map<String, String>
    // Ví dụ: { "roleName": "Tên role không được để trống", "description": "Mô tả phải từ 5 đến 500 ký tự" }
    if (errorBody.data && typeof errorBody.data === 'object' && !Array.isArray(errorBody.data)) {
      const dataKeys = Object.keys(errorBody.data);

      // Kiểm tra xem data có chứa field errors không
      // Field errors có key là tên field (không phải "message") và value là string
      const hasFieldErrors = dataKeys.some(key => {
        const value = errorBody.data[key];
        return key !== 'message' && typeof value === 'string' && value.trim().length > 0;
      });

      if (hasFieldErrors) {
        // Lọc chỉ lấy field errors (loại bỏ các key không phải field name)
        const fieldErrorsMap: { [key: string]: string } = {};
        dataKeys.forEach(key => {
          const value = errorBody.data[key];
          if (key !== 'message' && typeof value === 'string' && value.trim().length > 0) {
            fieldErrorsMap[key] = value;
          }
        });

        if (Object.keys(fieldErrorsMap).length > 0) {
          this.fieldErrors = fieldErrorsMap;
          console.log('Phát hiện lỗi Validation (field-level):', this.fieldErrors);

          // Hiển thị thông báo tổng quát nếu có message từ backend
          if (errorBody.message && errorBody.message !== 'Dữ liệu không hợp lệ') {
            // Chỉ hiển thị alert nếu message có thông tin hữu ích
            console.log('Validation message:', errorBody.message);
          }

          // Không hiển thị alert khi có validation errors, chỉ hiển thị trên form
          return;
        }
      }
    }

    // ============================================================
    // 2. XỬ LÝ CÁC LOẠI LỖI BUSINESS LOGIC THEO STATUS CODE
    // ============================================================

    // 401 - Unauthorized: Authentication errors
    if (statusCode === 401) {
      const message = this.extractErrorMessage(errorMessage, [
        'Vui lòng đăng nhập',
        'Authentication Error',
        'Token không hợp lệ',
        'Token đã hết hạn'
      ]);
      alert(message);
      // Có thể redirect đến login page nếu cần
      return;
    }

    // 403 - Forbidden: Permission denied
    if (statusCode === 403) {
      const message = this.extractErrorMessage(errorMessage, [
        'Bạn không có quyền',
        'Truy cập bị từ chối',
        'Admin hệ thống không được phép',
        'Admin trường không được phép',
        'Forbidden'
      ]);
      alert(`❌ Lỗi quyền truy cập:\n${message}`);
      return;
    }

    // 404 - Not Found: Resource not found
    if (statusCode === 404) {
      const message = this.extractErrorMessage(errorMessage, [
        'Không tìm thấy role',
        'Không tìm thấy',
        'Resource Not Found'
      ]);
      alert(`⚠️ Không tìm thấy:\n${message}`);
      return;
    }

    // 409 - Conflict: Data integrity violations, role in use
    if (statusCode === 409) {
      // Kiểm tra xem có phải lỗi role đang được sử dụng không
      if (errorMessage.includes('người dùng sử dụng') ||
        errorMessage.includes('Đang có') ||
        errorMessage.includes('Conflict')) {
        // Lỗi này đã được xử lý trong deleteRole(), không cần xử lý lại ở đây
        // Nhưng vẫn hiển thị message để user biết
        console.log('Conflict error (role in use) - should be handled in deleteRole()');
        return;
      }

      // Các lỗi conflict khác (duplicate data, data integrity)
      const message = this.extractErrorMessage(errorMessage, [
        'Dữ liệu đã tồn tại',
        'Tên quyền hạn đã tồn tại',
        'Vi phạm ràng buộc',
        'Data Integrity Violation',
        'Conflict'
      ]);
      alert(`⚠️ Xung đột dữ liệu:\n${message}`);
      return;
    }

    // 400 - Bad Request: Business logic errors (không phải validation)
    if (statusCode === 400) {
      // Kiểm tra xem có phải validation error không (đã xử lý ở trên)
      // Nếu không phải, đây là business logic error
      const message = this.extractErrorMessage(errorMessage, [
        'Role mới phải cùng loại',
        'Role mới phải thuộc cùng một trường',
        'Bad Request',
        'Dữ liệu không hợp lệ'
      ]);
      alert(`⚠️ Lỗi dữ liệu:\n${message}`);
      return;
    }

    // 500 - Internal Server Error: Server errors
    if (statusCode >= 500) {
      console.error('Server error:', errorMessage);
      alert(`❌ Lỗi máy chủ:\nĐã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.\n\nChi tiết: ${errorMessage}`);
      return;
    }

    // ============================================================
    // 3. FALLBACK: Xử lý các lỗi khác
    // ============================================================
    // Nếu có message từ backend, hiển thị message đó
    if (errorBody.message) {
      console.log('Hiển thị alert với message từ backend:', errorBody.message);
      alert(`⚠️ ${errorBody.message}`);
    } else if (errorMessage) {
      console.log('Hiển thị alert với error message:', errorMessage);
      alert(`⚠️ ${errorMessage}`);
    } else {
      console.log('Lỗi không xác định');
      alert('❌ Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    }
  }

  /**
   * Trích xuất thông điệp lỗi từ error message
   * Ưu tiên các message cụ thể, nếu không có thì dùng message mặc định
   */
  private extractErrorMessage(message: string, keywords: string[]): string {
    if (!message) {
      return 'Đã xảy ra lỗi không xác định';
    }

    // Tìm message có chứa keyword
    for (const keyword of keywords) {
      if (message.toLowerCase().includes(keyword.toLowerCase())) {
        return message;
      }
    }

    // Nếu không khớp keyword nào, trả về message gốc
    return message;
  }

  /**
   * Lấy danh sách lỗi validation tổng quát (không phải field-specific)
   * Ví dụ: validSchoolId, typeRole, etc.
   */
  getGeneralErrors(): string[] {
    const generalErrorFields = ['typeRole', 'schoolId', 'validSchoolId'];
    const errors: string[] = [];

    for (const field of generalErrorFields) {
      if (this.fieldErrors[field]) {
        errors.push(this.fieldErrors[field]);
      }
    }

    return errors;
  }

  /**
   * Kiểm tra xem có lỗi validation tổng quát không (không phải field-specific)
   */
  hasGeneralErrors(): boolean {
    const fieldSpecificErrors = ['roleName', 'description'];
    const errorKeys = Object.keys(this.fieldErrors);

    // Kiểm tra xem có lỗi nào không phải là field-specific không
    return errorKeys.length > 0 && errorKeys.some(key => !fieldSpecificErrors.includes(key));
  }
}


import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SchoolService } from '../../../services/school.service';
import { School } from '../../../models/school.model';

@Component({
  selector: 'app-provider-schools',
  templateUrl: './schools.html',
  styleUrls: ['./schools.scss'],
  standalone: false
})
export class ProviderSchoolsComponent implements OnInit {
  schools: School[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  selectedSchool: School = this.getEmptySchool();
  searchTerm: string = '';
  isSaving: boolean = false;
  fieldErrors: { [key: string]: string } = {};

  currentPage: number = 0;
  pageSize: number = 3;
  totalElements: number = 0;
  totalPages: number = 0;

  constructor(
    private schoolService: SchoolService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadSchools();
  }

  getEmptySchool(): School {
    return {
      name: '',
      code: '',
      email: '',
      hotline: '',
      address: '',
      principalName: ''
    };
  }

  loadSchools(): void {
    this.isLoading = true;

    this.schoolService.getAllSchools(this.currentPage, this.pageSize).subscribe({
      next: (data) => {
        this.schools = data.data;
        this.totalElements = data.totalElements;
        this.totalPages = data.totalPages;

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách:', err);
        this.isLoading = false;
        if (err.status === 403) alert('Bạn không có quyền truy cập.');
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;

    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.loadSchools();
      return;
    }

    this.isLoading = true;
    this.schoolService.searchSchools(this.searchTerm.trim(), this.currentPage, this.pageSize).subscribe({
      next: (data) => {
        this.schools = data.data;
        this.totalElements = data.totalElements;
        this.totalPages = data.totalPages;

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tìm kiếm:', err);
        this.isLoading = false;
        this.schools = [];
        this.cdr.detectChanges();
      }
    });
  }

  changePage(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.currentPage = newPage;
      if (this.searchTerm.trim()) {
        this.onSearch();
      } else {
        this.loadSchools();
      }
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 0;

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.onSearch();
    } else {
      this.loadSchools();
    }
  }

  get pagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i);
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedSchool = this.getEmptySchool();
    this.fieldErrors = {}; // Reset lỗi cũ
    this.isModalOpen = true;
  }

  openEditModal(school: School): void {
    this.isEditMode = true;
    this.selectedSchool = { ...school }; // Clone object
    this.fieldErrors = {}; // Reset lỗi cũ
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedSchool = this.getEmptySchool();
    this.fieldErrors = {};
    this.isSaving = false;
  }

  clearError(field: string): void {
    if (this.fieldErrors[field]) {
      delete this.fieldErrors[field];
    }
  }

  saveSchool(): void {
    if (this.isSaving) return;

    this.isSaving = true;
    this.fieldErrors = {};

    const request = this.isEditMode && this.selectedSchool.id
      ? this.schoolService.updateSchool(this.selectedSchool.id, this.selectedSchool)
      : this.schoolService.createSchool(this.selectedSchool);

    request.subscribe({
      next: (response) => {
        // Success Logic
        this.isSaving = false;
        this.loadSchools();
        this.closeModal();
        alert(this.isEditMode ? 'Cập nhật thành công!' : 'Thêm trường mới thành công!');
      },
      error: (err) => {
        // Error Logic
        this.isSaving = false;
        console.error('Lỗi khi lưu:', err);
        this.handleBackendError(err);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Xử lý chi tiết các lỗi từ backend
   * Tương tự như handleBackendError trong roles component
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
    if (errorBody.data && typeof errorBody.data === 'object' && !Array.isArray(errorBody.data)) {
      const dataKeys = Object.keys(errorBody.data);
      
      const hasFieldErrors = dataKeys.some(key => {
        const value = errorBody.data[key];
        return key !== 'message' && typeof value === 'string' && value.trim().length > 0;
      });

      if (hasFieldErrors) {
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
          return;
        }
      }
    }

    // ============================================================
    // 2. XỬ LÝ CÁC LOẠI LỖI BUSINESS LOGIC THEO STATUS CODE
    // ============================================================
    
    if (statusCode === 401) {
      const message = this.extractErrorMessage(errorMessage, [
        'Vui lòng đăng nhập',
        'Authentication Error',
        'Token không hợp lệ',
        'Token đã hết hạn'
      ]);
      alert(message);
      return;
    }

    if (statusCode === 403) {
      const message = this.extractErrorMessage(errorMessage, [
        'Bạn không có quyền',
        'Truy cập bị từ chối',
        'Forbidden'
      ]);
      alert(`❌ Lỗi quyền truy cập:\n${message}`);
      return;
    }

    if (statusCode === 404) {
      const message = this.extractErrorMessage(errorMessage, [
        'Không tìm thấy',
        'Resource Not Found'
      ]);
      alert(`⚠️ Không tìm thấy:\n${message}`);
      return;
    }

    if (statusCode === 409) {
      const message = this.extractErrorMessage(errorMessage, [
        'Dữ liệu đã tồn tại',
        'Vi phạm ràng buộc',
        'Data Integrity Violation',
        'Conflict'
      ]);
      alert(`⚠️ Xung đột dữ liệu:\n${message}`);
      return;
    }

    if (statusCode === 400) {
      const message = this.extractErrorMessage(errorMessage, [
        'Bad Request',
        'Dữ liệu không hợp lệ'
      ]);
      alert(`⚠️ Lỗi dữ liệu:\n${message}`);
      return;
    }

    if (statusCode >= 500) {
      console.error('Server error:', errorMessage);
      alert(`❌ Lỗi máy chủ:\nĐã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.\n\nChi tiết: ${errorMessage}`);
      return;
    }

    // ============================================================
    // 3. FALLBACK: Xử lý các lỗi khác
    // ============================================================
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
   */
  private extractErrorMessage(message: string, keywords: string[]): string {
    if (!message) {
      return 'Đã xảy ra lỗi không xác định';
    }

    for (const keyword of keywords) {
      if (message.toLowerCase().includes(keyword.toLowerCase())) {
        return message;
      }
    }

    return message;
  }

  deleteSchool(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa trường này? Tất cả tài khoản và quyền liên quan đến trường này sẽ bị xóa.')) {
      this.schoolService.deleteSchool(id).subscribe({
        next: () => {
          this.loadSchools();
          alert('Đã xóa thành công.');
        },
        error: (err) => {
          console.error('Lỗi xóa:', err);
          const msg = err.error?.message || 'Không thể xóa trường học này.';
          alert(msg);
        }
      });
    }
  }
}

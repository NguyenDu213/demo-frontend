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

  private handleBackendError(err: any): void {
    const errorBody = err.error;
    if (errorBody && errorBody.data && typeof errorBody.data === 'object' && !Array.isArray(errorBody.data)) {
      this.fieldErrors = errorBody.data;
      console.log('Phát hiện lỗi Validation:', this.fieldErrors);
    } else if (errorBody && errorBody.message) {
      alert(errorBody.message);
    } else {
      alert('Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    }
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

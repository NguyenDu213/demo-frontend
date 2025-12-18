import { Component, OnInit } from '@angular/core';
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

  constructor(private schoolService: SchoolService) { }

  ngOnInit(): void {
    this.loadSchools();
  }

  loadSchools(): void {
    this.isLoading = true;
    this.schoolService.getAllSchools().subscribe({
      next: (data) => {
        this.schools = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
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

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedSchool = this.getEmptySchool();
    this.isModalOpen = true;
  }

  openEditModal(school: School): void {
    this.isEditMode = true;
    this.selectedSchool = { ...school };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedSchool = this.getEmptySchool();
  }

  saveSchool(): void {
    if (this.isEditMode && this.selectedSchool.id) {
      this.schoolService.updateSchool(this.selectedSchool.id, this.selectedSchool).subscribe({
        next: () => {
          this.loadSchools();
          this.closeModal();
        }
      });
    } else {
      // Tạo trường mới - admin trường sẽ được tạo tự động
      this.schoolService.createSchool(this.selectedSchool).subscribe({
        next: () => {
          this.loadSchools();
          this.closeModal();
          alert('Đã tạo trường học và tài khoản admin trường thành công!');
        }
      });
    }
  }

  deleteSchool(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa trường học này?')) {
      this.schoolService.deleteSchool(id).subscribe({
        next: () => {
          this.loadSchools();
        }
      });
    }
  }

  get filteredSchools(): School[] {
    if (!this.searchTerm) {
      return this.schools;
    }
    const term = this.searchTerm.toLowerCase();
    return this.schools.filter(school =>
      school.name.toLowerCase().includes(term)
    );
  }
}


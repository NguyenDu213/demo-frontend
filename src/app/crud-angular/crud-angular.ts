import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { Crud, User } from '../service/crud';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-crud-angular',
  standalone: false,
  templateUrl: './crud-angular.html',
  styleUrl: './crud-angular.scss',
})
export class CrudAngular implements OnInit {
  users: User[] = [];

  currentUser: any = {
    fullName: '',
    email: '',
    password: ''
  };

  isEditMode: boolean = false;

 
  constructor(
    private crudService: Crud, 
    private cd: ChangeDetectorRef,
    private message: NzMessageService,
    private msg: NzMessageService
  ) {}

  ngOnInit(): void {
    console.log('1. ngOnInit đã chạy');
    this.loadUsers();
  }

  loadUsers() {
    this.crudService.getAll().subscribe({
      next: (res) => {
        this.users = res.content;
        this.cd.detectChanges();
      },
      error: (err) => this.msg.error('Lỗi tải dữ liệu!') 
    });
  }
  saveUser() {
    if (!this.currentUser.fullName || this.currentUser.fullName.trim().length < 2) {
      this.msg.warning('Vui lòng nhập họ tên!');
      return;
    }

    if (!this.currentUser.email || this.currentUser.email.trim() === '') {
      this.msg.warning('Vui lòng nhập email!');
      return;
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(this.currentUser.email)) {
      this.msg.warning('Email không hợp lệ! (Ví dụ: abc@gmail.com)');
      return;
    }

    if (!this.isEditMode && (!this.currentUser.password || this.currentUser.password.trim().length < 6)) {
      this.msg.warning('Vui lòng nhập mật khẩu ít nhất 6 ký tự!');
      return;
    }

    if (this.isEditMode) {
      this.crudService.update(this.currentUser.id, this.currentUser).subscribe({
        next: (res) => {
          this.msg.success('Cập nhật thành công!'); 
          this.loadUsers();
          this.resetForm();
        },
        error: (err) => this.msg.error('Lỗi: ' + err.message)
      });
    } else {
      this.crudService.create(this.currentUser).subscribe({
        next: (res) => {
          this.msg.success('Thêm mới thành công!');
          this.loadUsers();
          this.resetForm();
        },
        error: (err) => this.msg.error('Lỗi: ' + err.message)
      });
    }
  }

  editUser(user: User) {
    this.isEditMode = true;
    this.currentUser = { ...user, password: '' };
  }

  
  deleteUser(id: number) {
    this.crudService.delete(id).subscribe({
      next: (res) => {
        this.msg.success('Đã xóa user!');
        this.loadUsers();
      },
      error: (err) => this.msg.error('Xóa thất bại!')
    });
  }

  resetForm() {
    this.isEditMode = false;
    this.currentUser = { fullName: '', email: '', password: '' };
  }
}
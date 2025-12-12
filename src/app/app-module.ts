import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; // Để dùng [(ngModel)]
import { provideHttpClient } from '@angular/common/http'; // Để gọi API
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; // Hiệu ứng động
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

// --- 1. CÁC MODULE CỦA ANT DESIGN (Giao diện) ---
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzGridModule } from 'ng-zorro-antd/grid'; // Để chia cột (nz-row, nz-col)
import { NzFormModule } from 'ng-zorro-antd/form'; // Để làm Form đẹp (nz-form-item)

// --- 2. CẤU HÌNH NGÔN NGỮ & ICON ---
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
// Import các icon cụ thể để tránh lỗi 404
import { 
  UserOutline, 
  LockOutline, 
  MailOutline, 
  PlusOutline, 
  EditOutline, 
  DeleteOutline, 
  SaveOutline 
} from '@ant-design/icons-angular/icons';

// --- 3. IMPORT COMPONENT CỦA BẠN ---
import { App } from './app';
import { CrudAngular } from './crud-angular/crud-angular';

// Đăng ký locale tiếng Anh cho Angular
registerLocaleData(en);

// Gom icon vào mảng
const icons = [
  UserOutline, 
  LockOutline, 
  MailOutline, 
  PlusOutline, 
  EditOutline, 
  DeleteOutline, 
  SaveOutline
];

@NgModule({
  declarations: [
    App,
    CrudAngular
  ],
  imports: [
    BrowserModule,
    FormsModule,
    
    // Khai báo các module Ant Design vào đây
    NzButtonModule,
    NzTableModule,
    NzInputModule,
    NzIconModule,
    NzCardModule,
    NzPopconfirmModule,
    NzGridModule,
    NzFormModule
  ],
  providers: [
    // Cấu hình hiện đại (thay thế Module cũ)
    provideHttpClient(),
    provideAnimationsAsync(),

    // Chuyển tiếng Trung -> Tiếng Anh
    { provide: NZ_I18N, useValue: en_US },

    // Đăng ký Icon để không bị lỗi console
    { provide: NZ_ICONS, useValue: icons }
  ],
  bootstrap: [App]
})
export class AppModule { }
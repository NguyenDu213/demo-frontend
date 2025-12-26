import { Component, Input } from '@angular/core';
import { AbstractControl, NgModel } from '@angular/forms';

@Component({
  selector: 'app-error-message',
  template: `
    <div *ngIf="shouldShowError()" class="mt-1.5 flex items-start gap-1.5">
      <!-- Error Icon -->
      <svg class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <!-- Error Message -->
      <p class="text-sm text-red-600 font-medium leading-relaxed">
        {{ getErrorMessage() }}
      </p>
    </div>
  `,
  standalone: false
})
export class ErrorMessageComponent {
  @Input() control: NgModel | AbstractControl | null = null;
  @Input() label: string = '';
  @Input() backendError: string = '';

  shouldShowError(): boolean {
    if (this.control && this.control.invalid && (this.control.dirty || this.control.touched)) {
      return true;
    }
    if (this.backendError) {
      return true;
    }
    return false;
  }

  getErrorMessage(): string {
    // Ưu tiên hiển thị lỗi từ backend (validation errors từ server)
    if (this.backendError && this.backendError.trim()) {
      return this.backendError;
    }

    // Xử lý lỗi validation từ frontend (Angular forms)
    if (this.control && this.control.errors) {
      const errors = this.control.errors;

      // Required validation
      if (errors['required']) {
        return `${this.label} không được để trống`;
      }

      // Email validation
      if (errors['email']) {
        return `${this.label} không đúng định dạng email (ví dụ: username@gmail.com)`;
      }

      // MinLength validation
      if (errors['minlength']) {
        const requiredLength = errors['minlength'].requiredLength;
        const actualLength = errors['minlength'].actualLength;
        return `${this.label} phải có ít nhất ${requiredLength} ký tự (hiện tại: ${actualLength} ký tự)`;
      }

      // MaxLength validation
      if (errors['maxlength']) {
        const requiredLength = errors['maxlength'].requiredLength;
        const actualLength = errors['maxlength'].actualLength;
        return `${this.label} tối đa ${requiredLength} ký tự (hiện tại: ${actualLength} ký tự)`;
      }

      // Pattern validation - hiển thị chi tiết hơn
      if (errors['pattern']) {
        const labelLower = this.label.toLowerCase();
        // Kiểm tra pattern cụ thể dựa trên field name
        if (labelLower.includes('role') || labelLower.includes('tên role')) {
          return `${this.label} chỉ được chứa chữ hoa, số và dấu gạch dưới (ví dụ: ADMIN_USER, TEACHER_ROLE)`;
        }
        if (labelLower.includes('mã trường')) {
          return `${this.label} chỉ được chứa chữ in hoa và số (không có dấu gạch dưới). Ví dụ: TH001, ABC123`;
        }
        if (labelLower.includes('họ tên')) {
          return `${this.label} chỉ được chứa chữ cái (chữ hoa và chữ thường) và khoảng trắng. Không được chứa số, ký tự đặc biệt hoặc dấu tiếng Việt (ví dụ: "Nguyen Van A" - hợp lệ, "Nguyễn Văn A" - không hợp lệ)`;
        }
        if (labelLower.includes('tên trường')) {
          return `${this.label} chỉ được chứa chữ cái (chữ hoa và chữ thường) và khoảng trắng. Không được chứa số, ký tự đặc biệt hoặc dấu tiếng Việt (ví dụ: "Trường THPT ABC" - hợp lệ, "Trường THPT 123" - không hợp lệ)`;
        }
        if (labelLower.includes('tên hiệu trưởng')) {
          return `${this.label} chỉ được chứa chữ cái (chữ hoa và chữ thường) và khoảng trắng. Không được chứa số, ký tự đặc biệt hoặc dấu tiếng Việt (ví dụ: "Nguyen Van A" - hợp lệ, "Nguyễn Văn A" - không hợp lệ)`;
        }
        if (labelLower.includes('số điện thoại') || labelLower.includes('hotline')) {
          return `${this.label} chỉ được chứa số, bắt đầu bằng 0 và có 10 chữ số (ví dụ: 0123456789)`;
        }
        if (labelLower.includes('địa chỉ')) {
          return `${this.label} chỉ được chứa chữ cái, số, khoảng trắng và các ký tự: / , . -`;
        }
        return `${this.label} chứa ký tự không hợp lệ`;
      }

      // Min validation
      if (errors['min']) {
        return `${this.label} phải lớn hơn hoặc bằng ${errors['min'].min}`;
      }

      // Max validation
      if (errors['max']) {
        return `${this.label} phải nhỏ hơn hoặc bằng ${errors['max'].max}`;
      }

      // Custom validation errors
      if (errors['custom']) {
        return errors['custom'];
      }
    }

    return '';
  }
}

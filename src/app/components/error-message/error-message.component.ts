import { Component, Input } from '@angular/core';
import { AbstractControl, NgModel } from '@angular/forms';

@Component({
  selector: 'app-error-message',
  template: `
    <div *ngIf="shouldShowError()" class="text-red-500 text-xs italic mt-1">
      {{ getErrorMessage() }}
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
    if (this.backendError) {
      console.log(this.backendError);
      return this.backendError;
    }

    if (this.control && this.control.errors) {
      const errors = this.control.errors;
      if (errors['required']) return `${this.label} không được để trống`;
      if (errors['email']) return `${this.label} không đúng định dạng (VD: username@gmail.com)`;
      if (errors['minlength']) return `${this.label} phải có ít nhất ${errors['minlength'].requiredLength} ký tự`;
      if (errors['maxlength']) return `${this.label} tối đa ${errors['maxlength'].requiredLength} ký tự`;
      if (errors['pattern']) return `${this.label} chứa ký tự không hợp lệ`;
    }
    return '';
  }
}

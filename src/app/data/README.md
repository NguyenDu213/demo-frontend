# Mock Data cho Testing

File này chứa dữ liệu mẫu để test các chức năng của ứng dụng khi chưa có backend.

## Cách sử dụng

Các service đã được cấu hình để sử dụng mock data khi `USE_MOCK_DATA = true` trong các file service.

## Tài khoản đăng nhập mẫu

### Provider (Hệ thống):
- **Email:** `admin@system.com` | **Password:** `admin123` (System Admin)
- **Email:** `staff@system.com` | **Password:** `staff123` (System Staff)

### School (Trường học):
- **Email:** `an.nguyen@school1.edu.vn` | **Password:** `admin123` (School Admin - Trường 1)
- **Email:** `binh.tran@school2.edu.vn` | **Password:** `admin123` (School Admin - Trường 2)
- **Email:** `lan.tran@school1.edu.vn` | **Password:** `teacher123` (Teacher - Trường 1)
- **Email:** `duc.pham@school2.edu.vn` | **Password:** `teacher123` (Teacher - Trường 2)
- **Email:** `hung.le@school1.edu.vn` | **Password:** `student123` (Student - Trường 1)
- **Email:** `mai.hoang@school2.edu.vn` | **Password:** `student123` (Student - Trường 2)

## Dữ liệu mẫu

### Schools (3 trường học)
1. Trường Tiểu học Nguyễn Du (ID: 1)
2. Trường THCS Lê Lợi (ID: 2)
3. Trường THPT Chu Văn An (ID: 3)

### Roles (7 roles)
- System Admin (Provider)
- System Staff (Provider)
- School Admin (School - null schoolId)
- Teacher (School - cho từng trường)
- Student (School - cho từng trường)

### Users (8 người dùng)
- 2 Provider users
- 3 School 1 users (1 admin, 1 teacher, 1 student)
- 3 School 2 users (1 admin, 1 teacher, 1 student)

## Lưu ý

- Mock data được lưu trong localStorage với các key:
  - `mock_schools`
  - `mock_users`
  - `mock_roles`
- Để chuyển sang sử dụng API thực, đặt `USE_MOCK_DATA = false` trong các service files.


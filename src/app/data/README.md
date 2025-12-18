# Mock Data cho Testing

File này chứa dữ liệu mẫu để test các chức năng của ứng dụng khi chưa có backend.

## Cách sử dụng

Các service đã được cấu hình để sử dụng mock data khi `USE_MOCK_DATA = true` trong các file service.

## Tài khoản đăng nhập mẫu

### Provider (Hệ thống):
- **Email:** `admin@system.com` | **Password:** `admin123` (SYSTEM_ADMIN)
- **Email:** `staff@system.com` | **Password:** `staff123` (SYSTEM_STAFF)

### School (Trường học):
- **Email:** `an.nguyen@school1.edu.vn` | **Password:** `admin123` (SCHOOL_ADMIN - Trường 1)
- **Email:** `binh.tran@school2.edu.vn` | **Password:** `admin123` (SCHOOL_ADMIN - Trường 2)
- **Email:** `lan.tran@school1.edu.vn` | **Password:** `teacher123` (TEACHER - Trường 1)
- **Email:** `duc.pham@school2.edu.vn` | **Password:** `teacher123` (TEACHER - Trường 2)
- **Email:** `hung.le@school1.edu.vn` | **Password:** `student123` (STUDENT - Trường 1)
- **Email:** `mai.hoang@school2.edu.vn` | **Password:** `student123` (STUDENT - Trường 2)

## Dữ liệu mẫu

### Schools (3 trường học)
1. Trường Tiểu học Nguyễn Du (ID: 1)
2. Trường THCS Lê Lợi (ID: 2)
3. Trường THPT Chu Văn An (ID: 3)

### Roles (7 roles)
- SYSTEM_ADMIN (Provider)
- SYSTEM_STAFF (Provider)
- SCHOOL_ADMIN (School - null schoolId)
- TEACHER (School - cho từng trường)
- STUDENT (School - cho từng trường)

**Lưu ý:** Tên role phải tuân theo quy tắc: viết hoa, không dấu, không khoảng trắng, chỉ dùng dấu gạch dưới (_).

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


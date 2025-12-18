# Tóm tắt Refactoring - Loại bỏ Hardcoded Data

## Mục tiêu
Loại bỏ các phần logic đang fix cứng dữ liệu (hardcoded), đặc biệt là:
- ID của người tạo và người cập nhật (createBy, updateBy)
- Kiểm tra thông tin người dùng dựa trên ID cố định
- Kiểm tra role dựa trên roleId cố định thay vì roleName

## Giải pháp đã triển khai

### 1. Tạo UserContextService
**File:** `src/app/services/user-context.service.ts`

Service mới để quản lý context của user hiện tại và các helper methods:
- `getCurrentUserId()`: Lấy ID của user hiện tại (fallback về 1 cho mock data)
- `getCurrentUser()`: Lấy user hiện tại
- `getCurrentUserRole()`: Lấy role của user hiện tại (có cache)
- `hasRoleName(roleName)`: Kiểm tra user có role name cụ thể không
- `isSystemAdmin()`: Kiểm tra user có phải System Admin không (dựa trên roleName)
- `isSchoolAdmin()`: Kiểm tra user có phải School Admin không (dựa trên roleName)
- `canEditEmailPassword()`: Kiểm tra user có thể edit email/password không
- `isSystemAdminRole(role)`: Helper method để check role
- `isSchoolAdminRole(role)`: Helper method để check role

**Lợi ích:**
- Tập trung logic kiểm tra user/role vào một service
- Dựa trên roleName thay vì roleId để tương thích với cả mock và real API
- Có cache để tránh load lại role nhiều lần

### 2. Cập nhật AuthService
**File:** `src/app/services/auth.service.ts`

- Thêm method `getCurrentUserId()` để lấy ID của user hiện tại
- Thêm comment cảnh báo về việc sử dụng `isSchoolAdmin()` và `isProviderAdmin()` (chỉ dùng cho quick check)

### 3. Cập nhật Provider Users Component
**File:** `src/app/pages/provider/users/users.ts`

**Thay đổi:**
- ✅ Import `AuthService` và `UserContextService`
- ✅ `getEmptyUser()`: Sử dụng `userContextService.getCurrentUserId()` thay vì hardcode `1`
- ✅ `loadUsers()`: Filter users dựa trên roleName thay vì roleId
- ✅ `saveUser()`: Set `createBy` và `updateBy` từ current user ID
- ✅ `isSchoolAdmin()`: Check dựa trên roleName thay vì roleId === 3
- ✅ `isAdminUser()`: Check dựa trên roleName thay vì roleId === 1 || roleId === 3
- ✅ `openEditModal()`: Check SCHOOL_ADMIN dựa trên roleName

### 4. Cập nhật Provider Roles Component
**File:** `src/app/pages/provider/roles/roles.ts`

**Thay đổi:**
- ✅ Import `UserContextService`
- ✅ `getEmptyRole()`: Sử dụng `userContextService.getCurrentUserId()` thay vì hardcode `1`
- ✅ `loadRoles()`: Filter dựa trên roleName thay vì id !== 1
- ✅ `saveRole()`: Set `createBy` và `updateBy` từ current user ID
- ✅ `get filteredRoles()`: Filter dựa trên roleName thay vì id !== 1
- ✅ `openReassignModal()`: Filter dựa trên roleName

### 5. Cập nhật School Service
**File:** `src/app/services/school.service.ts`

**Thay đổi:**
- ✅ Import `UserContextService`
- ✅ `createSchoolAdmin()`: Sử dụng `userContextService.getCurrentUserId()` thay vì hardcode `1`

### 6. Cập nhật School Users Component
**File:** `src/app/pages/school/users/users.ts`

**Thay đổi:**
- ✅ `loadUsers()`: Filter users dựa trên roleName thay vì roleId !== 3
- ✅ `saveUser()`: Set `createBy` và `updateBy` từ current user ID
- ✅ `get filteredUsers()`: Đã được filter trong `loadUsers()` dựa trên roleName

### 7. Cập nhật School Roles Component
**File:** `src/app/pages/school/roles/roles.ts`

**Thay đổi:**
- ✅ `saveRole()`: Set `createBy` và `updateBy` từ current user ID

## Nguyên tắc thiết kế

### 1. Luôn sử dụng roleName thay vì roleId
**Lý do:** roleId có thể khác nhau giữa mock data và real API, nhưng roleName luôn nhất quán.

**Trước:**
```typescript
if (user.roleId === 3) { // Hardcoded
  // ...
}
```

**Sau:**
```typescript
const role = roles.find(r => r.id === user.roleId);
if (role?.roleName === 'SCHOOL_ADMIN') { // Dựa trên roleName
  // ...
}
```

### 2. Luôn lấy current user ID từ AuthService/UserContextService
**Lý do:** Đảm bảo createBy/updateBy luôn đúng với user đang thao tác.

**Trước:**
```typescript
createBy: 1, // Hardcoded
updateBy: 1
```

**Sau:**
```typescript
const currentUserId = this.userContextService.getCurrentUserId();
createBy: currentUserId,
updateBy: currentUserId
```

### 3. Fallback cho mock data
**Lý do:** Khi không có user (mock data), fallback về 1 để đảm bảo không lỗi.

```typescript
getCurrentUserId(): number {
  const user = this.authService.getCurrentUser();
  return user?.id || 1; // Fallback cho mock data
}
```

## Tương thích với Mock Data và Real API

### Mock Data
- ✅ Vẫn hoạt động bình thường với mock data
- ✅ Fallback về ID = 1 khi không có user
- ✅ Check roleName vẫn hoạt động với mock data

### Real API
- ✅ Sử dụng current user ID từ auth token
- ✅ Check roleName từ API response
- ✅ Không phụ thuộc vào ID cố định

## Checklist kiểm tra

- [x] Tất cả createBy/updateBy đều lấy từ current user
- [x] Tất cả role checks đều dựa trên roleName
- [x] Không còn hardcoded roleId checks
- [x] Tương thích với cả mock data và real API
- [x] Có fallback cho trường hợp không có user

## Lưu ý khi sử dụng

1. **Luôn sử dụng UserContextService** để lấy current user ID và check roles
2. **Không hardcode roleId** trong logic business
3. **Luôn check roleName** thay vì roleId khi cần kiểm tra quyền
4. **Set createBy/updateBy** mỗi khi create/update entity

## Các file đã thay đổi

1. ✅ `src/app/services/user-context.service.ts` (mới)
2. ✅ `src/app/services/auth.service.ts`
3. ✅ `src/app/pages/provider/users/users.ts`
4. ✅ `src/app/pages/provider/roles/roles.ts`
5. ✅ `src/app/services/school.service.ts`
6. ✅ `src/app/pages/school/users/users.ts`
7. ✅ `src/app/pages/school/roles/roles.ts`

## Kết quả

- ✅ Loại bỏ hoàn toàn hardcoded createBy/updateBy
- ✅ Loại bỏ hardcoded roleId checks
- ✅ Tương thích với cả mock data và real API
- ✅ Code dễ maintain và mở rộng hơn
- ✅ Logic tập trung vào UserContextService


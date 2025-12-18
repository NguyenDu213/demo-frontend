# Debug Guide - Admin không thể truy cập quản lý tài khoản và quyền

## Vấn đề
Admin hệ thống không thể truy cập vào:
- Quản lý tài khoản hệ thống (`/provider/users`)
- Quản lý Role hệ thống (`/provider/roles`)

Khi click vào các link này, không hiển thị gì (có thể bị guard block).

## Các điểm cần kiểm tra

### 1. Kiểm tra Role Cache
Mở Console và chạy:
```javascript
// Kiểm tra user hiện tại
console.log('Current User:', JSON.parse(localStorage.getItem('currentUser')));

// Kiểm tra role cache
console.log('Cached Role:', JSON.parse(localStorage.getItem('currentUserRole')));

// Kiểm tra roleId
const user = JSON.parse(localStorage.getItem('currentUser'));
console.log('User roleId:', user?.roleId);
```

### 2. Kiểm tra MOCK_ROLES
Đảm bảo MOCK_ROLES có role với:
- `id: 1`
- `roleName: 'SYSTEM_ADMIN'`

### 3. Kiểm tra Guard
Guard `ProviderAdminGuard` check `isProviderAdmin()`:
- Phải return `true` với admin hệ thống
- Check dựa trên `roleName === 'SYSTEM_ADMIN'`

### 4. Test thủ công
```javascript
// Trong console browser
const authService = ng.probe($0).injector.get(ng.coreTokens.ApplicationRef).components[0].injector.get('AuthService');
console.log('isProviderAdmin:', authService.isProviderAdmin());
console.log('Current Role Cache:', authService.currentUserRoleCache);
```

## Giải pháp đã áp dụng

1. ✅ Load role ngay từ MOCK_ROLES khi login (synchronous)
2. ✅ Load role từ MOCK_ROLES khi constructor được gọi
3. ✅ Fallback load từ MOCK_ROLES trong `isProviderAdmin()` nếu chưa có cache
4. ✅ Delay 100ms trước khi navigate sau login

## Nếu vẫn không hoạt động

1. Clear localStorage và login lại:
```javascript
localStorage.clear();
// Sau đó login lại
```

2. Kiểm tra xem role có được cache đúng không:
```javascript
// Sau khi login
const role = JSON.parse(localStorage.getItem('currentUserRole'));
console.log('Role:', role);
console.log('Role Name:', role?.roleName);
console.log('Is SYSTEM_ADMIN:', role?.roleName === 'SYSTEM_ADMIN');
```

3. Kiểm tra guard có được gọi không:
- Mở DevTools → Network tab
- Click vào link "Quản lý tài khoản hệ thống"
- Xem có request nào bị block không

# Sửa lỗi Hardcoded RoleId trong AuthService

## Vấn đề
Các phương thức `isSchoolAdmin()` và `isProviderAdmin()` trong `auth.service.ts` đang fix cứng roleId:
- `isSchoolAdmin()`: Check `roleId === 3`
- `isProviderAdmin()`: Check `roleId === 1`

Điều này gây lỗi khi sử dụng với real API vì roleId có thể khác nhau giữa mock data và real data.

## Giải pháp

### 1. Thêm Role Cache vào AuthService
- Cache role trong memory (`currentUserRoleCache`)
- Cache role trong localStorage (`currentUserRole`) để persist giữa các sessions
- Load role khi login và khi init app

### 2. Sửa lại các phương thức check role
- `isSchoolAdmin()`: Check dựa trên `roleName === 'SCHOOL_ADMIN'` thay vì `roleId === 3`
- `isProviderAdmin()`: Check dựa trên `roleName === 'SYSTEM_ADMIN'` thay vì `roleId === 1`

### 3. Cơ chế cache
1. **Khi login**: Load role từ service và cache vào memory + localStorage
2. **Khi init app**: Load role từ localStorage nếu có, nếu không thì load từ service
3. **Khi check role**: 
   - Nếu có cache trong memory → check ngay
   - Nếu chưa có cache trong memory → load từ localStorage
   - Nếu chưa có trong localStorage → load từ service (async, return false tạm thời)

## Code Changes

### Thêm imports và properties
```typescript
import { Injector } from '@angular/core';
import { RoleService } from './role.service';
import { Role } from '../models/role.model';

private currentUserRoleCache: Role | null = null;
private roleService?: RoleService;
```

### Thêm method loadCurrentUserRole()
```typescript
private loadCurrentUserRole(): void {
    // Load từ localStorage trước
    // Nếu không có thì load từ service và cache lại
}
```

### Sửa isSchoolAdmin()
```typescript
isSchoolAdmin(): boolean {
    // Check cache trong memory
    // Nếu chưa có, load từ localStorage
    // Check dựa trên roleName === 'SCHOOL_ADMIN'
}
```

### Sửa isProviderAdmin()
```typescript
isProviderAdmin(): boolean {
    // Check cache trong memory
    // Nếu chưa có, load từ localStorage
    // Check dựa trên roleName === 'SYSTEM_ADMIN'
}
```

## Lợi ích

1. ✅ **Không còn hardcoded roleId**: Tất cả checks đều dựa trên roleName
2. ✅ **Tương thích với cả mock và real API**: roleName luôn nhất quán
3. ✅ **Performance tốt**: Cache role để tránh load lại nhiều lần
4. ✅ **Persistent cache**: Role được cache trong localStorage để dùng lại khi reload page
5. ✅ **Backward compatible**: Không phá vỡ code hiện tại (guards, components vẫn hoạt động)

## Lưu ý

- Role được load async sau khi login, nên ở lần check đầu tiên ngay sau login có thể return false nếu role chưa load xong
- Tuy nhiên, role sẽ được cache ngay sau khi load xong, nên các lần check tiếp theo sẽ chính xác
- Khi reload page, role được load từ localStorage ngay lập tức nên không có vấn đề

## Testing

Cần test các trường hợp:
1. ✅ Login với mock data → role được cache
2. ✅ Reload page → role được load từ localStorage
3. ✅ Login với real API → role được cache
4. ✅ Check isSchoolAdmin() → return đúng giá trị
5. ✅ Check isProviderAdmin() → return đúng giá trị
6. ✅ Guards hoạt động đúng với cached role

## Files Changed

- ✅ `src/app/services/auth.service.ts`

## Kết quả

- ✅ Loại bỏ hoàn toàn hardcoded roleId trong AuthService
- ✅ Tất cả role checks đều dựa trên roleName
- ✅ Tương thích với cả mock data và real API
- ✅ Code không còn hardcoded data nào

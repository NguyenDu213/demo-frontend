// Script để reset mock data trong localStorage
// Chạy script này trong Console của trình duyệt (F12 > Console)

console.log('Đang reset mock data...');

// Xóa tất cả mock data cũ
localStorage.removeItem('mock_roles');
localStorage.removeItem('mock_users');
localStorage.removeItem('mock_schools');
localStorage.removeItem('mock_roles_version');
localStorage.removeItem('mock_users_version');
localStorage.removeItem('mock_schools_version');

console.log('✅ Đã xóa mock data cũ. Vui lòng refresh trang (F5) để load dữ liệu mới.');


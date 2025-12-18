import { School } from '../models/school.model';
import { User, Gender, Scope } from '../models/user.model';
import { Role, TypeRole } from '../models/role.model';

// Mock Schools Data
export const MOCK_SCHOOLS: School[] = [
    {
        id: 1,
        name: 'Trường Tiểu học Nguyễn Du',
        code: 'TH001',
        email: 'thnguyendu@edu.vn',
        hotline: '0241234567',
        address: '123 Đường Nguyễn Du, Quận Hoàn Kiếm, Hà Nội',
        principalName: 'Nguyễn Văn An',
        createdAt: '2024-01-15T08:00:00',
        updatedAt: '2024-01-15T08:00:00'
    },
    {
        id: 2,
        name: 'Trường THCS Lê Lợi',
        code: 'THCS002',
        email: 'thcsleloi@edu.vn',
        hotline: '0242345678',
        address: '456 Đường Lê Lợi, Quận Ba Đình, Hà Nội',
        principalName: 'Trần Thị Bình',
        createdAt: '2024-01-20T08:00:00',
        updatedAt: '2024-01-20T08:00:00'
    },
    {
        id: 3,
        name: 'Trường THPT Chu Văn An',
        code: 'THPT003',
        email: 'thptchuvanan@edu.vn',
        hotline: '0243456789',
        address: '789 Đường Chu Văn An, Quận Đống Đa, Hà Nội',
        principalName: 'Lê Văn Cường',
        createdAt: '2024-02-01T08:00:00',
        updatedAt: '2024-02-01T08:00:00'
    }
];

// Mock Roles Data
export const MOCK_ROLES: Role[] = [
    // Provider Roles
    {
        id: 1,
        roleName: 'System Admin',
        typeRole: TypeRole.PROVIDER,
        description: 'Quản trị viên hệ thống, có toàn quyền quản lý',
        schoolId: null,
        createdAt: '2024-01-01T08:00:00',
        updatedAt: '2024-01-01T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 2,
        roleName: 'System Staff',
        typeRole: TypeRole.PROVIDER,
        description: 'Nhân viên hệ thống, quản lý các trường học',
        schoolId: null,
        createdAt: '2024-01-01T08:00:00',
        updatedAt: '2024-01-01T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    // School Roles
    {
        id: 3,
        roleName: 'School Admin',
        typeRole: TypeRole.SCHOOL,
        description: 'Quản trị viên trường học',
        schoolId: null,
        createdAt: '2024-01-01T08:00:00',
        updatedAt: '2024-01-01T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 4,
        roleName: 'Teacher',
        typeRole: TypeRole.SCHOOL,
        description: 'Giáo viên',
        schoolId: 1,
        createdAt: '2024-01-15T08:00:00',
        updatedAt: '2024-01-15T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 5,
        roleName: 'Student',
        typeRole: TypeRole.SCHOOL,
        description: 'Học sinh',
        schoolId: 1,
        createdAt: '2024-01-15T08:00:00',
        updatedAt: '2024-01-15T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 6,
        roleName: 'Teacher',
        typeRole: TypeRole.SCHOOL,
        description: 'Giáo viên',
        schoolId: 2,
        createdAt: '2024-01-20T08:00:00',
        updatedAt: '2024-01-20T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 7,
        roleName: 'Student',
        typeRole: TypeRole.SCHOOL,
        description: 'Học sinh',
        schoolId: 2,
        createdAt: '2024-01-20T08:00:00',
        updatedAt: '2024-01-20T08:00:00',
        createBy: 1,
        updateBy: 1
    }
];

// Mock Users Data
export const MOCK_USERS: User[] = [
    // Provider Users
    {
        id: 1,
        fullName: 'Admin Hệ Thống',
        gender: Gender.MALE,
        birthYear: '1980-05-15',
        address: '10 Đường Trần Phú, Hà Nội',
        phoneNumber: '0912345678',
        email: 'admin@system.com',
        password: 'admin123',
        isActive: true,
        scope: Scope.PROVIDER,
        schoolId: null,
        roleId: 1,
        createdAt: '2024-01-01T08:00:00',
        updatedAt: '2024-01-01T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 2,
        fullName: 'Nhân Viên Hệ Thống',
        gender: Gender.FEMALE,
        birthYear: '1990-08-20',
        address: '20 Đường Lý Thường Kiệt, Hà Nội',
        phoneNumber: '0923456789',
        email: 'staff@system.com',
        password: 'staff123',
        isActive: true,
        scope: Scope.PROVIDER,
        schoolId: null,
        roleId: 2,
        createdAt: '2024-01-05T08:00:00',
        updatedAt: '2024-01-05T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    // School 1 Users
    {
        id: 3,
        fullName: 'Nguyễn Văn An',
        gender: Gender.MALE,
        birthYear: '1975-03-10',
        address: '123 Đường Nguyễn Du, Hà Nội',
        phoneNumber: '0934567890',
        email: 'an.nguyen@school1.edu.vn',
        password: 'admin123',
        isActive: true,
        scope: Scope.SCHOOL,
        schoolId: 1,
        roleId: 3,
        createdAt: '2024-01-15T08:00:00',
        updatedAt: '2024-01-15T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 4,
        fullName: 'Trần Thị Lan',
        gender: Gender.FEMALE,
        birthYear: '1985-07-25',
        address: '456 Đường Nguyễn Du, Hà Nội',
        phoneNumber: '0945678901',
        email: 'lan.tran@school1.edu.vn',
        password: 'teacher123',
        isActive: true,
        scope: Scope.SCHOOL,
        schoolId: 1,
        roleId: 4,
        createdAt: '2024-01-16T08:00:00',
        updatedAt: '2024-01-16T08:00:00',
        createBy: 3,
        updateBy: 3
    },
    {
        id: 5,
        fullName: 'Lê Văn Hùng',
        gender: Gender.MALE,
        birthYear: '2010-09-15',
        address: '789 Đường Nguyễn Du, Hà Nội',
        phoneNumber: '0956789012',
        email: 'hung.le@school1.edu.vn',
        password: 'student123',
        isActive: true,
        scope: Scope.SCHOOL,
        schoolId: 1,
        roleId: 5,
        createdAt: '2024-01-17T08:00:00',
        updatedAt: '2024-01-17T08:00:00',
        createBy: 3,
        updateBy: 3
    },
    // School 2 Users
    {
        id: 6,
        fullName: 'Trần Thị Bình',
        gender: Gender.FEMALE,
        birthYear: '1978-11-30',
        address: '123 Đường Lê Lợi, Hà Nội',
        phoneNumber: '0967890123',
        email: 'binh.tran@school2.edu.vn',
        password: 'admin123',
        isActive: true,
        scope: Scope.SCHOOL,
        schoolId: 2,
        roleId: 3,
        createdAt: '2024-01-20T08:00:00',
        updatedAt: '2024-01-20T08:00:00',
        createBy: 1,
        updateBy: 1
    },
    {
        id: 7,
        fullName: 'Phạm Văn Đức',
        gender: Gender.MALE,
        birthYear: '1988-04-12',
        address: '456 Đường Lê Lợi, Hà Nội',
        phoneNumber: '0978901234',
        email: 'duc.pham@school2.edu.vn',
        password: 'teacher123',
        isActive: true,
        scope: Scope.SCHOOL,
        schoolId: 2,
        roleId: 6,
        createdAt: '2024-01-21T08:00:00',
        updatedAt: '2024-01-21T08:00:00',
        createBy: 6,
        updateBy: 6
    },
    {
        id: 8,
        fullName: 'Hoàng Thị Mai',
        gender: Gender.FEMALE,
        birthYear: '2011-02-28',
        address: '789 Đường Lê Lợi, Hà Nội',
        phoneNumber: '0989012345',
        email: 'mai.hoang@school2.edu.vn',
        password: 'student123',
        isActive: true,
        scope: Scope.SCHOOL,
        schoolId: 2,
        roleId: 7,
        createdAt: '2024-01-22T08:00:00',
        updatedAt: '2024-01-22T08:00:00',
        createBy: 6,
        updateBy: 6
    }
];

// Mock Login Credentials (for reference only - login now uses MOCK_USERS directly)
export const MOCK_LOGIN_CREDENTIALS = {
    provider: [
        { email: 'admin@system.com', password: 'admin123', scope: 'Provider' },
        { email: 'staff@system.com', password: 'staff123', scope: 'Provider' }
    ],
    school: [
        { email: 'an.nguyen@school1.edu.vn', password: 'admin123', scope: 'School', schoolId: 1 },
        { email: 'binh.tran@school2.edu.vn', password: 'admin123', scope: 'School', schoolId: 2 },
        { email: 'lan.tran@school1.edu.vn', password: ' ', scope: 'School', schoolId: 1 },
        { email: 'duc.pham@school2.edu.vn', password: 'teacher123', scope: 'School', schoolId: 2 },
        { email: 'hung.le@school1.edu.vn', password: 'student123', scope: 'School', schoolId: 1 },
        { email: 'mai.hoang@school2.edu.vn', password: 'student123', scope: 'School', schoolId: 2 }
    ]
};


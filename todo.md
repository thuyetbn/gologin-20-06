# Todo List: Quản lý Profile Chrome (Electron + Next.js)

Dưới đây là danh sách công việc chi tiết để xây dựng ứng dụng.

## Giai đoạn 1: Cài đặt và Cấu trúc giao diện cơ bản

- [x] **Cài đặt shadcn/ui:**
    - [x] Cài đặt các gói phụ thuộc cần thiết.
    - [x] Cấu hình `tailwind.config.js` và `globals.css` theo tài liệu của shadcn.
    - [x] Thêm các component cơ bản đầu tiên (ví dụ: `Button`, `Card`) để kiểm tra.

- [x] **Xây dựng Layout chính:**
    - [x] Tạo component `Sidebar` chứa các link điều hướng.
    - [x] Thêm các icon cho các mục: Profiles, Groups, Proxy, Settings.
    - [x] Tạo cấu trúc layout chính (`_app.tsx` hoặc component `Layout`) với Sidebar cố định bên trái và vùng nội dung bên phải.

- [x] **Tạo các trang (Pages):**
    - [x] Tạo các file trang trống cho từng mục: `profiles.tsx`, `groups.tsx`, `proxy.tsx`, `settings.tsx`.
    - [x] Cấu hình routing để điều hướng giữa các trang.

## Giai đoạn 2: Thiết lập Database (SQLite)

- [x] **Cập nhật Model Sequelize:**
    - [x] Mở file `backend/database/index.ts`.
    - [x] Xóa model `User` hiện tại.
    - [x] Định nghĩa model `Profile` dựa trên schema đã cung cấp.
    - [x] Định nghĩa model `Group` dựa trên schema đã cung cấp.
- [x] **Thiết lập quan hệ (Associations):**
    - [x] Định nghĩa quan hệ một-nhiều: Một `Group` có thể có nhiều `Profile`.

## Giai đoạn 3: Chức năng Cài đặt (Settings)

- [x] **Thiết kế giao diện trang Settings:**
    - [x] Tạo form với các trường input để nhập đường dẫn đến file SQLite và thư mục Profiles.
    - [x] Thêm nút "Lưu" và nút "Chọn thư mục/file" (sử dụng API của Electron để mở dialog).

- [x] **Lưu/Tải cấu hình:**
    - [x] Viết hàm trong backend (Electron) để lưu các đường dẫn vào một file JSON (ví dụ: `settings.json`).
    - [x] Viết hàm để đọc cấu hình từ file JSON khi ứng dụng khởi động.
    - [x] Tạo IPC handlers (`save-settings`, `load-settings`) để giao tiếp giữa frontend và backend.
    - [x] Kết nối giao diện Settings với các IPC handlers.
    - [x] **Quan trọng:** Sửa đổi logic khởi tạo `Sequelize` trong `backend/database/index.ts` để nó sử dụng đường dẫn file SQLite từ `settings.json` thay vì hardcode.

## Giai đoạn 4: Quản lý Nhóm (Groups)

- [x] **Thiết kế giao diện trang Groups:**
    - [x] Hiển thị danh sách các Group đang có dưới dạng bảng (`Table` component của shadcn).
    - [x] Thêm các nút: "Tạo Group mới", "Sửa", "Xóa".
    - [x] Tạo form/dialog để thêm/sửa Group.

- [x] **Xây dựng API Backend (IPC Handlers):**
    - [x] `create-group`: Tạo group mới.
    - [x] `get-groups`: Lấy danh sách tất cả group.
    - [x] `update-group`: Cập nhật thông tin group.
    - [x] `delete-group`: Xóa group.

- [x] **Tích hợp Frontend và Backend:**
    - [x] Gọi các IPC handler từ giao diện để thực hiện CRUD.
    - [x] Cập nhật lại danh sách group trên giao diện sau mỗi thao tác.

## Giai đoạn 5: Quản lý Proxy

- [x] **Thiết kế giao diện trang Proxy:**
    - [x] Hiển thị danh sách proxy dưới dạng bảng.
    - [x] Các cột: `Loại` (HTTP/SOCKS5), `Host`, `Port`, `Username`, `Password`.
    - [x] Thêm các nút CRUD (Tạo, Sửa, Xóa).
    - [x] Tạo form/dialog để nhập thông tin proxy.

- [x] **Lưu/Tải dữ liệu Proxy:**
    - [x] Tương tự như Settings, tạo các IPC handlers (`save-proxies`, `get-proxies`) để đọc/ghi dữ liệu proxy vào một file JSON riêng (ví dụ: `proxies.json`).
    - [x] Kết nối giao diện với các handlers này.

## Giai đoạn 6: Quản lý Profile

- [x] **Thiết kế giao diện trang Profiles:**
    - [x] Thêm ô `Input` để tìm kiếm (Search) theo tên profile.
    - [x] Thêm bộ lọc (Filter) bằng `Dropdown`/`Select` để lọc profile theo `Group`.
    - [x] Hiển thị tổng số lượng profile (`xx items`) phía trên hoặc dưới bảng.
    - [x] Hiển thị danh sách profiles dưới dạng bảng.
    - [x] Các cột chính: `Tên`, `Group`, `Ngày tạo`, `Lần chạy cuối`.
    - [x] Thêm các nút: "Tạo Profile", "Sửa", "Xóa", và quan trọng nhất là "Chạy Profile".
    - [x] Tạo form/dialog để thêm/sửa profile.

- [x] **Xây dựng API Backend (IPC Handlers):**
    - [x] Sửa đổi IPC handler `get-profiles` để có thể nhận tham số tìm kiếm và lọc.
    - [x] Tạo các IPC handlers cho CRUD profiles (`create-profile`, `get-profiles`, `update-profile`, `delete-profile`).
    - [x] **Logic quan trọng:**
        - [x] Khi tạo profile, backend cần tự động tạo một thư mục profile mới của Chrome (nếu cần) hoặc chỉ lưu đường dẫn.
        - [x] Khi chạy profile, backend cần thực thi một lệnh để mở Chrome với các tham số.

- [x] **Tích hợp Frontend và Backend:**
    - [x] Kết nối giao diện CRUD với các IPC handlers.
    - [x] Khi nhấn nút "Chạy Profile", gửi yêu cầu đến backend để thực thi.

## Giai đoạn 7: Hoàn thiện và Tối ưu

- [x] **Thông báo và xử lý lỗi:**
    - [x] Sử dụng component `Toast` hoặc `Alert` của shadcn để hiển thị thông báo thành công/thất bại.
    - [x] Bổ sung logic xử lý lỗi ở cả frontend và backend.

- [x] **Tối ưu hóa:**
    - [x] Rà soát lại code.
    - [x] Tối ưu hóa các câu truy vấn database nếu cần.

- [ ] **Viết tài liệu:**
    - [ ] Cập nhật file `README.md` với hướng dẫn cài đặt và sử dụng các chức năng mới. 
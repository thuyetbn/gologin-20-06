# Hướng dẫn sử dụng Workflow Editor

## Tổng quan

Workflow Editor là một công cụ trực quan cho phép bạn tạo và thực thi các luồng công việc tự động hóa trình duyệt bằng cách kéo-thả các node hành động.

## Tính năng chính

### 1. **Giao diện kéo-thả trực quan**
- Canvas chính để thiết kế workflow
- Palette bên trái chứa các node hành động
- Panel cấu hình bên phải để thiết lập properties

### 2. **Các loại hành động hỗ trợ**

#### **Điều hướng**
- **🌐 Đi đến URL**: Điều hướng trình duyệt đến một URL cụ thể
  - Cấu hình: URL, Timeout

#### **Tương tác**
- **👆 Click**: Click vào một element trên trang
  - Cấu hình: CSS Selector, Timeout
- **✏️ Điền Input**: Điền text vào input field
  - Cấu hình: CSS Selector, Giá trị, Timeout

#### **Chờ đợi**
- **⏳ Chờ Element**: Chờ cho đến khi element xuất hiện
  - Cấu hình: CSS Selector, Timeout
- **⏱️ Chờ**: Tạm dừng thực thi trong khoảng thời gian
  - Cấu hình: Thời gian chờ (ms)

#### **Trích xuất**
- **📷 Chụp màn hình**: Chụp screenshot của trang/element
  - Cấu hình: Đường dẫn file, CSS Selector (tùy chọn)
- **📝 Trích xuất Text**: Lấy text từ element
  - Cấu hình: CSS Selector, Thuộc tính, Timeout

## Cách sử dụng

### Bước 1: Tạo Workflow
1. Mở ứng dụng và điều hướng đến **Workflow Editor**
2. Nhập tên cho workflow trong ô "Tên workflow"
3. Thêm mô tả ngắn gọn trong phần dưới

### Bước 2: Thêm các hành động
1. Từ **Palette Hành động** bên trái, click vào hành động muốn thêm
2. Node sẽ được thêm vào canvas ở vị trí ngẫu nhiên
3. Kéo-thả node để sắp xếp vị trí phù hợp

### Bước 3: Cấu hình hành động
1. Click vào node để chọn
2. Panel bên phải sẽ hiển thị form cấu hình
3. Điền các thông tin cần thiết:
   - CSS Selector (ví dụ: `#button`, `.class`, `[data-id="value"]`)
   - URL, giá trị, timeout, v.v.
4. Các trường bắt buộc sẽ có dấu `*` màu đỏ

### Bước 4: Kết nối các hành động
1. Kéo từ điểm output (dưới) của node này
2. Thả vào điểm input (trên) của node tiếp theo
3. Tạo chuỗi thực thi tuần tự

### Bước 5: Lưu và thực thi
1. Click **Lưu** để lưu workflow
2. Click **Chạy Workflow** để thực thi
3. Theo dõi tiến trình trong console

## Ví dụ Workflow đơn giản

### Workflow đăng nhập website:
1. **🌐 Đi đến URL**: `https://example.com/login`
2. **✏️ Điền Input**: Selector `#username`, Value `admin`
3. **✏️ Điền Input**: Selector `#password`, Value `123456`
4. **👆 Click**: Selector `#login-button`
5. **⏳ Chờ Element**: Selector `.dashboard`
6. **📷 Chụp màn hình**: Path `login-success.png`

## JSON Output

Workflow sẽ tạo ra JSON như sau:
```json
[
  { "action": "goto", "url": "https://example.com/login" },
  { "action": "fill", "selector": "#username", "value": "admin" },
  { "action": "fill", "selector": "#password", "value": "123456" },
  { "action": "click", "selector": "#login-button" },
  { "action": "waitForSelector", "selector": ".dashboard" },
  { "action": "screenshot", "path": "login-success.png" }
]
```

## Tips sử dụng

### CSS Selectors hữu ích:
- ID: `#elementId`
- Class: `.className`
- Attribute: `[name="fieldName"]`, `[data-id="value"]`
- Hierarchy: `.parent .child`, `.form input[type="submit"]`
- Nth-child: `.list li:nth-child(2)`

### Timeout suggestions:
- Navigation: 30000ms (30s)
- Click/Fill: 5000ms (5s)
- Wait for element: 10000ms (10s)
- Wait delay: 1000ms (1s)

### Best practices:
1. **Bắt đầu với "Đi đến URL"** để thiết lập trang web
2. **Sử dụng "Chờ Element"** sau các hành động có thể gây loading
3. **Chụp screenshot** để verify kết quả
4. **Test từng bước** trước khi chạy toàn bộ workflow
5. **Sử dụng selector cụ thể** để tránh nhầm lẫn element

## Khắc phục sự cố

### Node báo lỗi cấu hình:
- Kiểm tra các trường bắt buộc đã điền chưa
- Verify CSS selector có đúng format
- Đảm bảo timeout hợp lý (>= 1000ms)

### Workflow không chạy:
- Kiểm tra các node đã được kết nối đúng
- Đảm bảo có ít nhất 1 node trong workflow
- Verify tên workflow đã được nhập

### Lỗi thực thi:
- Kiểm tra URL có thể truy cập
- Verify CSS selector tồn tại trên trang
- Tăng timeout nếu trang load chậm

## Tính năng sắp tới

- ✅ Kết nối với Chrome từ xa qua `--remote-debugging-port`
- ✅ Hiển thị tiến trình thực thi real-time
- ✅ Export/Import workflow JSON
- ✅ Workflow templates và ví dụ
- ✅ Advanced selectors và XPath support
- ✅ Conditional logic và branching
- ✅ Variables và data passing between steps 
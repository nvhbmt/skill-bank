-- CV chứa dữ liệu cá nhân (số điện thoại, kinh nghiệm). Bucket cv-files trước
-- đây để public: ai đoán được đường dẫn <uuid>/<epoch>.<ext> là tải được mà
-- không cần đăng nhập. Chuyển sang riêng tư — file chỉ truy cập được qua signed
-- URL do server sinh, có hạn dùng.
update storage.buckets set public = false where id = 'cv-files';

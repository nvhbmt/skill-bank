-- Dữ liệu mock cho môi trường dev local.
-- Mọi tài khoản dùng chung mật khẩu: Password123

-- ---------- Tài khoản ----------
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
)
values
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@skillbank.vn',     crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Quản trị viên"}'),
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'hoang@skillbank.vn',     crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nguyễn Việt Hoàng"}'),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'mai@skillbank.vn',       crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Trần Thị Mai"}'),
    ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'duc@skillbank.vn',       crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lê Minh Đức"}'),
    ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'lan@skillbank.vn',       crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Phạm Ngọc Lan"}')
on conflict (id) do nothing;

-- GoTrue đọc các cột token dạng text và sẽ báo "Database error querying schema"
-- nếu chúng là NULL, nên phải ép về chuỗi rỗng.
update auth.users set
    confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id, id, id::text,
       format('{"sub":"%s","email":"%s","email_verified":true}', id, email)::jsonb,
       'email', now(), now(), now()
from auth.users
on conflict do nothing;

-- ---------- Hồ sơ người dùng ----------
insert into public.user_info (user_id, username, email, full_name, avatar_url, role) values
    ('11111111-1111-1111-1111-111111111111', 'admin',    'admin@skillbank.vn', 'Quản trị viên',      '/assets/images/avatar-default-icon.png', 'admin'),
    ('22222222-2222-2222-2222-222222222222', 'viethoang','hoang@skillbank.vn', 'Nguyễn Việt Hoàng',  '/assets/images/avatar-default-icon.png', 'user'),
    ('33333333-3333-3333-3333-333333333333', 'thimai',   'mai@skillbank.vn',   'Trần Thị Mai',       '/assets/images/avatar-default-icon.png', 'user'),
    ('44444444-4444-4444-4444-444444444444', 'minhduc',  'duc@skillbank.vn',   'Lê Minh Đức',        '/assets/images/avatar-default-icon.png', 'user'),
    ('55555555-5555-5555-5555-555555555555', 'ngoclan',  'lan@skillbank.vn',   'Phạm Ngọc Lan',      '/assets/images/avatar-default-icon.png', 'user')
on conflict (user_id) do nothing;

insert into public.user_profiles (user_id, bio, phone, address, portfolio_url, experiences, certifications, interests) values
    ('22222222-2222-2222-2222-222222222222', 'Lập trình viên full-stack, thích xây sản phẩm giáo dục.', '0901234567', 'Hà Nội', 'https://github.com/nvhbmt', '3 năm làm web với React và Node.js', 'AWS Cloud Practitioner', 'Web, EdTech'),
    ('33333333-3333-3333-3333-333333333333', 'Thiết kế UI/UX, tập trung vào trải nghiệm người dùng.',   '0902345678', 'Đà Nẵng', null, '2 năm thiết kế sản phẩm số', 'Google UX Design', 'Thiết kế, Nghiên cứu người dùng'),
    ('44444444-4444-4444-4444-444444444444', 'Sinh viên năm cuối ngành Khoa học máy tính.',             '0903456789', 'TP Hồ Chí Minh', null, 'Thực tập backend 6 tháng', 'TOEIC 800', 'Backend, Dữ liệu'),
    ('55555555-5555-5555-5555-555555555555', 'Quản lý dự án, từng dẫn dắt nhiều nhóm nhỏ.',             '0904567890', 'Hà Nội', null, '4 năm quản lý dự án phần mềm', 'PMP', 'Quản lý, Agile');

insert into public.user_reputation (user_id, score) values
    ('22222222-2222-2222-2222-222222222222', 87),
    ('33333333-3333-3333-3333-333333333333', 92),
    ('44444444-4444-4444-4444-444444444444', 61),
    ('55555555-5555-5555-5555-555555555555', 78);

-- ---------- Kỹ năng ----------
insert into public.skills (name, category, description) values
    ('React',      'Frontend', 'Thư viện xây dựng giao diện'),
    ('TypeScript', 'Ngôn ngữ', 'JavaScript có kiểu tĩnh'),
    ('Node.js',    'Backend',  'Nền tảng chạy JavaScript phía máy chủ'),
    ('Figma',      'Thiết kế', 'Công cụ thiết kế giao diện'),
    ('PostgreSQL', 'Cơ sở dữ liệu', 'Hệ quản trị cơ sở dữ liệu quan hệ'),
    ('Astro',      'Frontend', 'Framework web hướng nội dung'),
    ('Python',     'Ngôn ngữ', 'Ngôn ngữ đa dụng'),
    ('Quản lý dự án', 'Kỹ năng mềm', 'Lập kế hoạch và điều phối nhóm');

insert into public.user_skills (user_id, skill_id, level, verified) values
    ('22222222-2222-2222-2222-222222222222', 1, 'Thành thạo', true),
    ('22222222-2222-2222-2222-222222222222', 2, 'Thành thạo', true),
    ('22222222-2222-2222-2222-222222222222', 3, 'Khá', false),
    ('33333333-3333-3333-3333-333333333333', 4, 'Thành thạo', true),
    ('44444444-4444-4444-4444-444444444444', 7, 'Khá', false),
    ('55555555-5555-5555-5555-555555555555', 8, 'Thành thạo', true);

-- ---------- Dự án ----------
insert into public.projects (id, title, description, cover_image_url, project_type, location, start_date, status, owner_id, created_at) values
    (1, 'Nền tảng luyện thi trực tuyến', 'Xây dựng hệ thống thi thử trắc nghiệm cho học sinh THPT, có chấm điểm tự động và thống kê kết quả.', '/assets/images/defaul-project-background.jpg', 'Giáo dục', 'Hà Nội', current_date + 7,  'approved', '22222222-2222-2222-2222-222222222222', now() - interval '10 days'),
    (2, 'Ứng dụng quản lý chi tiêu',     'App di động giúp người dùng theo dõi thu chi hằng ngày và lập ngân sách theo tháng.',              '/assets/images/defaul-project-background.jpg', 'Tài chính', 'Đà Nẵng', current_date + 14, 'approved', '33333333-3333-3333-3333-333333333333', now() - interval '7 days'),
    (3, 'Website giới thiệu làng nghề',  'Trang web quảng bá các làng nghề truyền thống Việt Nam, hỗ trợ song ngữ Việt - Anh.',                '/assets/images/defaul-project-background.jpg', 'Văn hoá', 'Huế', current_date + 21, 'approved', '55555555-5555-5555-5555-555555555555', now() - interval '4 days'),
    (4, 'Hệ thống đặt lịch phòng khám',  'Cho phép bệnh nhân đặt lịch khám online và nhắc lịch qua email.',                                    '/assets/images/defaul-project-background.jpg', 'Y tế', 'TP Hồ Chí Minh', current_date + 30, 'pending',  '22222222-2222-2222-2222-222222222222', now() - interval '2 days'),
    (5, 'Chatbot tư vấn tuyển sinh',     'Trợ lý ảo trả lời câu hỏi tuyển sinh cho các trường đại học.',                                       '/assets/images/defaul-project-background.jpg', 'Giáo dục', 'Hà Nội', current_date + 45, 'pending',  '44444444-4444-4444-4444-444444444444', now() - interval '1 day');
select setval('public.projects_id_seq', 5);

insert into public.project_skills (project_id, skill_id, description) values
    (1, 1, 'Dựng giao diện làm bài thi'),
    (1, 2, 'Toàn bộ mã nguồn dùng TypeScript'),
    (1, 5, 'Thiết kế bảng câu hỏi và kết quả'),
    (2, 1, 'Giao diện ứng dụng'),
    (2, 4, 'Thiết kế màn hình'),
    (3, 6, 'Trang tĩnh tối ưu SEO'),
    (3, 4, 'Bộ nhận diện hình ảnh'),
    (4, 3, 'API đặt lịch'),
    (5, 7, 'Xử lý ngôn ngữ tự nhiên');

insert into public.project_milestones (project_id, title, description, order_index, due_date) values
    (1, 'Chốt yêu cầu và wireframe', 'Thống nhất phạm vi tính năng', 1, current_date + 14),
    (1, 'Dựng ngân hàng câu hỏi',    'Nhập liệu và phân loại câu hỏi', 2, current_date + 28),
    (1, 'Chạy thử với 1 lớp học',    'Thu thập phản hồi thực tế', 3, current_date + 45),
    (2, 'Thiết kế giao diện',        null, 1, current_date + 20),
    (2, 'Hoàn thiện bản beta',       null, 2, current_date + 40),
    (3, 'Thu thập nội dung làng nghề', null, 1, current_date + 25);

insert into public.project_members (project_id, user_id, role, joined_at) values
    (1, '22222222-2222-2222-2222-222222222222', 'owner',       now() - interval '10 days'),
    (1, '33333333-3333-3333-3333-333333333333', 'collaborator', now() - interval '6 days'),
    (1, '44444444-4444-4444-4444-444444444444', 'collaborator', now() - interval '3 days'),
    (2, '33333333-3333-3333-3333-333333333333', 'owner',       now() - interval '7 days'),
    (2, '22222222-2222-2222-2222-222222222222', 'collaborator', now() - interval '2 days'),
    (3, '55555555-5555-5555-5555-555555555555', 'owner',       now() - interval '4 days'),
    (4, '22222222-2222-2222-2222-222222222222', 'owner',       now() - interval '2 days'),
    (5, '44444444-4444-4444-4444-444444444444', 'owner',       now() - interval '1 day');

insert into public.applications (project_id, applicant_id, cover_letter, status, applied_at) values
    (1, '55555555-5555-5555-5555-555555555555', 'Mình có 4 năm quản lý dự án, rất muốn tham gia điều phối nhóm.', 'pending',  now() - interval '2 days'),
    (2, '44444444-4444-4444-4444-444444444444', 'Em đang học React và muốn thực chiến một sản phẩm thật.',        'pending',  now() - interval '1 day'),
    (3, '22222222-2222-2222-2222-222222222222', 'Mình từng làm site song ngữ, có thể hỗ trợ phần kỹ thuật.',      'approved', now() - interval '3 days'),
    (1, '44444444-4444-4444-4444-444444444444', 'Em muốn tham gia phần backend chấm điểm.',                       'approved', now() - interval '4 days');

insert into public.notifications (user_id, title, message, type, is_read, created_at) values
    ('22222222-2222-2222-2222-222222222222', 'Đơn ứng tuyển mới', '{"applicantName":"Phạm Ngọc Lan","projectTitle":"Nền tảng luyện thi trực tuyến","projectId":1}', 'application_received', false, now() - interval '2 days'),
    ('22222222-2222-2222-2222-222222222222', 'Dự án được duyệt',  '{"projectTitle":"Nền tảng luyện thi trực tuyến","projectId":1}',                                'project_approved',     true,  now() - interval '9 days'),
    ('33333333-3333-3333-3333-333333333333', 'Đơn ứng tuyển mới', '{"applicantName":"Lê Minh Đức","projectTitle":"Ứng dụng quản lý chi tiêu","projectId":2}',       'application_received', false, now() - interval '1 day'),
    ('44444444-4444-4444-4444-444444444444', 'Đơn được chấp nhận','{"projectTitle":"Nền tảng luyện thi trực tuyến","projectId":1}',                                'application_approved', false, now() - interval '3 days');

insert into public.reviews (project_id, reviewer_id, reviewee_id, rating, comment) values
    (1, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 5, 'Phối hợp rất tốt, phản hồi nhanh.'),
    (1, '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 4, 'Yêu cầu rõ ràng, dễ làm việc.'),
    (3, '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 5, 'Quản lý tiến độ chặt chẽ.');

-- ---------- Bàn giao dự án ----------
insert into public.project_handovers (project_id, member_id, notes, status, submitted_at) values
    (1, '33333333-3333-3333-3333-333333333333', 'Đã hoàn thiện toàn bộ màn hình làm bài thi và trang kết quả. File thiết kế nằm trong Figma, link ở phần mô tả dự án.', 'pending',  now() - interval '1 day'),
    (1, '44444444-4444-4444-4444-444444444444', 'Đã xong API chấm điểm tự động, có viết test cho phần tính điểm.',                                                    'approved', now() - interval '3 days');

update public.project_handovers
set reviewed_at = now() - interval '2 days',
    reviewed_by = '22222222-2222-2222-2222-222222222222',
    review_note = 'Chất lượng tốt, đã nghiệm thu.'
where status = 'approved';

-- ---------- CV mẫu cho đơn ứng tuyển ----------
update public.applications
set cv_url = '/assets/images/defaul-project-background.jpg'
where applicant_id = '55555555-5555-5555-5555-555555555555';

-- ---------- Mốc đã hoàn thành (để tiến độ khác 0) ----------
update public.project_milestones
set completed_at = now() - interval '2 days'
where project_id = 1 and order_index = 1;

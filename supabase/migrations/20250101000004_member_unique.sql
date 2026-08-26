-- Mỗi cặp (dự án, người dùng) chỉ có một dòng thành viên đang hiệu lực.
-- Không có ràng buộc này, approveApplication có thể chèn dòng trùng khi
-- maybeSingle() gặp nhiều dòng và trả lỗi.
create unique index if not exists uniq_active_member
    on public.project_members (project_id, user_id)
    where deleted_at is null;

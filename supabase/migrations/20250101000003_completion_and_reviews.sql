-- Khép kín vòng đời dự án: đánh dấu mốc hoàn thành -> kết thúc dự án -> đánh giá.
--
-- Trước đây:
--   * project_milestones không có cột nào đánh dấu đã xong, nên tiến độ được
--     tính bằng "số mốc * 20%" — dự án vừa tạo với 5 mốc hiện ngay 100%.
--   * projects.status = 'completed' chỉ được đọc (tab "Hoàn thành"), không có
--     chỗ nào ghi, nên tab đó vĩnh viễn rỗng.
--   * bảng reviews chỉ được đọc, không có đường nào tạo đánh giá, trong khi
--     điểm uy tín và mục "Hồ sơ nổi bật" đều dựa vào nó.

alter table public.project_milestones
    add column if not exists completed_at timestamptz;

alter table public.projects
    add column if not exists completed_at timestamptz;

-- Mỗi người chỉ đánh giá một người khác một lần trên mỗi dự án
create unique index if not exists uniq_review_per_project_pair
    on public.reviews (project_id, reviewer_id, reviewee_id)
    where deleted_at is null;

create index if not exists idx_reviews_reviewee on public.reviews(reviewee_id);
create index if not exists idx_milestones_project on public.project_milestones(project_id);

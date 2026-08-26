#!/bin/bash
#
# Test xuyên suốt toàn bộ API của SkillBank.
#
# Cần chạy trước:
#   npm run db:start && npm run db:reset   # Supabase local + dữ liệu mock
#   npm run dev                            # Astro tại :4321
#
# Rồi:
#   bash scripts/e2e-api.sh
#
# Kịch bản tạo tài khoản mới theo timestamp nên chạy lại nhiều lần được mà
# không cần reset lại cơ sở dữ liệu. Trả về mã thoát khác 0 nếu có bước hỏng.
#
BASE="${BASE_URL:-http://localhost:4321}"
S="$(mktemp -d)"
trap 'rm -rf "$S"' EXIT
PG="PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -tAc"
PASS=0; FAIL=0; STEP=0
# Hậu tố theo thời gian để chạy lại nhiều lần mà không cần reset DB
TS=$(date +%s)
NEWUSER="e2e$TS"
NEWMAIL="e2e$TS@skillbank.vn"

db() { PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -tAc "$1" 2>/dev/null | tr -d ' \n'; }

# check <mô tả> <giá trị thực> <giá trị mong đợi>
check() {
    STEP=$((STEP+1))
    if [ "$2" = "$3" ]; then
        printf "  \033[32m✓\033[0m %-58s %s\n" "$1" "$2"; PASS=$((PASS+1))
    else
        printf "  \033[31m✗\033[0m %-58s got=%s want=%s\n" "$1" "$2" "$3"; FAIL=$((FAIL+1))
    fi
}
# checkc: so khớp chuỗi con
checkc() {
    STEP=$((STEP+1))
    if echo "$2" | grep -q "$3"; then
        printf "  \033[32m✓\033[0m %-58s %s\n" "$1" "$(echo "$2" | head -c 45)"; PASS=$((PASS+1))
    else
        printf "  \033[31m✗\033[0m %-58s got=%s\n" "$1" "$(echo "$2" | head -c 70)"; FAIL=$((FAIL+1))
    fi
}
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$@"; }
body() { curl -s --max-time 25 "$@"; }
jq_() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }

echo ""
echo "════ 1. XÁC THỰC ════"
rm -f $S/c_*.txt

r=$(body -c $S/c_new.txt -X POST -F "email=$NEWMAIL" -F "username=$NEWUSER" -F "password=MatKhau12345" -F "fullName=Người Kiểm Thử" $BASE/api/auth/sign-up)
checkc "POST /auth/sign-up          tạo tài khoản" "$r" '"success":true'
check  "  → user_info được tạo" "$(db "select count(*) from user_info where username='$NEWUSER'")" "1"
check  "  → cookie httpOnly" "$(grep -c '#HttpOnly_' $S/c_new.txt)" "2"

r=$(body -X POST -F "email=x$TS@skillbank.vn" -F "username=abc$TS" -F "password=MatKhau12345" -F "fullName=X" $BASE/api/auth/sign-up)
checkc "POST /auth/sign-up          chặn tên quá ngắn" "$r" 'ít nhất 3 ký tự'
r=$(body -X POST -F "email=x@skillbank.vn" -F "username=$NEWUSER" -F "password=MatKhau12345" -F "fullName=Tên Hợp Lệ" $BASE/api/auth/sign-up)
checkc "POST /auth/sign-up          chặn username trùng" "$r" 'đã tồn tại'
r=$(body -X POST -F "email=saidinhdang" -F "username=abcd$TS" -F "password=MatKhau12345" -F "fullName=Tên Hợp Lệ" $BASE/api/auth/sign-up)
checkc "POST /auth/sign-up          chặn email sai định dạng" "$r" 'Email không hợp lệ'

r=$(body -X POST -F "username=$NEWUSER" -F "password=SaiMatKhau1" $BASE/api/auth/sign-in)
checkc "POST /auth/sign-in          sai mật khẩu" "$r" '"success":false'

r=$(body -c $S/c_new.txt -X POST -F "username=$NEWUSER" -F "password=MatKhau12345" $BASE/api/auth/sign-in)
checkc "POST /auth/sign-in          đúng mật khẩu" "$r" '"success":true'

for u in viethoang:own thimai:mem minhduc:app admin:adm ngoclan:out; do
  n=${u%:*}; f=${u#*:}
  curl -s -o /dev/null -c $S/c_$f.txt -X POST -F "username=$n" -F "password=Password123" $BASE/api/auth/sign-in
done
check  "  → 5 tài khoản seed đăng nhập được" "$(ls $S/c_own.txt $S/c_mem.txt $S/c_app.txt $S/c_adm.txt $S/c_out.txt 2>/dev/null | wc -l | tr -d ' ')" "5"

echo ""
echo "════ 2. API CÔNG KHAI ════"
check "GET  /skills" "$(code $BASE/api/skills)" "200"
check "GET  /explore/projects" "$(code "$BASE/api/explore/projects?limit=5")" "200"
check "GET  /explore/projects     limit không hợp lệ" "$(code "$BASE/api/explore/projects?limit=abc")" "200"
check "GET  /featured/projects" "$(code $BASE/api/featured/projects)" "200"
check "GET  /featured/profiles" "$(code $BASE/api/featured/profiles)" "200"
check "GET  /projects/search" "$(code "$BASE/api/projects/search?q=luyen")" "200"
r=$(body "$BASE/api/projects/search?q=a,status.eq.pending")
checkc "GET  /projects/search      chặn chèn bộ lọc" "$r" '"success":true'

echo ""
echo "════ 3. API CẦN ĐĂNG NHẬP - chưa đăng nhập phải 401 ════"
for e in /api/dashboard /api/my-projects /api/notifications /api/messages /api/admin/users /api/admin/projects/pending; do
  check "GET  $e" "$(code $BASE$e)" "401"
done

echo ""
echo "════ 4. TẠO & DUYỆT DỰ ÁN ════"
r=$(body -b $S/c_own.txt -X POST -F "project_name=Dự án E2E" -F "category=DevOps" -F "start_date=2026-12-01" -F "location=Thành phố Hà Nội" -F "description=Mô tả E2E" -F "skill-1=astro" -F "skill-1-description=Dựng site" -F "milestone-1=Mốc E2E 1" -F "milestone-2=Mốc E2E 2" $BASE/api/projects/create)
PID=$(echo "$r" | jq_ "d['data']['project_id']")
checkc "POST /projects/create" "$r" '"success":true'
check  "  → trạng thái ban đầu" "$(db "select status from projects where id=$PID")" "pending"
check  "  → kỹ năng + mốc được lưu" "$(db "select (select count(*) from project_skills where project_id=$PID)+(select count(*) from project_milestones where project_id=$PID)")" "3"
check  "  → chủ dự án thành thành viên" "$(db "select role from project_members where project_id=$PID")" "owner"

check  "GET  /admin/projects/pending  người thường" "$(code -b $S/c_mem.txt $BASE/api/admin/projects/pending)" "403"
check  "GET  /admin/projects/pending  admin" "$(code -b $S/c_adm.txt $BASE/api/admin/projects/pending)" "200"
r=$(body -b $S/c_mem.txt -X PUT $BASE/api/admin/projects/$PID/approve)
checkc "PUT  /admin/projects/:id/approve  người thường" "$r" '"success":false'
r=$(body -b $S/c_adm.txt -X PUT $BASE/api/admin/projects/$PID/approve)
checkc "PUT  /admin/projects/:id/approve  admin" "$r" '"success":true'
check  "  → đã ghi vào DB" "$(db "select status from projects where id=$PID")" "approved"

echo ""
echo "════ 5. ỨNG TUYỂN ════"
r=$(body -b $S/c_app.txt -X POST -F "project_id=$PID" -F "cover_letter=Em muốn tham gia dự án E2E" $BASE/api/applications/submit)
AID=$(echo "$r" | jq_ "d['data']['application_id']")
checkc "POST /applications/submit" "$r" '"success":true'
r=$(body -b $S/c_app.txt -X POST -F "project_id=$PID" -F "cover_letter=lần 2" $BASE/api/applications/submit)
checkc "POST /applications/submit  chặn nộp trùng" "$r" 'đã ứng tuyển'
check  "  → chủ dự án nhận thông báo" "$(db "select count(*) from notifications where type='application_received' and message like '%$PID%'")" "1"

r=$(body -b $S/c_out.txt -X PUT $BASE/api/projects/$PID/applications/$AID/approve)
checkc "PUT  /applications/:id/approve  không phải chủ" "$r" '"success":false'
r=$(body -b $S/c_own.txt -X PUT $BASE/api/projects/$PID/applications/$AID/approve)
checkc "PUT  /applications/:id/approve  chủ dự án" "$r" '"success":true'
check  "  → đơn chuyển approved" "$(db "select status from applications where id=$AID")" "approved"
check  "  → ứng viên thành thành viên" "$(db "select count(*) from project_members where project_id=$PID and role='collaborator'")" "1"

echo ""
echo "════ 6. HỢP ĐỒNG ════"
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d "{\"member_id\":\"44444444-4444-4444-4444-444444444444\",\"terms\":\"Điều khoản E2E\",\"start_date\":\"2026-12-01\",\"end_date\":\"2027-03-01\"}" $BASE/api/projects/$PID/contracts)
checkc "POST /projects/:id/contracts" "$r" '"success":true'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d "{\"member_id\":\"44444444-4444-4444-4444-444444444444\",\"terms\":\"x\",\"start_date\":\"2027-01-01\",\"end_date\":\"2026-01-01\"}" $BASE/api/projects/$PID/contracts)
checkc "POST /projects/:id/contracts  ngày sai thứ tự" "$r" 'sau ngày bắt đầu'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d "{\"member_id\":\"22222222-2222-2222-2222-222222222222\",\"terms\":\"x\"}" $BASE/api/projects/$PID/contracts)
checkc "POST /projects/:id/contracts  không phải chủ" "$r" 'Chỉ chủ dự án'

echo ""
echo "════ 7. BÀN GIAO ════"
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"notes":"Đã xong phần backend E2E"}' $BASE/api/projects/$PID/handover)
HID=$(echo "$r" | jq_ "d['data']['handover_id']")
checkc "POST /projects/:id/handover" "$r" '"success":true'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"notes":"   "}' $BASE/api/projects/$PID/handover)
checkc "POST /projects/:id/handover  ghi chú rỗng" "$r" 'nhập ghi chú'
r=$(body -b $S/c_out.txt -X POST -H 'Content-Type: application/json' -d '{"notes":"x"}' $BASE/api/projects/$PID/handover)
checkc "POST /projects/:id/handover  không phải thành viên" "$r" 'không phải thành viên'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d '{"notes":"x"}' $BASE/api/projects/$PID/handover)
checkc "POST /projects/:id/handover  chủ dự án tự bàn giao" "$r" 'không cần gửi'

r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d "{\"handover_id\":$HID,\"action\":\"approve\"}" $BASE/api/projects/$PID/handover/review)
checkc "POST /handover/review     thành viên tự duyệt" "$r" 'Chỉ chủ dự án'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d "{\"handover_id\":$HID,\"action\":\"xoa\"}" $BASE/api/projects/$PID/handover/review)
checkc "POST /handover/review     hành động sai" "$r" 'không hợp lệ'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d "{\"handover_id\":$HID,\"action\":\"approve\",\"review_note\":\"Đạt\"}" $BASE/api/projects/$PID/handover/review)
checkc "POST /handover/review     chủ dự án nghiệm thu" "$r" '"success":true'
check  "  → deliveries tự sinh vào hợp đồng" "$(db "select count(*) from deliveries d join contracts c on c.id=d.contract_id where c.project_id=$PID")" "1"
check  "  → thành viên nhận thông báo" "$(db "select count(*) from notifications where type='handover_approved' and message like '%\"projectId\":$PID%'")" "1"

echo ""
echo "════ 8. MỐC TIẾN ĐỘ & KẾT THÚC ════"
M1=$(db "select id from project_milestones where project_id=$PID order by order_index limit 1")
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d "{\"milestone_id\":$M1}" $BASE/api/projects/$PID/milestones/toggle)
checkc "POST /milestones/toggle    không phải chủ" "$r" 'Chỉ chủ dự án'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d "{\"milestone_id\":$M1}" $BASE/api/projects/$PID/milestones/toggle)
checkc "POST /milestones/toggle    chủ dự án tick" "$r" 'hoàn thành'
check  "  → tiến độ 1/2 = 50%" "$(body -b $S/c_own.txt $BASE/api/my-projects | python3 -c "
import sys,json;d=json.load(sys.stdin)['data']
print([p['progress'] for p in d['approved'] if p['title']=='Dự án E2E'][0])" 2>/dev/null)" "50"

r=$(body -b $S/c_own.txt -X PUT -F "project_name=Dự án E2E sửa" -F "category=UI/UX" -F "start_date=2026-12-15" -F "location=Thành phố Huế" -F "description=Sửa" -F "skill-1=figma" -F "milestone-1=Mốc sửa" $BASE/api/projects/$PID/update)
checkc "PUT  /projects/:id/update" "$r" '"success":true'
check  "  → tiêu đề đổi" "$(db "select title from projects where id=$PID")" "DựánE2Esửa"

r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"reviewee_id":"22222222-2222-2222-2222-222222222222","rating":5}' $BASE/api/projects/$PID/reviews)
checkc "POST /projects/:id/reviews  chưa kết thúc" "$r" 'sau khi dự án kết thúc'
r=$(body -b $S/c_app.txt -X POST $BASE/api/projects/$PID/complete)
checkc "POST /projects/:id/complete  không phải chủ" "$r" 'Chỉ chủ dự án'
r=$(body -b $S/c_own.txt -X POST $BASE/api/projects/$PID/complete)
checkc "POST /projects/:id/complete  chủ dự án" "$r" '"success":true'
check  "  → status + completed_at" "$(db "select status from projects where id=$PID")" "completed"
r=$(body -b $S/c_own.txt -X POST $BASE/api/projects/$PID/complete)
checkc "POST /projects/:id/complete  lần hai" "$r" 'đã kết thúc'

echo ""
echo "════ 9. ĐÁNH GIÁ ════"
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"reviewee_id":"22222222-2222-2222-2222-222222222222","rating":5,"comment":"Hợp tác tốt"}' $BASE/api/projects/$PID/reviews)
checkc "POST /projects/:id/reviews  gửi đánh giá" "$r" '"success":true'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"reviewee_id":"22222222-2222-2222-2222-222222222222","rating":9}' $BASE/api/projects/$PID/reviews)
checkc "POST /projects/:id/reviews  điểm ngoài 1-5" "$r" 'từ 1 đến 5'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"reviewee_id":"44444444-4444-4444-4444-444444444444","rating":5}' $BASE/api/projects/$PID/reviews)
checkc "POST /projects/:id/reviews  tự đánh giá mình" "$r" 'tự đánh giá'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"reviewee_id":"55555555-5555-5555-5555-555555555555","rating":5}' $BASE/api/projects/$PID/reviews)
checkc "POST /projects/:id/reviews  người ngoài dự án" "$r" 'không thuộc dự án'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"reviewee_id":"22222222-2222-2222-2222-222222222222","rating":3,"comment":"Sửa lại"}' $BASE/api/projects/$PID/reviews)
check  "  → gửi lại là cập nhật, không nhân bản" "$(db "select count(*) from reviews where project_id=$PID")" "1"

echo ""
echo "════ 10. KHIẾU NẠI ════"
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"description":"Phạm vi công việc không rõ ràng"}' $BASE/api/projects/$PID/disputes)
DID=$(echo "$r" | jq_ "d['data']['dispute_id']")
checkc "POST /projects/:id/disputes" "$r" '"success":true'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"description":"lần 2"}' $BASE/api/projects/$PID/disputes)
checkc "POST /projects/:id/disputes  báo cáo trùng" "$r" 'đang chờ xử lý'
r=$(body -b $S/c_out.txt -X POST -H 'Content-Type: application/json' -d '{"description":"x"}' $BASE/api/projects/$PID/disputes)
checkc "POST /projects/:id/disputes  người ngoài" "$r" 'Chỉ thành viên'
r=$(body -b $S/c_mem.txt -X PUT -H 'Content-Type: application/json' -d '{"action":"resolve"}' $BASE/api/admin/disputes/$DID)
checkc "PUT  /admin/disputes/:id   người thường" "$r" 'không có quyền'
r=$(body -b $S/c_adm.txt -X PUT -H 'Content-Type: application/json' -d '{"action":"resolve"}' $BASE/api/admin/disputes/$DID)
checkc "PUT  /admin/disputes/:id   admin xử lý" "$r" '"success":true'
check  "  → ghi resolved_by" "$(db "select status from disputes where id=$DID")" "resolved"

echo ""
echo "════ 11. NHẮN TIN ════"
MSG_BEFORE=$(body -b $S/c_app.txt $BASE/api/messages/22222222-2222-2222-2222-222222222222 | jq_ "len(d['data']['messages'])")
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d '{"receiver_id":"44444444-4444-4444-4444-444444444444","content":"Chào Đức, cảm ơn đã tham gia"}' $BASE/api/messages)
checkc "POST /messages            gửi tin" "$r" '"success":true'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d '{"receiver_id":"22222222-2222-2222-2222-222222222222","content":"x"}' $BASE/api/messages)
checkc "POST /messages            tự nhắn mình" "$r" 'tự nhắn'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d '{"receiver_id":"44444444-4444-4444-4444-444444444444","content":"  "}' $BASE/api/messages)
checkc "POST /messages            nội dung rỗng" "$r" 'trống'
CONV=$(body -b $S/c_own.txt $BASE/api/messages | jq_ "len(d['data']['conversations'])")
check  "GET  /messages            có hội thoại" "$([ "${CONV:-0}" -ge 1 ] && echo yes || echo no)" "yes"
MSG_AFTER=$(body -b $S/c_app.txt $BASE/api/messages/22222222-2222-2222-2222-222222222222 | jq_ "len(d['data']['messages'])")
check  "GET  /messages/:partnerId  nội dung tăng đúng 1" "$((MSG_AFTER - MSG_BEFORE))" "1"
check  "  → chưa đọc = 1" "$(body -b $S/c_app.txt $BASE/api/messages | jq_ "d['data']['unread']")" "1"
curl -s -o /dev/null -b $S/c_app.txt -X POST $BASE/api/messages/22222222-2222-2222-2222-222222222222
check  "POST /messages/:partnerId  đánh dấu đã đọc" "$(body -b $S/c_app.txt $BASE/api/messages | jq_ "d['data']['unread']")" "0"

echo ""
echo "════ 12. THÔNG BÁO ════"
check "GET  /notifications" "$(code -b $S/c_own.txt $BASE/api/notifications)" "200"
NID=$(db "select id from notifications where user_id='22222222-2222-2222-2222-222222222222' and is_read=false limit 1")
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d "{\"notification_id\":$NID}" $BASE/api/notifications/read)
checkc "POST /notifications/read" "$r" '"success":true'
check  "  → thực sự ghi vào DB" "$(db "select is_read from notifications where id=$NID")" "t"
r=$(body -b $S/c_mem.txt -X POST -H 'Content-Type: application/json' -d "{\"notification_id\":$NID}" $BASE/api/notifications/read)
checkc "POST /notifications/read   của người khác" "$r" 'Không tìm thấy'

echo ""
echo "════ 13. HỒ SƠ & DỰ ÁN ════"
check "GET  /dashboard" "$(code -b $S/c_own.txt $BASE/api/dashboard)" "200"
check "GET  /my-projects" "$(code -b $S/c_own.txt $BASE/api/my-projects)" "200"
r=$(body -b $S/c_own.txt -X POST -F "full_name=Nguyễn Việt Hoàng" -F "bio=Tiểu sử E2E" -F "phone=0900000001" $BASE/api/profile/update)
checkc "POST /profile/update" "$r" '"success":true'
check  "  → ghi vào DB" "$(db "select bio from user_profiles where user_id='22222222-2222-2222-2222-222222222222'")" "TiểusửE2E"

r=$(body -b $S/c_own.txt -X PUT -F "project_name=X" -F "category=UI/UX" -F "start_date=2026-12-15" $BASE/api/projects/$PID/update)
checkc "PUT  /projects/:id/update  dự án đã kết thúc" "$r" 'đã kết thúc'

r=$(body -b $S/c_adm.txt -X PUT -H 'Content-Type: application/json' -d '{"userId":"55555555-5555-5555-5555-555555555555","updates":{"role":"user"}}' $BASE/api/admin/users)
checkc "PUT  /admin/users" "$r" '"success":true'
check "GET  /admin/users          admin" "$(code -b $S/c_adm.txt $BASE/api/admin/users)" "200"
check "GET  /admin/users          người thường" "$(code -b $S/c_mem.txt $BASE/api/admin/users)" "403"

echo ""
echo "════ 14. ĐỔI/QUÊN MẬT KHẨU ════"
r=$(body -b $S/c_new.txt -X POST -F "currentPassword=SaiRoi123" -F "password=MatKhauMoi999" -F "confirmPassword=MatKhauMoi999" $BASE/api/auth/change-password)
checkc "POST /auth/change-password  sai mật khẩu cũ" "$r" 'không đúng'
r=$(body -b $S/c_new.txt -X POST -F "currentPassword=MatKhau12345" -F "password=abc" -F "confirmPassword=abc" $BASE/api/auth/change-password)
checkc "POST /auth/change-password  mật khẩu quá ngắn" "$r" 'ít nhất 8'
r=$(body -b $S/c_new.txt -X POST -F "currentPassword=MatKhau12345" -F "password=MatKhauMoi999" -F "confirmPassword=MatKhauMoi999" $BASE/api/auth/change-password)
checkc "POST /auth/change-password  đổi thành công" "$r" '"success":true'
r=$(body -X POST -F "username=$NEWUSER" -F "password=MatKhauMoi999" $BASE/api/auth/sign-in)
checkc "  → đăng nhập bằng mật khẩu mới" "$r" '"success":true'

r=$(body -X POST -F "email=$NEWMAIL" $BASE/api/auth/forgot-password)
checkc "POST /auth/forgot-password" "$r" '"success":true'
sleep 2
MID=$(curl -s "http://127.0.0.1:54324/api/v1/messages?limit=1" | jq_ "d['messages'][0]['ID']")
OTP=$(curl -s "http://127.0.0.1:54324/api/v1/message/$MID" | python3 -c "
import sys,json,re
d=json.load(sys.stdin); b=(d.get('Text') or '')+(d.get('HTML') or '')
m=re.findall(r'\b[0-9]{6}\b', b); print(m[0] if m else '')" 2>/dev/null)
check  "  → OTP có trong email" "$([ -n "$OTP" ] && echo yes || echo no)" "yes"
r=$(body -c $S/c_otp.txt -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$NEWMAIL\",\"token\":\"$OTP\"}" $BASE/api/auth/verify-otp)
checkc "POST /auth/verify-otp" "$r" '"success":true'
r=$(body -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$NEWMAIL\",\"token\":\"000000\"}" $BASE/api/auth/verify-otp)
checkc "POST /auth/verify-otp      mã sai" "$r" '"success":false'
r=$(body -b $S/c_otp.txt -X POST -H 'Content-Type: application/json' -d '{"password":"MatKhauCuoi88","confirmPassword":"KhacNhau88"}' $BASE/api/auth/set-password)
checkc "POST /auth/set-password    xác nhận lệch" "$r" 'không khớp'
r=$(body -b $S/c_otp.txt -X POST -H 'Content-Type: application/json' -d '{"password":"MatKhauCuoi88","confirmPassword":"MatKhauCuoi88"}' $BASE/api/auth/set-password)
checkc "POST /auth/set-password" "$r" '"success":true'

echo ""
echo "════ 15. OAUTH & ĐĂNG XUẤT ════"
check "GET  /auth/google          chuyển hướng" "$(code $BASE/api/auth/google)" "302"
check "GET  /auth/facebook        chuyển hướng" "$(code $BASE/api/auth/facebook)" "302"
check "GET  /auth/callback        thiếu code" "$(code $BASE/api/auth/callback)" "302"
r=$(body -X POST -H 'Content-Type: application/json' -d '{}' $BASE/api/auth/oauth-callback)
checkc "POST /auth/oauth-callback  thiếu token" "$r" '"success":false'

check "  → còn phiên trước khi đăng xuất" "$(code -b $S/c_own.txt $BASE/api/dashboard)" "200"
curl -s -o /dev/null -b $S/c_own.txt -X POST $BASE/api/auth/sign-out
check "POST /auth/sign-out        thu hồi phiên" "$(code -b $S/c_own.txt $BASE/api/dashboard)" "401"

echo ""
echo "════ 16. LUỒNG VÒNG ĐỜI BỔ SUNG ════"
# Mục 15 đã đăng xuất c_own, đăng nhập lại trước khi dùng tiếp
curl -s -o /dev/null -c $S/c_own.txt -X POST -F "username=viethoang" -F "password=Password123" $BASE/api/auth/sign-in

# --- dự án bị từ chối: sửa rồi nộp lại ---
r=$(body -b $S/c_own.txt -X POST -F "project_name=Dự án bị từ chối" -F "category=DevOps" -F "start_date=2026-12-01" -F "description=x" $BASE/api/projects/create)
RPID=$(echo "$r" | jq_ "d['data']['project_id']")
body -b $S/c_adm.txt -X PUT $BASE/api/admin/projects/$RPID/reject > /dev/null
check  "Từ chối dự án: đổi status, KHÔNG xoá mềm" "$(db "select status from projects where id=$RPID")" "rejected"
check  "  → không bị xoá mềm" "$(db "select deleted_at is null from projects where id=$RPID")" "t"
check  "  → hiện ở nhóm rejected" "$(body -b $S/c_own.txt $BASE/api/my-projects | jq_ "len([p for p in d['data']['rejected'] if p['id']==$RPID])")" "1"
r=$(body -b $S/c_own.txt -X PUT -F "project_name=Đã sửa theo góp ý" -F "category=DevOps" -F "start_date=2026-12-01" -F "description=y" $BASE/api/projects/$RPID/update)
checkc "  → sửa lại thì tự nộp lại" "$r" 'gửi lại'
check  "  → về hàng chờ duyệt" "$(db "select status from projects where id=$RPID")" "pending"

# --- bị từ chối ứng tuyển vẫn nộp lại được ---
body -b $S/c_adm.txt -X PUT $BASE/api/admin/projects/$RPID/approve > /dev/null
r=$(body -b $S/c_out.txt -X POST -F "project_id=$RPID" -F "cover_letter=lần 1" $BASE/api/applications/submit)
RAID=$(echo "$r" | jq_ "d['data']['application_id']")
body -b $S/c_own.txt -X PUT $BASE/api/projects/$RPID/applications/$RAID/reject > /dev/null
check  "Đơn bị từ chối" "$(db "select status from applications where id=$RAID")" "rejected"
r=$(body -b $S/c_out.txt -X POST -F "project_id=$RPID" -F "cover_letter=lần 2" $BASE/api/applications/submit)
checkc "  → vẫn ứng tuyển lại được" "$r" '"success":true'

# --- rút đơn ---
RAID2=$(db "select id from applications where project_id=$RPID and status='pending' order by id desc limit 1")
r=$(body -b $S/c_own.txt -X POST $BASE/api/applications/$RAID2/withdraw)
checkc "POST /applications/:id/withdraw  không phải chủ đơn" "$r" 'không phải đơn của bạn'
r=$(body -b $S/c_out.txt -X POST $BASE/api/applications/$RAID2/withdraw)
checkc "POST /applications/:id/withdraw  chính chủ" "$r" '"success":true'
check  "  → đã xoá mềm" "$(db "select deleted_at is not null from applications where id=$RAID2")" "t"

# --- rời dự án / gỡ thành viên ---
body -b $S/c_app.txt -X POST -F "project_id=$RPID" -F "cover_letter=xin vào" $BASE/api/applications/submit > /dev/null
NAID=$(db "select id from applications where project_id=$RPID and status='pending' order by id desc limit 1")
body -b $S/c_own.txt -X PUT $BASE/api/projects/$RPID/applications/$NAID/approve > /dev/null
check  "Thành viên đang hoạt động" "$(db "select count(*) from project_members where project_id=$RPID and left_at is null")" "2"
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d '{}' $BASE/api/projects/$RPID/members)
checkc "POST /projects/:id/members  chủ dự án tự rời" "$r" 'không thể rời'
r=$(body -b $S/c_out.txt -X POST -H 'Content-Type: application/json' -d '{"member_id":"44444444-4444-4444-4444-444444444444"}' $BASE/api/projects/$RPID/members)
checkc "POST /projects/:id/members  người ngoài gỡ" "$r" 'Chỉ chủ dự án'
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{}' $BASE/api/projects/$RPID/members)
checkc "POST /projects/:id/members  tự rời dự án" "$r" 'Đã rời dự án'
check  "  → left_at được ghi" "$(db "select left_at is not null from project_members where project_id=$RPID and user_id='44444444-4444-4444-4444-444444444444'")" "t"

# --- hợp đồng đóng theo dự án, chặn bàn giao sau khi kết thúc ---
body -b $S/c_app.txt -X POST -F "project_id=$RPID" -F "cover_letter=vào lại" $BASE/api/applications/submit > /dev/null
BAID=$(db "select id from applications where project_id=$RPID and status='pending' order by id desc limit 1")
body -b $S/c_own.txt -X PUT $BASE/api/projects/$RPID/applications/$BAID/approve > /dev/null
body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d '{"member_id":"44444444-4444-4444-4444-444444444444","terms":"HĐ"}' $BASE/api/projects/$RPID/contracts > /dev/null
check  "Hợp đồng đang hiệu lực" "$(db "select status from contracts where project_id=$RPID")" "active"
body -b $S/c_own.txt -X POST $BASE/api/projects/$RPID/complete > /dev/null
check  "  → dự án kết thúc thì hợp đồng đóng theo" "$(db "select status from contracts where project_id=$RPID")" "ended"
r=$(body -b $S/c_app.txt -X POST -H 'Content-Type: application/json' -d '{"notes":"sau khi kết thúc"}' $BASE/api/projects/$RPID/handover)
checkc "POST /projects/:id/handover  dự án đã kết thúc" "$r" 'không nhận bàn giao'
r=$(body -b $S/c_own.txt -X POST -H 'Content-Type: application/json' -d '{"member_id":"44444444-4444-4444-4444-444444444444"}' $BASE/api/projects/$RPID/members)
checkc "POST /projects/:id/members  dự án đã kết thúc" "$r" 'đã kết thúc'

# --- đánh dấu tất cả thông báo đã đọc ---
UNREAD=$(db "select count(*) from notifications where user_id='22222222-2222-2222-2222-222222222222' and is_read=false")
check  "Có thông báo chưa đọc" "$([ "${UNREAD:-0}" -ge 1 ] && echo yes || echo no)" "yes"
r=$(body -b $S/c_own.txt -X POST $BASE/api/notifications/read-all)
checkc "POST /notifications/read-all" "$r" '"success":true'
check  "  → không còn tin chưa đọc" "$(db "select count(*) from notifications where user_id='22222222-2222-2222-2222-222222222222' and is_read=false")" "0"

echo ""
echo "════ 17. XOÁ DỰ ÁN ════"
r=$(body -b $S/c_out.txt -X DELETE $BASE/api/projects/$PID/delete)
checkc "DELETE /projects/:id/delete  không phải chủ" "$r" 'không có quyền'
r=$(body -b $S/c_own.txt -X DELETE $BASE/api/projects/$PID/delete)
checkc "DELETE /projects/:id/delete  chủ dự án" "$r" '"success":true'
check  "  → xoá mềm" "$(db "select deleted_at is not null from projects where id=$PID")" "t"
check  "  → biến khỏi trang khám phá" "$(body "$BASE/api/explore/projects?limit=50" | python3 -c "
import sys,json;d=json.load(sys.stdin)['data']
print(len([p for p in d if p['id']==$PID]))" 2>/dev/null)" "0"

echo ""
echo "════════════════════════════════════════════════════════"
printf "  TỔNG: %d bước · \033[32m%d đạt\033[0m · \033[31m%d hỏng\033[0m\n" "$STEP" "$PASS" "$FAIL"
echo "════════════════════════════════════════════════════════"
[ $FAIL -eq 0 ] && exit 0 || exit 1

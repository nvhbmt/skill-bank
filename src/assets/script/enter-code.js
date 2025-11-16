document.addEventListener('DOMContentLoaded', () => {
    // Tìm tất cả các ô input có class 'otp-input'
    const inputs = document.querySelectorAll('.otp-input');

    // Nếu không tìm thấy ô nào, dừng script
    if (inputs.length === 0) return;

    inputs.forEach((input, index) => {
        // 1. Tự động nhảy tới ô tiếp theo khi nhập
        input.addEventListener('input', (e) => {
            const target = e.target;
            const value = target.value;

            // Nếu đã nhập đủ 1 ký tự và không phải là ô cuối cùng
            if (
                value.length === target.maxLength &&
                index < inputs.length - 1
            ) {
                inputs[index + 1].focus();
            }
        });

        // 2. Tự động lùi về ô trước khi xóa
        input.addEventListener('keydown', (e) => {
            const target = e.target;

            // Nếu bấm Backspace và ô hiện tại đang rỗng
            if (e.key === 'Backspace' && target.value === '' && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // 3. Xử lý khi dán (paste) code
    inputs[0].addEventListener('paste', (e) => {
        e.preventDefault(); // Ngăn hành động dán mặc định

        const pasteData = (e.clipboardData || window.clipboardData).getData(
            'text'
        );

        // Lấy số ký tự bằng số ô input
        const code = pasteData.slice(0, inputs.length);

        // Điền vào các ô input
        code.split('').forEach((char, index) => {
            if (inputs[index]) {
                inputs[index].value = char;
            }
        });

        // Focus vào ô cuối cùng đã điền
        const lastFilledIndex = Math.min(code.length, inputs.length) - 1;
        if (lastFilledIndex >= 0) {
            inputs[lastFilledIndex].focus();
        }
    });
});

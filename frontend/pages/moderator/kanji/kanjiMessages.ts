import axios from "axios";

const translations: Record<string, string> = {
  "Kanji already exists in this lesson": "Chữ Hán này đã có trong bài học.",
  "Archived Kanji cannot be edited": "Không thể chỉnh sửa chữ Hán đã lưu trữ.",
  "Lesson is archived": "Bài học đã được lưu trữ.",
  "Lesson is not a Kanji lesson": "Bài học này không thuộc phần chữ Hán.",
  "Choose replacement or removal of the image": "Vui lòng chọn thay ảnh hoặc xóa ảnh hiện tại.",
  "Character text must contain 1 to 5 Japanese Kanji characters": "Vui lòng nhập từ 1 đến 5 chữ Hán hợp lệ.",
  "Image must be PNG, JPEG or GIF, up to 5 MB": "Ảnh phải có định dạng PNG, JPEG hoặc GIF và không quá 5 MB.",
  "Invalid image": "Ảnh không hợp lệ. Vui lòng chọn ảnh khác.",
  "Image upload failed": "Không thể tải ảnh lên. Vui lòng thử lại.",
};

export function kanjiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Thao tác thất bại. Vui lòng thử lại.";
  const text = error.response?.data?.message;
  if (typeof text === "string" && translations[text]) return translations[text];
  switch (error.response?.status) {
    case 400: return "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.";
    case 401: return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403: return "Bạn không có quyền thực hiện thao tác này.";
    case 404: return "Không tìm thấy bài học hoặc chữ Hán đã chọn.";
    case 409: return "Dữ liệu bị trùng hoặc đã thay đổi. Vui lòng tải lại và kiểm tra.";
    case 413: return "Ảnh quá lớn. Vui lòng chọn ảnh không quá 5 MB.";
    case 415: return "Định dạng dữ liệu không được hỗ trợ.";
    default: return error.response ? "Không thể xử lý yêu cầu. Vui lòng thử lại." : "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối.";
  }
}

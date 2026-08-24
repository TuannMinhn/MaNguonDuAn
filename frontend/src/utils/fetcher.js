export const fetcher = (...args) => fetch(...args).then((res) => {
  if (!res.ok) {
    throw new Error('Đã xảy ra lỗi khi tải dữ liệu');
  }
  return res.json();
});
